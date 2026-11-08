<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Ranking\OfferInput;
use App\Ranking\ProductType;
use App\Ranking\RateType;

final class OfferFactory
{
    /**
     * @param array<string, mixed> $overrides
     */
    public static function offer(array $overrides = []): OfferInput
    {
        $values = array_replace([
            'id' => 'offer',
            'partnerName' => 'Test Lender',
            'logoUrl' => null,
            'productType' => ProductType::Payday,
            'minAmountPln' => 100,
            'maxAmountPln' => 10_000,
            'minPeriod' => 1,
            'maxPeriod' => 365,
            'interestRateBps' => 0,
            'rateType' => RateType::Fixed,
            'commissionBps' => 0,
            'fixedFeeGrosze' => 0,
            'affiliateUrl' => null,
            'active' => true,
            'updatedAt' => new \DateTimeImmutable('2026-11-05T12:00:00.000Z'),
        ], $overrides);

        return new OfferInput(
            id: $values['id'],
            partnerName: $values['partnerName'],
            logoUrl: $values['logoUrl'],
            productType: $values['productType'],
            minAmountPln: $values['minAmountPln'],
            maxAmountPln: $values['maxAmountPln'],
            minPeriod: $values['minPeriod'],
            maxPeriod: $values['maxPeriod'],
            interestRateBps: $values['interestRateBps'],
            rateType: $values['rateType'],
            commissionBps: $values['commissionBps'],
            fixedFeeGrosze: $values['fixedFeeGrosze'],
            affiliateUrl: $values['affiliateUrl'],
            active: $values['active'],
            updatedAt: $values['updatedAt'],
        );
    }
}
