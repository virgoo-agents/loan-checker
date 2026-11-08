<?php

declare(strict_types=1);

namespace App\Entity;

use App\Ranking\RateType;

enum DbRateType: string
{
    case Fixed = 'FIXED';
    case Variable = 'VARIABLE';

    public function toDomain(): RateType
    {
        return match ($this) {
            self::Fixed => RateType::Fixed,
            self::Variable => RateType::Variable,
        };
    }

    public static function fromDomain(RateType $rateType): self
    {
        return match ($rateType) {
            RateType::Fixed => self::Fixed,
            RateType::Variable => self::Variable,
        };
    }
}
