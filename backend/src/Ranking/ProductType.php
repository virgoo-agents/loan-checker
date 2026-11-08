<?php

declare(strict_types=1);

namespace App\Ranking;

enum ProductType: string
{
    case Payday = 'payday';
    case Installment = 'installment';

    public function label(): string
    {
        return match ($this) {
            self::Payday => 'chwilówka',
            self::Installment => 'pożyczka ratalna',
        };
    }
}
