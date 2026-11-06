import { describe, expect, it } from "vitest";
import { offers } from "../../prisma/offers.mjs";
import { buildRanking, type OfferInput, type ProductType, type RateType } from "./ranking";

const updatedAt = new Date("2026-11-05T12:00:00.000Z");

function catalog(): OfferInput[] {
  return offers.map((row) => ({
    id: row.id,
    partnerName: row.partnerName,
    logoUrl: row.logoUrl,
    productType: productType(row.productType),
    minAmountPln: row.minAmountPln,
    maxAmountPln: row.maxAmountPln,
    minPeriod: row.minPeriod,
    maxPeriod: row.maxPeriod,
    interestRateBps: row.interestRateBps,
    rateType: rateType(row.rateType),
    commissionBps: row.commissionBps,
    fixedFeeGrosze: row.fixedFeeGrosze,
    affiliateUrl: row.affiliateUrl,
    active: row.active,
    updatedAt,
  }));
}

function productType(value: string): ProductType {
  switch (value) {
    case "PAYDAY":
      return "payday";
    case "INSTALLMENT":
      return "installment";
    default:
      throw new Error(`unexpected product ${value}`);
  }
}

function rateType(value: string): RateType {
  switch (value) {
    case "FIXED":
      return "fixed";
    case "VARIABLE":
      return "variable";
    default:
      throw new Error(`unexpected rate ${value}`);
  }
}

describe("seeded catalog", () => {
  const rows = catalog();

  it("at 60 days keeps payday offers that allow 60 days and drops every seeded installment loan", () => {
    const result = buildRanking(new URLSearchParams({ amount: "1000", period: "60" }), rows);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.offers.map((offer) => offer.id)).toEqual(["nurt", "para", "kropka", "para-plus"]);
    expect(result.offers.map((offer) => offer.productType).every((type) => type === "payday")).toBe(true);
    expect(result.offers.every((offer) => offer.period === 60)).toBe(true);
    const para = result.offers.find((offer) => offer.id === "para");
    const paraPlus = result.offers.find((offer) => offer.id === "para-plus");
    expect(para?.affiliateUrl).toBeNull();
    expect(paraPlus?.affiliateUrl).toBe("https://example.com/partner/para-plus");
    expect(result.offers.findIndex((offer) => offer.id === "para")).toBeLessThan(
      result.offers.findIndex((offer) => offer.id === "para-plus"),
    );
  });

  it("drops inactive offers and installment loans whose month range excludes 1 month", () => {
    const result = buildRanking(new URLSearchParams({ amount: "1000" }), rows);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.offers.map((offer) => offer.id)).toEqual(["nurt", "para", "blysk", "kropka", "para-plus", "fala"]);
    expect(result.offers.map((offer) => offer.id)).not.toContain("cichy");
    expect(result.offers.map((offer) => offer.id)).not.toContain("mira");
    expect(result.offers.every((offer) => offer.period === 30 && offer.periodUnit === "days")).toBe(true);
  });

  it("returns an empty list for an amount outside every range", () => {
    for (const amount of ["50", "70000"]) {
      const result = buildRanking(new URLSearchParams({ amount }), rows);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.offers).toEqual([]);
    }
  });

  it("returns no offers for a large amount whose only matches are installment loans outside 1 month", () => {
    const result = buildRanking(new URLSearchParams({ amount: "25000" }), rows);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.offers).toEqual([]);
  });
});
