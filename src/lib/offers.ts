import type { Offer, ProductType, RateType } from "@prisma/client";
import { prisma } from "./db";
import {
  buildRanking,
  type OfferInput,
  type ProductType as DomainProduct,
  type RankingResult,
  type RateType as DomainRate,
} from "./ranking";

export async function loadRanking(params: URLSearchParams): Promise<RankingResult> {
  const rows = await prisma.offer.findMany();
  return buildRanking(params, rows.map(mapOffer));
}

function mapOffer(row: Offer): OfferInput {
  return {
    id: row.id,
    partnerName: row.partnerName,
    logoUrl: row.logoUrl,
    productType: mapProduct(row.productType),
    minAmountPln: row.minAmountPln,
    maxAmountPln: row.maxAmountPln,
    minPeriod: row.minPeriod,
    maxPeriod: row.maxPeriod,
    interestRateBps: row.interestRateBps,
    rateType: mapRate(row.rateType),
    commissionBps: row.commissionBps,
    fixedFeeGrosze: row.fixedFeeGrosze,
    affiliateUrl: row.affiliateUrl,
    active: row.active,
    updatedAt: row.updatedAt,
  };
}

function mapProduct(productType: ProductType): DomainProduct {
  switch (productType) {
    case "PAYDAY":
      return "payday";
    case "INSTALLMENT":
      return "installment";
    default: {
      const exhaustive: never = productType;
      return exhaustive;
    }
  }
}

function mapRate(rateType: RateType): DomainRate {
  switch (rateType) {
    case "FIXED":
      return "fixed";
    case "VARIABLE":
      return "variable";
    default: {
      const exhaustive: never = rateType;
      return exhaustive;
    }
  }
}
