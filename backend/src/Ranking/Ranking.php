<?php

declare(strict_types=1);

namespace App\Ranking;

/**
 * Comparison pricing, not a statutory RRSO certificate.
 * The form allows 30 or 60 days. Omitted period is 30 days for every offer.
 * Interest = amount × nominal annual × days / 365, half-up to the grosz.
 * Pożyczka ratalna shows an equal rata; chwilówka does not.
 * An offer is priced only when that term sits in its own period range
 * (days as stored, or 30 days → 1 month and 60 days → 2 months).
 * Sort key: RRSO rounded half-up to 0.01, then total cost, then id.
 * affiliateUrl is not a sort input.
 */
final class Ranking
{
    public const CRITERION = [
        'id' => 'lowest_rrso_then_total_cost',
        'label' => 'Najniższe RRSO; przy równym RRSO najniższy koszt całkowity',
    ];

    private const MAX_AMOUNT_PLN = 1_000_000;
    private const DEFAULT_PERIOD_DAYS = 30;

    /**
     * @param array<string, mixed> $query
     * @param list<OfferInput>     $offers
     *
     * @return array<string, mixed>
     */
    public static function build(array $query, array $offers): array
    {
        $parsed = self::parseQuery($query);
        if ($parsed['ok'] !== true) {
            return $parsed;
        }

        $amountPln = $parsed['query']['amountPln'];
        $period = $parsed['query']['period'];
        $priced = [];
        foreach ($offers as $offer) {
            if (!$offer->active) {
                continue;
            }
            if ($amountPln < $offer->minAmountPln || $amountPln > $offer->maxAmountPln) {
                continue;
            }
            if (!self::supportsPeriod($offer, $period)) {
                continue;
            }
            $row = self::priceOffer($offer, $amountPln, $period);
            if ($row !== null) {
                $priced[] = $row;
            }
        }

        usort($priced, self::comparePriced(...));

        return [
            'ok' => true,
            'criterion' => self::CRITERION,
            'offersUpdatedAt' => self::latestUpdatedAt($offers),
            'query' => [
                'amountPln' => self::formatMinor($amountPln * 100),
                'period' => $period,
                'periodUnit' => 'days',
            ],
            'offers' => array_map(static fn (array $row): array => $row['card'], $priced),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function error(RankingErrorCode $code): array
    {
        return [
            'ok' => false,
            'error' => [
                'code' => $code->value,
                'field' => $code->field(),
                'message' => $code->message(),
            ],
        ];
    }

    /**
     * @param array<string, mixed> $result
     */
    public static function httpStatus(array $result): int
    {
        if (($result['ok'] ?? false) === true) {
            return 200;
        }

        $code = $result['error']['code'] ?? null;
        if (!\is_string($code)) {
            throw new \LogicException('Ranking failure is missing an error code.');
        }

        return RankingErrorCode::from($code)->httpStatus();
    }

    /**
     * @param array<string, mixed> $query
     *
     * @return array<string, mixed>
     */
    private static function parseQuery(array $query): array
    {
        $amountRaw = self::readParam($query, 'amount');
        if ($amountRaw === null) {
            return self::error(RankingErrorCode::AmountRequired);
        }
        $amount = self::parseStrictPositiveInt($amountRaw);
        if ($amount === null || $amount > self::MAX_AMOUNT_PLN) {
            return self::error(RankingErrorCode::AmountInvalid);
        }

        $unitRaw = self::readParam($query, 'periodUnit');
        if ($unitRaw !== null && $unitRaw !== 'days') {
            return self::error(RankingErrorCode::PeriodUnitInvalid);
        }

        $periodRaw = self::readParam($query, 'period');
        $period = $periodRaw === null ? self::DEFAULT_PERIOD_DAYS : self::parseAllowedPeriod($periodRaw);
        if ($period === null) {
            return self::error(RankingErrorCode::PeriodInvalid);
        }

        return [
            'ok' => true,
            'query' => [
                'amountPln' => $amount,
                'period' => $period,
                'periodUnit' => 'days',
            ],
        ];
    }

    private static function parseAllowedPeriod(string $raw): ?int
    {
        $parsed = self::parseStrictPositiveInt($raw);
        if ($parsed === 30 || $parsed === 60) {
            return $parsed;
        }

        return null;
    }

    private static function supportsPeriod(OfferInput $offer, int $period): bool
    {
        $supported = match ($offer->productType) {
            ProductType::Payday => $period,
            ProductType::Installment => self::monthsForDays($period),
        };

        return $supported >= $offer->minPeriod && $supported <= $offer->maxPeriod;
    }

    private static function monthsForDays(int $periodDays): int
    {
        return match ($periodDays) {
            30 => 1,
            60 => 2,
            default => throw new \LogicException('Period is not 30 or 60 days.'),
        };
    }

    /**
     * @return array{rrsoHundredths: int, totalCostGrosze: int, card: array<string, mixed>}|null
     */
    private static function priceOffer(OfferInput $offer, int $amountPln, int $days): ?array
    {
        $amountGrosze = $amountPln * 100;
        $interest = self::divRound($amountGrosze * $offer->interestRateBps * $days, 10_000 * 365);
        $fee = self::divRound($amountGrosze * $offer->commissionBps, 10_000) + $offer->fixedFeeGrosze;
        $totalCost = $interest + $fee;
        $totalRepay = $amountGrosze + $totalCost;
        $installment = match ($offer->productType) {
            ProductType::Payday => null,
            ProductType::Installment => self::installmentGrosze($totalRepay, $days),
        };

        if ($amountGrosze === 0) {
            return null;
        }
        $ratio = $totalRepay / $amountGrosze;
        $rrso = $totalCost === 0 ? 0.0 : ($ratio ** (365 / $days) - 1);

        return self::toPriced($offer, $amountPln, $days, $totalCost, $totalRepay, $installment, $rrso);
    }

    private static function installmentGrosze(int $totalRepay, int $days): int
    {
        $payments = max(1, (int) round($days / 30));
        $rata = self::divRound($totalRepay, $payments);
        if ($rata * $payments < $totalRepay) {
            ++$rata;
        }

        return $rata;
    }

    /**
     * @return array{rrsoHundredths: int, totalCostGrosze: int, card: array<string, mixed>}|null
     */
    private static function toPriced(
        OfferInput $offer,
        int $amountPln,
        int $period,
        int $totalCost,
        int $totalRepay,
        ?int $installment,
        float $rrso,
    ): ?array {
        if (!is_finite($rrso)) {
            return null;
        }
        $scaled = $rrso * 10_000;
        if (!is_finite($scaled) || $scaled > PHP_INT_MAX || $scaled < PHP_INT_MIN) {
            return null;
        }
        $rrsoHundredths = (int) round($scaled, 0, PHP_ROUND_HALF_UP);

        return [
            'rrsoHundredths' => $rrsoHundredths,
            'totalCostGrosze' => $totalCost,
            'card' => [
                'id' => $offer->id,
                'partnerName' => $offer->partnerName,
                'logoUrl' => $offer->logoUrl,
                'productType' => $offer->productType->value,
                'productTypeLabel' => $offer->productType->label(),
                'requestedAmountPln' => self::formatMinor($amountPln * 100),
                'period' => $period,
                'periodUnit' => 'days',
                'periodLabel' => self::periodLabel($period),
                'rrsoPercent' => self::formatMinor($rrsoHundredths),
                'interestRatePercent' => self::formatMinor($offer->interestRateBps),
                'rateType' => $offer->rateType->value,
                'rateTypeLabel' => $offer->rateType->label(),
                'totalCostPln' => self::formatMinor($totalCost),
                'totalRepayPln' => self::formatMinor($totalRepay),
                'installmentPln' => $installment === null ? null : self::formatMinor($installment),
                'affiliateUrl' => $offer->affiliateUrl,
            ],
        ];
    }

    /**
     * @param array{rrsoHundredths: int, totalCostGrosze: int, card: array<string, mixed>} $a
     * @param array{rrsoHundredths: int, totalCostGrosze: int, card: array<string, mixed>} $b
     */
    private static function comparePriced(array $a, array $b): int
    {
        if ($a['rrsoHundredths'] !== $b['rrsoHundredths']) {
            return $a['rrsoHundredths'] <=> $b['rrsoHundredths'];
        }
        if ($a['totalCostGrosze'] !== $b['totalCostGrosze']) {
            return $a['totalCostGrosze'] <=> $b['totalCostGrosze'];
        }

        return strcmp((string) $a['card']['id'], (string) $b['card']['id']);
    }

    /**
     * @param list<OfferInput> $offers
     */
    private static function latestUpdatedAt(array $offers): ?string
    {
        if ($offers === []) {
            return null;
        }
        $latest = $offers[0]->updatedAt;
        foreach ($offers as $offer) {
            if ($offer->updatedAt > $latest) {
                $latest = $offer->updatedAt;
            }
        }

        return $latest->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d\TH:i:s.v\Z');
    }

    /**
     * ponytail: int64 grosze, switch to an arbitrary-precision div if a rate no longer fits in 64 bits.
     */
    private static function divRound(int $numer, int $denom): int
    {
        return intdiv($numer + intdiv($denom, 2), $denom);
    }

    /**
     * @param array<string, mixed> $query
     */
    private static function readParam(array $query, string $key): ?string
    {
        if (!\array_key_exists($key, $query)) {
            return null;
        }
        $raw = $query[$key];
        if (!\is_string($raw)) {
            return 'invalid';
        }
        $trimmed = trim($raw);

        return $trimmed === '' ? null : $trimmed;
    }

    private static function parseStrictPositiveInt(string $raw): ?int
    {
        if (!preg_match('/^[1-9]\d*$/', $raw)) {
            return null;
        }
        if (\strlen($raw) > 18) {
            return null;
        }
        $value = (int) $raw;
        if ((string) $value !== $raw) {
            return null;
        }

        return $value;
    }

    private static function periodLabel(int $period): string
    {
        $mod10 = $period % 10;
        $mod100 = $period % 100;
        if ($mod10 === 1 && $mod100 !== 11) {
            return $period.' dzień';
        }

        return $period.' dni';
    }

    private static function formatMinor(int $minor): string
    {
        $sign = $minor < 0 ? '-' : '';
        $abs = abs($minor);

        return $sign.intdiv($abs, 100).'.'.str_pad((string) ($abs % 100), 2, '0', STR_PAD_LEFT);
    }
}
