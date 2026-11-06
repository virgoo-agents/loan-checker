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

  it("ranks Para ahead of the affiliated Para Plus when RRSO ties", () => {
    const result = buildRanking(new URLSearchParams({ amount: "1000", period: "365" }), rows);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.offers.map((offer) => [offer.id, offer.rrsoPercent, offer.totalCostPln, offer.affiliateUrl])).toEqual([
      ["para", "10.00", "100.00", null],
      ["para-plus", "10.00", "100.01", "https://example.com/partner/para-plus"],
      ["mira", "11.50", "115.00", "https://example.com/partner/mira"],
    ]);
  });

  it("drops the inactive zero-cost offer from an amount-only ranking", () => {
    const result = buildRanking(new URLSearchParams({ amount: "1000" }), rows);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.offers.map((offer) => offer.id)).not.toContain("cichy");
    const mira = result.offers.find((offer) => offer.id === "mira");
    expect(mira).toMatchObject({ period: 30, periodUnit: "days", productType: "installment" });
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

  it("prices large installment offers for 30 days when period is omitted", () => {
    const result = buildRanking(new URLSearchParams({ amount: "25000" }), rows);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.offers.map((offer) => offer.id).sort()).toEqual(["gora", "vega"]);
    expect(result.offers.every((offer) => offer.period === 30 && offer.periodUnit === "days" && offer.installmentPln !== null)).toBe(true);
  });
});
