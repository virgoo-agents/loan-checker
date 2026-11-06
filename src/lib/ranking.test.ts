import { describe, expect, it } from "vitest";
import { buildRanking, httpStatusForRanking, type OfferInput, type RankingResult } from "./ranking";

const UPDATED = new Date("2026-11-05T12:00:00.000Z");

function offer(overrides: Partial<OfferInput> = {}): OfferInput {
  return {
    id: "offer",
    partnerName: "Test Lender",
    logoUrl: null,
    productType: "payday",
    minAmountPln: 100,
    maxAmountPln: 10_000,
    minPeriod: 1,
    maxPeriod: 365,
    interestRateBps: 0,
    rateType: "fixed",
    commissionBps: 0,
    fixedFeeGrosze: 0,
    affiliateUrl: null,
    active: true,
    updatedAt: UPDATED,
    ...overrides,
  };
}

function expectOk(result: RankingResult) {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`${result.error.code}: ${result.error.message}`);
  }
  return result;
}

describe("amount validation", () => {
  const catalog = [offer({ id: "should-not-rank" })];

  it.each([
    ["missing", new URLSearchParams()],
    ["empty", new URLSearchParams({ amount: "" })],
    ["blank", new URLSearchParams({ amount: "   " })],
  ])("rejects %s amount without a ranking", (_label, params) => {
    const result = buildRanking(params, catalog);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({
      code: "AMOUNT_REQUIRED",
      field: "amount",
      message: "Podaj kwotę w złotych.",
    });
    expect(result).not.toHaveProperty("offers");
    expect(httpStatusForRanking(result)).toBe(400);
  });

  it.each(["abc", "10.5", "1000.00", "0", "-5", "01", "1e3", "+1000", "1000001", "1 000"])(
    "rejects invalid amount %s",
    (amount) => {
      const result = buildRanking(new URLSearchParams({ amount }), catalog);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe("AMOUNT_INVALID");
      expect(result.error.field).toBe("amount");
      expect(result.error.message).toBe(
        "Kwota musi być dodatnią liczbą całkowitą od 1 do 1000000 zł.",
      );
      expect(result).not.toHaveProperty("offers");
      expect(httpStatusForRanking(result)).toBe(400);
    },
  );

  it("accepts a trimmed integer and the documented bounds", () => {
    const low = expectOk(buildRanking(new URLSearchParams({ amount: " 1 " }), []));
    const high = expectOk(buildRanking(new URLSearchParams({ amount: "1000000" }), []));
    expect(low.query.amountPln).toBe("1.00");
    expect(high.query.amountPln).toBe("1000000.00");
    expect(low.offers).toEqual([]);
    expect(httpStatusForRanking(high)).toBe(200);
  });
});

