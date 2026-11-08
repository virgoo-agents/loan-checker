<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Creates the Prisma offers catalog when this database does not already have it.
 * On the current Supabase/Postgres database the types and table already exist, so each statement is a no-op.
 * Down is refused: dropping offers would delete the catalog the Next.js app still reads.
 */
final class Version20261108120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create the Prisma-compatible offers table and enums if they are missing.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
DO $$ BEGIN
    CREATE TYPE "ProductType" AS ENUM ('PAYDAY', 'INSTALLMENT');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$
SQL);
        $this->addSql(<<<'SQL'
DO $$ BEGIN
    CREATE TYPE "RateType" AS ENUM ('FIXED', 'VARIABLE');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$
SQL);
        $this->addSql(<<<'SQL'
CREATE TABLE IF NOT EXISTS offers (
    id TEXT NOT NULL,
    partner_name TEXT NOT NULL,
    logo_url TEXT,
    product_type "ProductType" NOT NULL,
    min_amount_pln INTEGER NOT NULL,
    max_amount_pln INTEGER NOT NULL,
    min_period INTEGER NOT NULL,
    max_period INTEGER NOT NULL,
    interest_rate_bps INTEGER NOT NULL,
    rate_type "RateType" NOT NULL,
    commission_bps INTEGER NOT NULL,
    fixed_fee_grosze INTEGER NOT NULL,
    affiliate_url TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    CONSTRAINT offers_pkey PRIMARY KEY (id)
)
SQL);
    }

    public function down(Schema $schema): void
    {
        $this->throwIrreversibleMigrationException('Refusing to drop offers. The Next.js app still reads this catalog.');
    }
}
