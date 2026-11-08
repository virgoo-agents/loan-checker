<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * Row in the Prisma `offers` table. Column names and PostgreSQL enums match
 * prisma/schema.prisma. This mapping only reads and seeds that catalog.
 */
#[ORM\Entity]
#[ORM\Table(name: 'offers')]
class Offer
{
    public function __construct(
        #[ORM\Id]
        #[ORM\Column(type: 'text')]
        public string $id,
        #[ORM\Column(name: 'partner_name', type: 'text')]
        public string $partnerName,
        #[ORM\Column(name: 'logo_url', type: 'text', nullable: true)]
        public ?string $logoUrl,
        #[ORM\Column(name: 'product_type', type: 'pg_product_type', enumType: DbProductType::class)]
        public DbProductType $productType,
        #[ORM\Column(name: 'min_amount_pln', type: 'integer')]
        public int $minAmountPln,
        #[ORM\Column(name: 'max_amount_pln', type: 'integer')]
        public int $maxAmountPln,
        #[ORM\Column(name: 'min_period', type: 'integer')]
        public int $minPeriod,
        #[ORM\Column(name: 'max_period', type: 'integer')]
        public int $maxPeriod,
        #[ORM\Column(name: 'interest_rate_bps', type: 'integer')]
        public int $interestRateBps,
        #[ORM\Column(name: 'rate_type', type: 'pg_rate_type', enumType: DbRateType::class)]
        public DbRateType $rateType,
        #[ORM\Column(name: 'commission_bps', type: 'integer')]
        public int $commissionBps,
        #[ORM\Column(name: 'fixed_fee_grosze', type: 'integer')]
        public int $fixedFeeGrosze,
        #[ORM\Column(name: 'affiliate_url', type: 'text', nullable: true)]
        public ?string $affiliateUrl,
        #[ORM\Column(type: 'boolean')]
        public bool $active,
        #[ORM\Column(name: 'created_at', type: 'datetime_immutable')]
        public \DateTimeImmutable $createdAt,
        #[ORM\Column(name: 'updated_at', type: 'datetime_immutable')]
        public \DateTimeImmutable $updatedAt,
    ) {
    }
}
