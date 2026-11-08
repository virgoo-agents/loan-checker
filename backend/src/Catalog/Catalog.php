<?php

declare(strict_types=1);

namespace App\Catalog;

use App\Ranking\OfferInput;
use App\Ranking\ProductType;
use App\Ranking\RateType;

/**
 * Fictional lenders for the ranking catalog. Ids, ranges, rates, fees, and links are defined here.
 */
final class Catalog
{
    /**
     * @return list<array{
     *     id: string,
     *     partnerName: string,
     *     logoUrl: ?string,
     *     productType: ProductType,
     *     minAmountPln: int,
     *     maxAmountPln: int,
     *     minPeriod: int,
     *     maxPeriod: int,
     *     interestRateBps: int,
     *     rateType: RateType,
     *     commissionBps: int,
     *     fixedFeeGrosze: int,
     *     affiliateUrl: ?string,
     *     active: bool
     * }>
     */
    public static function rows(): array
    {
        return [
            self::row([
                'id' => 'nurt',
                'partnerName' => 'Nurt',
                'logoUrl' => 'https://example.com/logos/nurt.svg',
                'productType' => ProductType::Payday,
                'minAmountPln' => 500,
                'maxAmountPln' => 10_000,
                'minPeriod' => 30,
                'maxPeriod' => 90,
                'interestRateBps' => 720,
                'rateType' => RateType::Fixed,
                'affiliateUrl' => 'https://example.com/partner/nurt',
            ]),
            self::row([
                'id' => 'fala',
                'partnerName' => 'Fala Gotówki',
                'productType' => ProductType::Payday,
                'minAmountPln' => 200,
                'maxAmountPln' => 8_000,
                'minPeriod' => 7,
                'maxPeriod' => 30,
                'interestRateBps' => 1_850,
                'rateType' => RateType::Fixed,
                'commissionBps' => 1_000,
                'affiliateUrl' => 'https://example.com/partner/fala',
            ]),
            self::row([
                'id' => 'kropka',
                'partnerName' => 'Kropka Pożyczki',
                'productType' => ProductType::Payday,
                'minAmountPln' => 100,
                'maxAmountPln' => 5_000,
                'minPeriod' => 15,
                'maxPeriod' => 60,
                'interestRateBps' => 900,
                'rateType' => RateType::Fixed,
                'commissionBps' => 500,
                'fixedFeeGrosze' => 1_000,
                'affiliateUrl' => 'https://example.com/partner/kropka',
            ]),
            self::row([
                'id' => 'blysk',
                'partnerName' => 'Błysk',
                'productType' => ProductType::Payday,
                'minAmountPln' => 100,
                'maxAmountPln' => 2_000,
                'minPeriod' => 15,
                'maxPeriod' => 30,
                'interestRateBps' => 0,
                'rateType' => RateType::Fixed,
                'fixedFeeGrosze' => 4_900,
                'affiliateUrl' => 'https://example.com/partner/blysk',
            ]),
            self::row([
                'id' => 'para',
                'partnerName' => 'Para',
                'productType' => ProductType::Payday,
                'minAmountPln' => 100,
                'maxAmountPln' => 10_000,
                'minPeriod' => 30,
                'maxPeriod' => 365,
                'interestRateBps' => 1_000,
                'rateType' => RateType::Fixed,
            ]),
            self::row([
                'id' => 'para-plus',
                'partnerName' => 'Para Plus',
                'productType' => ProductType::Payday,
                'minAmountPln' => 100,
                'maxAmountPln' => 10_000,
                'minPeriod' => 30,
                'maxPeriod' => 365,
                'interestRateBps' => 0,
                'rateType' => RateType::Fixed,
                'fixedFeeGrosze' => 10_001,
                'affiliateUrl' => 'https://example.com/partner/para-plus',
            ]),
            self::row([
                'id' => 'mira',
                'partnerName' => 'Mira Raty',
                'productType' => ProductType::Installment,
                'minAmountPln' => 1_000,
                'maxAmountPln' => 20_000,
                'minPeriod' => 6,
                'maxPeriod' => 36,
                'interestRateBps' => 1_150,
                'rateType' => RateType::Fixed,
                'affiliateUrl' => 'https://example.com/partner/mira',
            ]),
            self::row([
                'id' => 'vega',
                'partnerName' => 'Vega Raty',
                'productType' => ProductType::Installment,
                'minAmountPln' => 2_000,
                'maxAmountPln' => 25_000,
                'minPeriod' => 12,
                'maxPeriod' => 48,
                'interestRateBps' => 990,
                'rateType' => RateType::Variable,
                'commissionBps' => 600,
                'affiliateUrl' => 'https://example.com/partner/vega',
            ]),
            self::row([
                'id' => 'gora',
                'partnerName' => 'Góra Finansów',
                'productType' => ProductType::Installment,
                'minAmountPln' => 20_000,
                'maxAmountPln' => 60_000,
                'minPeriod' => 12,
                'maxPeriod' => 24,
                'interestRateBps' => 750,
                'rateType' => RateType::Fixed,
                'commissionBps' => 200,
                'affiliateUrl' => 'https://example.com/partner/gora',
            ]),
            self::row([
                'id' => 'cichy',
                'partnerName' => 'Cichy Zakład',
                'productType' => ProductType::Payday,
                'minAmountPln' => 100,
                'maxAmountPln' => 10_000,
                'minPeriod' => 1,
                'maxPeriod' => 365,
                'interestRateBps' => 0,
                'rateType' => RateType::Fixed,
                'affiliateUrl' => 'https://example.com/partner/cichy',
                'active' => false,
            ]),
            self::row([
                'id' => 'grosik',
                'partnerName' => 'Grosik',
                'productType' => ProductType::Payday,
                'minAmountPln' => 100,
                'maxAmountPln' => 300,
                'minPeriod' => 30,
                'maxPeriod' => 30,
                'interestRateBps' => 2_000,
                'rateType' => RateType::Fixed,
                'commissionBps' => 1_500,
                'fixedFeeGrosze' => 500,
                'affiliateUrl' => 'https://example.com/partner/grosik',
            ]),
        ];
    }

