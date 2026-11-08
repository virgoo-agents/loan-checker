<?php

declare(strict_types=1);

namespace App\Ranking;

final readonly class OfferInput
{
    public function __construct(
        public string $id,
        public string $partnerName,
        public ?string $logoUrl,
        public ProductType $productType,
        public int $minAmountPln,
        public int $maxAmountPln,
        public int $minPeriod,
        public int $maxPeriod,
        public int $interestRateBps,
        public RateType $rateType,
        public int $commissionBps,
        public int $fixedFeeGrosze,
        public ?string $affiliateUrl,
        public bool $active,
        public \DateTimeImmutable $updatedAt,
    ) {
    }
}
