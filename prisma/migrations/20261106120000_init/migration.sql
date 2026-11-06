-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('PAYDAY', 'INSTALLMENT');

-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('FIXED', 'VARIABLE');

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "partner_name" TEXT NOT NULL,
    "logo_url" TEXT,
    "product_type" "ProductType" NOT NULL,
    "min_amount_pln" INTEGER NOT NULL,
    "max_amount_pln" INTEGER NOT NULL,
    "min_period" INTEGER NOT NULL,
    "max_period" INTEGER NOT NULL,
    "interest_rate_bps" INTEGER NOT NULL,
    "rate_type" "RateType" NOT NULL,
    "commission_bps" INTEGER NOT NULL,
    "fixed_fee_grosze" INTEGER NOT NULL,
    "affiliate_url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

