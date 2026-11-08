<?php

declare(strict_types=1);

namespace App\Doctrine;

use Doctrine\DBAL\Platforms\AbstractPlatform;
use Doctrine\DBAL\Types\Type;

/**
 * PostgreSQL enum created by the Prisma migration (`"ProductType"`, `"RateType"`).
 * Reads come back as text. Writes cast the bound parameter so Postgres accepts it.
 */
abstract class PgEnumType extends Type
{
    abstract protected function enumName(): string;

    public function getSQLDeclaration(array $column, AbstractPlatform $platform): string
    {
        return '"'.$this->enumName().'"';
    }

    public function convertToDatabaseValueSQL(string $sqlExpr, AbstractPlatform $platform): string
    {
        return 'CAST('.$sqlExpr.' AS "'.$this->enumName().'")';
    }

    public function convertToPHPValue(mixed $value, AbstractPlatform $platform): mixed
    {
        return $value;
    }

    public function convertToDatabaseValue(mixed $value, AbstractPlatform $platform): mixed
    {
        if ($value instanceof \BackedEnum) {
            return $value->value;
        }

        return $value;
    }
}
