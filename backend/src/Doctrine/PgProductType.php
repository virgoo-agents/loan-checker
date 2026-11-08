<?php

declare(strict_types=1);

namespace App\Doctrine;

final class PgProductType extends PgEnumType
{
    protected function enumName(): string
    {
        return 'ProductType';
    }
}
