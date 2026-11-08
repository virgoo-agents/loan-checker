<?php

declare(strict_types=1);

namespace App\Entity;

use App\Ranking\ProductType;

enum DbProductType: string
{
    case Payday = 'PAYDAY';
    case Installment = 'INSTALLMENT';

    public function toDomain(): ProductType
    {
        return match ($this) {
            self::Payday => ProductType::Payday,
            self::Installment => ProductType::Installment,
        };
    }

    public static function fromDomain(ProductType $productType): self
    {
        return match ($productType) {
            ProductType::Payday => self::Payday,
            ProductType::Installment => self::Installment,
        };
    }
}
