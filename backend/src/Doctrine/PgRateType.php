<?php

declare(strict_types=1);

namespace App\Doctrine;

final class PgRateType extends PgEnumType
{
    protected function enumName(): string
    {
        return 'RateType';
    }
}
