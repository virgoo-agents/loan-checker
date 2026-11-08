<?php

declare(strict_types=1);

namespace App\Ranking;

enum RateType: string
{
    case Fixed = 'fixed';
    case Variable = 'variable';

    public function label(): string
    {
        return match ($this) {
            self::Fixed => 'stała',
            self::Variable => 'zmienna',
        };
    }
}
