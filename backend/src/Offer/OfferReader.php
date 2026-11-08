<?php

declare(strict_types=1);

namespace App\Offer;

use App\Entity\Offer;
use App\Ranking\OfferInput;
use Doctrine\ORM\EntityManagerInterface;

class OfferReader
{
    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
    }

    /**
     * @return list<OfferInput>
     */
    public function all(): array
    {
        /** @var list<Offer> $rows */
        $rows = $this->entityManager->getRepository(Offer::class)->findAll();
        $offers = [];
        foreach ($rows as $row) {
            $offers[] = new OfferInput(
                id: $row->id,
                partnerName: $row->partnerName,
                logoUrl: $row->logoUrl,
                productType: $row->productType->toDomain(),
                minAmountPln: $row->minAmountPln,
                maxAmountPln: $row->maxAmountPln,
                minPeriod: $row->minPeriod,
                maxPeriod: $row->maxPeriod,
                interestRateBps: $row->interestRateBps,
                rateType: $row->rateType->toDomain(),
                commissionBps: $row->commissionBps,
                fixedFeeGrosze: $row->fixedFeeGrosze,
                affiliateUrl: $row->affiliateUrl,
                active: $row->active,
                updatedAt: $row->updatedAt,
            );
        }

        return $offers;
    }
}