    /**
     * @return list<OfferInput>
     */
    public static function inputs(\DateTimeImmutable $updatedAt): array
    {
        $offers = [];
        foreach (self::rows() as $row) {
            $offers[] = new OfferInput(
                id: $row['id'],
                partnerName: $row['partnerName'],
                logoUrl: $row['logoUrl'],
                productType: $row['productType'],
                minAmountPln: $row['minAmountPln'],
                maxAmountPln: $row['maxAmountPln'],
                minPeriod: $row['minPeriod'],
                maxPeriod: $row['maxPeriod'],
                interestRateBps: $row['interestRateBps'],
                rateType: $row['rateType'],
                commissionBps: $row['commissionBps'],
                fixedFeeGrosze: $row['fixedFeeGrosze'],
                affiliateUrl: $row['affiliateUrl'],
                active: $row['active'],
                updatedAt: $updatedAt,
            );
        }

        return $offers;
    }

    /**
     * @param array<string, mixed> $row
     *
     * @return array{
     *     id: string,
     *     partnerName: string,
     *     logoUrl: ?string,
     *     productType: ProductType,
     *     minAmountPln: int,
     *     maxAmountPln: int,
     *     minPeriod: int,
     *     maxPeriod: int,
     *     interestRateBps: int,
     *     rateType: RateType,
     *     commissionBps: int,
     *     fixedFeeGrosze: int,
     *     affiliateUrl: ?string,
     *     active: bool
     * }
     */
    private static function row(array $row): array
    {
        return [
            'id' => $row['id'],
            'partnerName' => $row['partnerName'],
            'logoUrl' => $row['logoUrl'] ?? null,
            'productType' => $row['productType'],
            'minAmountPln' => $row['minAmountPln'],
            'maxAmountPln' => $row['maxAmountPln'],
            'minPeriod' => $row['minPeriod'],
            'maxPeriod' => $row['maxPeriod'],
            'interestRateBps' => $row['interestRateBps'],
            'rateType' => $row['rateType'],
            'commissionBps' => $row['commissionBps'] ?? 0,
            'fixedFeeGrosze' => $row['fixedFeeGrosze'] ?? 0,
            'affiliateUrl' => $row['affiliateUrl'] ?? null,
            'active' => $row['active'] ?? true,
        ];
    }
}