describe("period validation", () => {
  it("rejects a bad period instead of applying the default", () => {
    const result = buildRanking(new URLSearchParams({ amount: "1000", period: "0" }), [
      offer({ id: "should-not-rank" }),
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("PERIOD_INVALID");
    expect(result.error.field).toBe("period");
    expect(httpStatusForRanking(result)).toBe(400);
  });

  it.each(["-1", "1.5", "30.0", "abc", "3651"])("rejects period %s when the unit is days", (period) => {
    const result = buildRanking(new URLSearchParams({ amount: "1000", period }), []);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("PERIOD_INVALID");
  });

  it("rejects a month period above 120 and an unknown unit", () => {
    const months = buildRanking(
      new URLSearchParams({ amount: "1000", period: "121", periodUnit: "months" }),
      [],
    );
    expect(months.ok).toBe(false);
    if (!months.ok) expect(months.error.code).toBe("PERIOD_INVALID");

    const unit = buildRanking(
      new URLSearchParams({ amount: "1000", period: "30", periodUnit: "weeks" }),
      [offer()],
    );
    expect(unit.ok).toBe(false);
    if (!unit.ok) {
      expect(unit.error).toMatchObject({ code: "PERIOD_UNIT_INVALID", field: "periodUnit" });
    }
  });
});

describe("amount range filter", () => {
  const catalog = [
    offer({ id: "in", minAmountPln: 500, maxAmountPln: 5_000 }),
    offer({ id: "below", minAmountPln: 100, maxAmountPln: 499 }),
    offer({ id: "above", minAmountPln: 5_001, maxAmountPln: 9_000 }),
    offer({ id: "inactive", minAmountPln: 500, maxAmountPln: 5_000, active: false, interestRateBps: 0 }),
  ];

  it("keeps active offers whose inclusive range covers the amount", () => {
    expect(ids(expectOk(buildRanking(new URLSearchParams({ amount: "500" }), catalog)))).toEqual(["in"]);
    expect(ids(expectOk(buildRanking(new URLSearchParams({ amount: "5000" }), catalog)))).toEqual(["in"]);
    expect(ids(expectOk(buildRanking(new URLSearchParams({ amount: "499" }), catalog)))).toEqual(["below"]);
    expect(ids(expectOk(buildRanking(new URLSearchParams({ amount: "5001" }), catalog)))).toEqual(["above"]);
  });
});

describe("RRSO sort", () => {
  it("orders by lowest RRSO", () => {
    const params = new URLSearchParams({ amount: "1000", period: "365" });
    const result = expectOk(
      buildRanking(params, [
        offer({ id: "mid", interestRateBps: 1_000, affiliateUrl: "https://ads.example/mid" }),
        offer({ id: "high", interestRateBps: 2_000, affiliateUrl: "https://ads.example/top-placement" }),
        offer({ id: "low", interestRateBps: 0, affiliateUrl: null }),
      ]),
    );
    expect(result.offers.map((row) => [row.id, row.rrsoPercent])).toEqual([
      ["low", "0.00"],
      ["mid", "10.00"],
      ["high", "20.00"],
    ]);
    expect(result.criterion).toEqual({
      id: "lowest_rrso_then_total_cost",
      label: "Najniższe RRSO; przy równym RRSO najniższy koszt całkowity",
    });
  });
});

describe("RRSO tie broken by total cost", () => {
  it("ranks the cheaper offer first when displayed RRSO matches", () => {
    const params = new URLSearchParams({ amount: "1000", period: "365" });
    const result = expectOk(
      buildRanking(params, [
        offer({
          id: "dearer",
          partnerName: "Para Plus",
          interestRateBps: 0,
          fixedFeeGrosze: 10_001,
          affiliateUrl: "https://ads.example/premium",
        }),
        offer({
          id: "cheaper",
          partnerName: "Para",
          interestRateBps: 1_000,
          fixedFeeGrosze: 0,
          affiliateUrl: null,
        }),
      ]),
    );
    expect(result.offers.map((row) => [row.id, row.rrsoPercent, row.totalCostPln])).toEqual([
      ["cheaper", "10.00", "100.00"],
      ["dearer", "10.00", "100.01"],
    ]);
  });

  it("breaks a full tie by id and still ignores affiliate url", () => {
    const params = new URLSearchParams({ amount: "1000", period: "365" });
    const withAds = expectOk(
      buildRanking(params, [
        offer({ id: "b", affiliateUrl: "https://aaa.example/first" }),
        offer({ id: "a", affiliateUrl: "https://zzz.example/last" }),
      ]),
    );
    const swapped = expectOk(
      buildRanking(params, [
        offer({ id: "b", affiliateUrl: "https://zzz.example/last" }),
        offer({ id: "a", affiliateUrl: "https://aaa.example/first" }),
      ]),
    );
    expect(ids(withAds)).toEqual(["a", "b"]);
    expect(ids(swapped)).toEqual(["a", "b"]);
  });
});

describe("affiliate field does not affect sort", () => {
  it("keeps a worse paid offer behind a cheaper offer with no affiliate url", () => {
    const base = [
      offer({ id: "organic", interestRateBps: 0, affiliateUrl: null }),
      offer({
        id: "paid",
        interestRateBps: 2_000,
        affiliateUrl: "https://ads.example/top-placement",
      }),
    ];
    const flipped = base.map((row) =>
      row.id === "organic"
        ? { ...row, affiliateUrl: "https://ads.example/top-placement" }
        : { ...row, affiliateUrl: null },
    );
    const params = new URLSearchParams({ amount: "1000", period: "365" });
    expect(ids(expectOk(buildRanking(params, base)))).toEqual(["organic", "paid"]);
    expect(ids(expectOk(buildRanking(params, flipped)))).toEqual(["organic", "paid"]);
    const paid = expectOk(buildRanking(params, base)).offers[1];
    expect(paid.affiliateUrl).toBe("https://ads.example/top-placement");
  });
});

describe("optional period default", () => {
  const payday = offer({
    id: "pay",
    interestRateBps: 1_000,
    minPeriod: 7,
    maxPeriod: 60,
  });
  const installment = offer({
    id: "inst",
    productType: "installment",
    interestRateBps: 0,
    minAmountPln: 100,
    minPeriod: 3,
    maxPeriod: 24,
  });
  const tooShort = offer({ id: "short", minPeriod: 1, maxPeriod: 15 });

  it("prices payday offers at 30 days and installment offers at 12 months", () => {
    const amountOnly = expectOk(buildRanking(new URLSearchParams({ amount: "1200" }), [payday, installment, tooShort]));
    expect(amountOnly.query).toMatchObject({ amountPln: "1200.00", period: null, periodUnit: null });
    const byId = Object.fromEntries(amountOnly.offers.map((row) => [row.id, row]));
    expect(Object.keys(byId).sort()).toEqual(["inst", "pay"]);
    expect(byId.pay).toMatchObject({
      period: 30,
      periodUnit: "days",
      periodLabel: "30 dni",
      totalCostPln: "9.86",
      rrsoPercent: "10.47",
      installmentPln: null,
    });
    expect(byId.inst).toMatchObject({
      period: 12,
      periodUnit: "months",
      periodLabel: "12 miesięcy",
      installmentPln: "100.00",
      totalCostPln: "0.00",
      totalRepayPln: "1200.00",
      rrsoPercent: "0.00",
    });

    const explicitDays = expectOk(
      buildRanking(new URLSearchParams({ amount: "1200", period: "30" }), [payday, installment]),
    );
    expect(explicitDays.query).toMatchObject({ period: 30, periodUnit: "days" });
    expect(ids(explicitDays)).toEqual(["pay"]);
    expect(explicitDays.offers[0].totalCostPln).toBe(byId.pay.totalCostPln);
    expect(explicitDays.offers[0].rrsoPercent).toBe(byId.pay.rrsoPercent);
  });

  it("treats a blank period as omitted and a months unit as installment defaults", () => {
    const blank = expectOk(
      buildRanking(new URLSearchParams({ amount: "1200", period: "  " }), [payday, installment]),
    );
    expect(blank.query.period).toBeNull();
    expect(ids(blank).sort()).toEqual(["inst", "pay"]);

    const months = expectOk(
      buildRanking(new URLSearchParams({ amount: "1200", periodUnit: "months" }), [payday, installment]),
    );
    expect(months.query).toMatchObject({ period: null, periodUnit: "months" });
    expect(ids(months)).toEqual(["inst"]);
    expect(months.offers[0].period).toBe(12);
  });
});

describe("empty result", () => {
  it("returns an empty list and the dataset timestamp when nothing matches", () => {
    const result = expectOk(
      buildRanking(new URLSearchParams({ amount: "50" }), [
        offer({ id: "old", minAmountPln: 100, maxAmountPln: 200, updatedAt: new Date("2026-01-01T00:00:00.000Z") }),
        offer({
          id: "inactive-cheap",
          active: false,
          interestRateBps: 0,
          updatedAt: new Date("2026-11-05T12:00:00.000Z"),
        }),
      ]),
    );
    expect(result.offers).toEqual([]);
    expect(result.offersUpdatedAt).toBe("2026-11-05T12:00:00.000Z");
    expect(result.criterion.id).toBe("lowest_rrso_then_total_cost");
    expect(httpStatusForRanking(result)).toBe(200);
  });

  it("uses null when the catalog itself is empty", () => {
    const result = expectOk(buildRanking(new URLSearchParams({ amount: "1000" }), []));
    expect(result.offersUpdatedAt).toBeNull();
    expect(result.offers).toEqual([]);
  });
});

describe("installment rata", () => {
  it("is present only on pożyczka ratalna", () => {
    const payday = expectOk(
      buildRanking(new URLSearchParams({ amount: "1000", period: "30" }), [offer({ id: "pay" })]),
    );
    expect(payday.offers[0].installmentPln).toBeNull();
    expect(payday.offers[0].productType).toBe("payday");
    expect(payday.offers[0].productTypeLabel).toBe("chwilówka");

    const installment = expectOk(
      buildRanking(new URLSearchParams({ amount: "1200", period: "12", periodUnit: "months" }), [
        offer({
          id: "inst",
          productType: "installment",
          interestRateBps: 1_200,
          rateType: "variable",
          minPeriod: 1,
          maxPeriod: 36,
        }),
      ]),
    );
    expect(installment.offers[0]).toMatchObject({
      productType: "installment",
      productTypeLabel: "pożyczka ratalna",
      installmentPln: "106.62",
      totalCostPln: "79.44",
      totalRepayPln: "1279.44",
      rrsoPercent: "12.69",
      interestRatePercent: "12.00",
      rateType: "variable",
      rateTypeLabel: "zmienna",
    });
  });

  it("counts an upfront-with-first-rata fee in total cost and RRSO", () => {
    const result = expectOk(
      buildRanking(new URLSearchParams({ amount: "1200", period: "12", periodUnit: "months" }), [
        offer({
          id: "fee",
          productType: "installment",
          interestRateBps: 0,
          fixedFeeGrosze: 12_000,
          minPeriod: 1,
          maxPeriod: 36,
        }),
      ]),
    );
    expect(result.offers[0]).toMatchObject({
      installmentPln: "100.00",
      totalCostPln: "120.00",
      totalRepayPln: "1320.00",
      rrsoPercent: "21.42",
    });
  });
});

describe("pricing", () => {
  it("sums interest and fees into total cost for a payday offer", () => {
    const result = expectOk(
      buildRanking(new URLSearchParams({ amount: "1000", period: "365" }), [
        offer({
          id: "mix",
          partnerName: "Fala",
          logoUrl: "https://example.com/logos/fala.svg",
          interestRateBps: 1_000,
          commissionBps: 500,
          fixedFeeGrosze: 150,
          rateType: "fixed",
          affiliateUrl: "https://example.com/partner/fala",
        }),
      ]),
    );
    expect(result.offers[0]).toMatchObject({
      partnerName: "Fala",
      logoUrl: "https://example.com/logos/fala.svg",
      requestedAmountPln: "1000.00",
      period: 365,
      periodUnit: "days",
      periodLabel: "365 dni",
      interestRatePercent: "10.00",
      rateType: "fixed",
      rateTypeLabel: "stała",
      totalCostPln: "151.50",
      totalRepayPln: "1151.50",
      rrsoPercent: "15.15",
      installmentPln: null,
      affiliateUrl: "https://example.com/partner/fala",
    });
  });
});

function ids(result: { offers: { id: string }[] }): string[] {
  return result.offers.map((row) => row.id);
}
