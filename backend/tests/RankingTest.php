<?php

declare(strict_types=1);

namespace App\Tests;

use App\Ranking\ProductType;
use App\Ranking\Ranking;
use App\Ranking\RateType;
use App\Tests\Support\OfferFactory;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class RankingTest extends TestCase
{
    public function testMissingBlankAndWhitespaceAmountAreRequired(): void
    {
        foreach ([[], ['amount' => ''], ['amount' => '   ']] as $query) {
            $result = Ranking::build($query, [OfferFactory::offer(['id' => 'should-not-rank'])]);
            self::assertSame([
                'ok' => false,
                'error' => [
                    'code' => 'AMOUNT_REQUIRED',
                    'field' => 'amount',
                    'message' => 'Podaj kwotę w złotych.',
                ],
            ], $result);
            self::assertArrayNotHasKey('offers', $result);
            self::assertSame(400, Ranking::httpStatus($result));
        }
    }

    #[DataProvider('invalidAmounts')]
    public function testInvalidAmount(string $amount): void
    {
        $result = Ranking::build(['amount' => $amount], [OfferFactory::offer()]);
        self::assertFalse($result['ok']);
        self::assertSame('AMOUNT_INVALID', $result['error']['code']);
        self::assertSame('amount', $result['error']['field']);
        self::assertSame('Kwota musi być dodatnią liczbą całkowitą od 1 do 1000000 zł.', $result['error']['message']);
        self::assertArrayNotHasKey('offers', $result);
        self::assertSame(400, Ranking::httpStatus($result));
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function invalidAmounts(): iterable
    {
        foreach (['abc', '10.5', '1000.00', '0', '-5', '01', '1e3', '+1000', '1000001', '1 000'] as $amount) {
            yield $amount => [$amount];
        }
    }

    public function testAmountBounds(): void
    {
        $low = Ranking::build(['amount' => ' 1 '], []);
        $high = Ranking::build(['amount' => '1000000'], []);
        self::assertSame('1.00', $low['query']['amountPln']);
        self::assertSame('1000000.00', $high['query']['amountPln']);
        self::assertSame([], $low['offers']);
        self::assertSame(200, Ranking::httpStatus($high));
    }

    #[DataProvider('invalidPeriods')]
    public function testRejectsPeriodOtherThanThirtyOrSixty(string $period): void
    {
        $result = Ranking::build(['amount' => '1000', 'period' => $period], [OfferFactory::offer()]);
        self::assertSame([
            'ok' => false,
            'error' => [
                'code' => 'PERIOD_INVALID',
                'field' => 'period',
                'message' => 'Okres musi wynosić 30 albo 60 dni.',
            ],
        ], $result);
        self::assertArrayNotHasKey('offers', $result);
        self::assertSame(400, Ranking::httpStatus($result));
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function invalidPeriods(): iterable
    {
        foreach (['0', '-1', '1.5', '12', '31', '90', '365', '30.0', 'abc'] as $period) {
            yield $period => [$period];
        }
    }

    public function testRejectsMonthsAndAnyUnitOtherThanDays(): void
    {
        $twelveMonths = Ranking::build(
            ['amount' => '1000', 'period' => '12', 'periodUnit' => 'months'],
            [OfferFactory::offer([
                'id' => 'should-not-rank',
                'productType' => ProductType::Installment,
                'minPeriod' => 6,
                'maxPeriod' => 36,
            ])],
        );
        self::assertSame('PERIOD_UNIT_INVALID', $twelveMonths['error']['code']);
        self::assertSame('periodUnit', $twelveMonths['error']['field']);
        self::assertSame('Jednostka okresu musi mieć wartość days.', $twelveMonths['error']['message']);
        self::assertArrayNotHasKey('offers', $twelveMonths);

        $monthsAlone = Ranking::build(['amount' => '1000', 'periodUnit' => 'months'], [OfferFactory::offer()]);
        self::assertSame('PERIOD_UNIT_INVALID', $monthsAlone['error']['code']);

        $weeks = Ranking::build(
            ['amount' => '1000', 'period' => '30', 'periodUnit' => 'weeks'],
            [OfferFactory::offer()],
        );
        self::assertSame('PERIOD_UNIT_INVALID', $weeks['error']['code']);
        self::assertSame(400, Ranking::httpStatus($weeks));
    }

    public function testAcceptsThirtyAndSixtyDaysWithOrWithoutTheUnit(): void
    {
        $thirty = Ranking::build(['amount' => '1000', 'period' => '30'], [OfferFactory::offer()]);
        $sixty = Ranking::build(
            ['amount' => '1000', 'period' => '60', 'periodUnit' => 'days'],
            [OfferFactory::offer()],
        );
        self::assertSame(30, $thirty['query']['period']);
        self::assertSame('days', $thirty['query']['periodUnit']);
        self::assertSame(60, $sixty['query']['period']);
        self::assertSame('days', $sixty['query']['periodUnit']);
    }

    public function testOmittedBlankPeriodAndUnitWithoutNumberDefaultToThirtyDays(): void
    {
        $payday = OfferFactory::offer(['id' => 'pay', 'interestRateBps' => 1_000, 'minPeriod' => 7, 'maxPeriod' => 60]);
        $installment = OfferFactory::offer([
            'id' => 'inst',
            'productType' => ProductType::Installment,
            'interestRateBps' => 0,
            'minAmountPln' => 100,
            'minPeriod' => 1,
            'maxPeriod' => 2,
        ]);
        $tooLong = OfferFactory::offer([
            'id' => 'long',
            'productType' => ProductType::Installment,
            'minAmountPln' => 100,
            'minPeriod' => 6,
            'maxPeriod' => 36,
        ]);

        foreach ([
            ['amount' => '1200'],
            ['amount' => '1200', 'period' => '  '],
            ['amount' => '1200', 'periodUnit' => 'days'],
        ] as $query) {
            $result = Ranking::build($query, [$payday, $installment, $tooLong]);
            self::assertSame(30, $result['query']['period']);
            self::assertSame('days', $result['query']['periodUnit']);
            self::assertSame(['inst', 'pay'], self::ids($result));
            self::assertSame('30 dni', $result['offers'][0]['periodLabel']);
        }
    }

    public function testExplicitThirtyMatchesTheDefaultAndExplicitSixtyDropsShorterRanges(): void
    {
        $payday = OfferFactory::offer(['id' => 'pay', 'interestRateBps' => 1_000, 'minPeriod' => 7, 'maxPeriod' => 60]);
        $onlyThirty = OfferFactory::offer(['id' => 'only30', 'minPeriod' => 15, 'maxPeriod' => 30, 'interestRateBps' => 1_000]);
        $installment = OfferFactory::offer([
            'id' => 'inst',
            'productType' => ProductType::Installment,
            'interestRateBps' => 0,
            'minAmountPln' => 100,
            'minPeriod' => 1,
            'maxPeriod' => 2,
        ]);
        $tooLong = OfferFactory::offer([
            'id' => 'long',
            'productType' => ProductType::Installment,
            'minAmountPln' => 100,
            'minPeriod' => 6,
            'maxPeriod' => 36,
        ]);

        $thirty = Ranking::build(['amount' => '1200', 'period' => '30'], [$payday, $installment, $tooLong]);
        self::assertSame(['inst', 'pay'], self::ids($thirty));
        $pay = self::byId($thirty, 'pay');
        self::assertSame('9.86', $pay['totalCostPln']);
        self::assertSame('10.47', $pay['rrsoPercent']);
        self::assertNull($pay['installmentPln']);
        $inst = self::byId($thirty, 'inst');
        self::assertSame('1200.00', $inst['installmentPln']);
        self::assertSame('0.00', $inst['totalCostPln']);
        self::assertSame('installment', $inst['productType']);

        $sixty = Ranking::build(
            ['amount' => '1200', 'period' => '60'],
            [$payday, $onlyThirty, $installment, $tooLong],
        );
        self::assertSame(60, $sixty['query']['period']);
        self::assertSame('days', $sixty['query']['periodUnit']);
        self::assertEqualsCanonicalizing(['inst', 'pay'], self::ids($sixty));
        self::assertSame('600.00', self::byId($sixty, 'inst')['installmentPln']);
        self::assertNull(self::byId($sixty, 'pay')['installmentPln']);
        self::assertSame('19.73', self::byId($sixty, 'pay')['totalCostPln']);
    }

    public function testThirtyDaysIsOneMonthAndSixtyDaysIsTwoMonths(): void
    {
        $oneMonth = OfferFactory::offer([
            'id' => 'm1',
            'productType' => ProductType::Installment,
            'minPeriod' => 1,
            'maxPeriod' => 1,
        ]);
        $twoMonths = OfferFactory::offer([
            'id' => 'm2',
            'productType' => ProductType::Installment,
            'minPeriod' => 2,
            'maxPeriod' => 2,
        ]);
        $payday30 = OfferFactory::offer(['id' => 'd30', 'minPeriod' => 30, 'maxPeriod' => 30]);
        $payday60 = OfferFactory::offer(['id' => 'd60', 'minPeriod' => 60, 'maxPeriod' => 60]);
        $catalog = [$oneMonth, $twoMonths, $payday30, $payday60];

        self::assertSame(
            ['d30', 'm1'],
            self::ids(Ranking::build(['amount' => '1000', 'period' => '30'], $catalog)),
        );
        self::assertSame(
            ['d60', 'm2'],
            self::ids(Ranking::build(['amount' => '1000', 'period' => '60'], $catalog)),
        );
    }

    public function testSameRateProducesTheSameCostForBothProducts(): void
    {
        $result = Ranking::build(['amount' => '1200', 'period' => '60'], [
            OfferFactory::offer(['id' => 'pay', 'interestRateBps' => 1_000, 'minPeriod' => 1, 'maxPeriod' => 60]),
            OfferFactory::offer([
                'id' => 'inst',
                'productType' => ProductType::Installment,
                'interestRateBps' => 1_000,
                'minPeriod' => 1,
                'maxPeriod' => 2,
            ]),
        ]);
        self::assertSame([
            ['inst', '19.73', '10.43', 60],
            ['pay', '19.73', '10.43', 60],
        ], array_map(
            static fn (array $row): array => [$row['id'], $row['totalCostPln'], $row['rrsoPercent'], $row['period']],
            $result['offers'],
        ));
        self::assertSame('609.87', $result['offers'][0]['installmentPln']);
        self::assertNull($result['offers'][1]['installmentPln']);
    }

    public function testAmountRangeAndInactiveOffers(): void
    {
        $catalog = [
            OfferFactory::offer(['id' => 'in', 'minAmountPln' => 500, 'maxAmountPln' => 5_000]),
            OfferFactory::offer(['id' => 'below', 'minAmountPln' => 100, 'maxAmountPln' => 499]),
            OfferFactory::offer(['id' => 'above', 'minAmountPln' => 5_001, 'maxAmountPln' => 9_000]),
            OfferFactory::offer(['id' => 'inactive', 'minAmountPln' => 500, 'maxAmountPln' => 5_000, 'active' => false]),
        ];
        self::assertSame(['in'], self::ids(Ranking::build(['amount' => '500'], $catalog)));
        self::assertSame(['in'], self::ids(Ranking::build(['amount' => '5000'], $catalog)));
        self::assertSame(['below'], self::ids(Ranking::build(['amount' => '499'], $catalog)));
        self::assertSame(['above'], self::ids(Ranking::build(['amount' => '5001'], $catalog)));
    }

    public function testOrdersByLowestRrsoThenTotalCostThenIdAndIgnoresAffiliateUrl(): void
    {
        $byRate = Ranking::build(['amount' => '1000', 'period' => '30'], [
            OfferFactory::offer(['id' => 'mid', 'interestRateBps' => 1_000, 'affiliateUrl' => 'https://ads.example/mid']),
            OfferFactory::offer(['id' => 'high', 'interestRateBps' => 2_000, 'affiliateUrl' => 'https://ads.example/top-placement']),
            OfferFactory::offer(['id' => 'low', 'interestRateBps' => 0, 'affiliateUrl' => null]),
        ]);
        self::assertSame([
            ['low', '0.00'],
            ['mid', '10.47'],
            ['high', '21.94'],
        ], array_map(static fn (array $row): array => [$row['id'], $row['rrsoPercent']], $byRate['offers']));
        self::assertSame(Ranking::CRITERION, $byRate['criterion']);

        $tie = Ranking::build(['amount' => '1000', 'period' => '60'], [
            OfferFactory::offer([
                'id' => 'dearer',
                'partnerName' => 'Para Plus',
                'interestRateBps' => 0,
                'fixedFeeGrosze' => 1_645,
                'affiliateUrl' => 'https://ads.example/premium',
            ]),
            OfferFactory::offer([
                'id' => 'cheaper',
                'partnerName' => 'Para',
                'interestRateBps' => 1_000,
                'fixedFeeGrosze' => 0,
                'affiliateUrl' => null,
            ]),
        ]);
        self::assertSame([
            ['cheaper', '10.43', '16.44'],
            ['dearer', '10.43', '16.45'],
        ], array_map(
            static fn (array $row): array => [$row['id'], $row['rrsoPercent'], $row['totalCostPln']],
            $tie['offers'],
        ));

        $withAds = Ranking::build(['amount' => '1000', 'period' => '30'], [
            OfferFactory::offer(['id' => 'b', 'affiliateUrl' => 'https://aaa.example/first']),
            OfferFactory::offer(['id' => 'a', 'affiliateUrl' => 'https://zzz.example/last']),
        ]);
        $swapped = Ranking::build(['amount' => '1000', 'period' => '30'], [
            OfferFactory::offer(['id' => 'b', 'affiliateUrl' => 'https://zzz.example/last']),
            OfferFactory::offer(['id' => 'a', 'affiliateUrl' => 'https://aaa.example/first']),
        ]);
        self::assertSame(['a', 'b'], self::ids($withAds));
        self::assertSame(['a', 'b'], self::ids($swapped));
    }

    public function testWorsePaidOfferStaysBehindACheaperOffer(): void
    {
        $base = [
            OfferFactory::offer(['id' => 'organic', 'interestRateBps' => 0, 'affiliateUrl' => null]),
            OfferFactory::offer(['id' => 'paid', 'interestRateBps' => 2_000, 'affiliateUrl' => 'https://ads.example/top-placement']),
        ];
        $flipped = [
            OfferFactory::offer(['id' => 'organic', 'interestRateBps' => 0, 'affiliateUrl' => 'https://ads.example/top-placement']),
            OfferFactory::offer(['id' => 'paid', 'interestRateBps' => 2_000, 'affiliateUrl' => null]),
        ];
        $params = ['amount' => '1000', 'period' => '30'];
        self::assertSame(['organic', 'paid'], self::ids(Ranking::build($params, $base)));
        self::assertSame(['organic', 'paid'], self::ids(Ranking::build($params, $flipped)));
        self::assertSame('https://ads.example/top-placement', Ranking::build($params, $base)['offers'][1]['affiliateUrl']);
    }

    public function testEmptyListKeepsTheLatestTimestampIncludingInactiveRows(): void
    {
        $result = Ranking::build(['amount' => '50'], [
            OfferFactory::offer([
                'id' => 'old',
                'minAmountPln' => 100,
                'maxAmountPln' => 200,
                'updatedAt' => new \DateTimeImmutable('2026-01-01T00:00:00.000Z'),
            ]),
            OfferFactory::offer([
                'id' => 'inactive-cheap',
                'active' => false,
                'interestRateBps' => 0,
                'updatedAt' => new \DateTimeImmutable('2026-11-05T12:00:00.000Z'),
            ]),
        ]);
        self::assertSame([], $result['offers']);
        self::assertSame('2026-11-05T12:00:00.000Z', $result['offersUpdatedAt']);
        self::assertSame('lowest_rrso_then_total_cost', $result['criterion']['id']);
        self::assertSame(200, Ranking::httpStatus($result));

        $empty = Ranking::build(['amount' => '1000'], []);
        self::assertNull($empty['offersUpdatedAt']);
        self::assertSame([], $empty['offers']);
    }

    public function testInstallmentRataAndPaydayCardFields(): void
    {
        $payday = Ranking::build(['amount' => '1000', 'period' => '30'], [OfferFactory::offer(['id' => 'pay'])]);
        self::assertNull($payday['offers'][0]['installmentPln']);
        self::assertSame('payday', $payday['offers'][0]['productType']);
        self::assertSame('chwilówka', $payday['offers'][0]['productTypeLabel']);

        $installment = Ranking::build(['amount' => '1200', 'period' => '30'], [
            OfferFactory::offer([
                'id' => 'inst',
                'productType' => ProductType::Installment,
                'interestRateBps' => 1_200,
                'rateType' => RateType::Variable,
                'minPeriod' => 1,
                'maxPeriod' => 2,
            ]),
        ]);
        self::assertSame('installment', $installment['offers'][0]['productType']);
        self::assertSame('pożyczka ratalna', $installment['offers'][0]['productTypeLabel']);
        self::assertSame('1211.84', $installment['offers'][0]['installmentPln']);
        self::assertSame('11.84', $installment['offers'][0]['totalCostPln']);
        self::assertSame('1211.84', $installment['offers'][0]['totalRepayPln']);
        self::assertSame('12.69', $installment['offers'][0]['rrsoPercent']);
        self::assertSame('12.00', $installment['offers'][0]['interestRatePercent']);
        self::assertSame('variable', $installment['offers'][0]['rateType']);
        self::assertSame('zmienna', $installment['offers'][0]['rateTypeLabel']);

        $fee = Ranking::build(['amount' => '1200', 'period' => '30'], [
            OfferFactory::offer([
                'id' => 'fee',
                'productType' => ProductType::Installment,
                'interestRateBps' => 0,
                'fixedFeeGrosze' => 12_000,
                'minPeriod' => 1,
                'maxPeriod' => 2,
            ]),
        ]);
        self::assertSame('1320.00', $fee['offers'][0]['installmentPln']);
        self::assertSame('120.00', $fee['offers'][0]['totalCostPln']);
        self::assertSame('1320.00', $fee['offers'][0]['totalRepayPln']);
        self::assertSame('218.87', $fee['offers'][0]['rrsoPercent']);
    }

    public function testPaydayInterestAndFees(): void
    {
        $result = Ranking::build(['amount' => '1000', 'period' => '30'], [
            OfferFactory::offer([
                'id' => 'mix',
                'partnerName' => 'Fala',
                'logoUrl' => 'https://example.com/logos/fala.svg',
                'interestRateBps' => 1_000,
                'commissionBps' => 500,
                'fixedFeeGrosze' => 150,
                'rateType' => RateType::Fixed,
                'affiliateUrl' => 'https://example.com/partner/fala',
            ]),
        ]);
        $card = $result['offers'][0];
        self::assertSame('Fala', $card['partnerName']);
        self::assertSame('https://example.com/logos/fala.svg', $card['logoUrl']);
        self::assertSame('1000.00', $card['requestedAmountPln']);
        self::assertSame(30, $card['period']);
        self::assertSame('days', $card['periodUnit']);
        self::assertSame('30 dni', $card['periodLabel']);
        self::assertSame('10.00', $card['interestRatePercent']);
        self::assertSame('fixed', $card['rateType']);
        self::assertSame('stała', $card['rateTypeLabel']);
        self::assertSame('59.72', $card['totalCostPln']);
        self::assertSame('1059.72', $card['totalRepayPln']);
        self::assertSame('102.53', $card['rrsoPercent']);
        self::assertNull($card['installmentPln']);
        self::assertSame('https://example.com/partner/fala', $card['affiliateUrl']);
    }

    /**
     * @param array<string, mixed> $result
     *
     * @return list<string>
     */
    private static function ids(array $result): array
    {
        return array_map(static fn (array $row): string => $row['id'], $result['offers']);
    }

    /**
     * @param array<string, mixed> $result
     *
     * @return array<string, mixed>
     */
    private static function byId(array $result, string $id): array
    {
        foreach ($result['offers'] as $row) {
            if ($row['id'] === $id) {
                return $row;
            }
        }
        self::fail('Missing offer '.$id);
    }
}
