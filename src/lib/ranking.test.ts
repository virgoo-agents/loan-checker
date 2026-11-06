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

  it.each(["-1", "1.5", "12", "31", "90", "365", "30.0", "abc"])(
    "rejects period %s",
    (period) => {
      const result = buildRanking(new URLSearchParams({ amount: "1000", period }), [offer()]);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toMatchObject({
        code: "PERIOD_INVALID",
        field: "period",
        message: "Okres musi wynosić 30 albo 60 dni.",
      });
      expect(result).not.toHaveProperty("offers");
    },
  );

  it("rejects months and any unit other than days", () => {
    const twelveMonths = buildRanking(
      new URLSearchParams({ amount: "1000", period: "12", periodUnit: "months" }),
      [offer({ id: "should-not-rank", productType: "installment", minPeriod: 6, maxPeriod: 36 })],
    );
    expect(twelveMonths.ok).toBe(false);
    if (!twelveMonths.ok) {
      expect(twelveMonths.error).toMatchObject({ code: "PERIOD_UNIT_INVALID", field: "periodUnit" });
    }

    const monthsAlone = buildRanking(new URLSearchParams({ amount: "1000", periodUnit: "months" }), [offer()]);
    expect(monthsAlone.ok).toBe(false);
    if (!monthsAlone.ok) expect(monthsAlone.error.code).toBe("PERIOD_UNIT_INVALID");

    const weeks = buildRanking(
      new URLSearchParams({ amount: "1000", period: "30", periodUnit: "weeks" }),
      [offer()],
    );
    expect(weeks.ok).toBe(false);
    if (!weeks.ok) {
      expect(weeks.error).toMatchObject({
        code: "PERIOD_UNIT_INVALID",
        field: "periodUnit",
        message: "Jednostka okresu musi mieć wartość days.",
      });
    }
  });

  it("accepts 30 and 60 days with or without the unit", () => {
    const thirty = expectOk(buildRanking(new URLSearchParams({ amount: "1000", period: "30" }), [offer()]));
    const sixty = expectOk(
      buildRanking(new URLSearchParams({ amount: "1000", period: "60", periodUnit: "days" }), [offer()]),
    );
    expect(thirty.query).toMatchObject({ period: 30, periodUnit: "days" });
    expect(sixty.query).toMatchObject({ period: 60, periodUnit: "days" });
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
    const params = new URLSearchParams({ amount: "1000", period: "30" });
    const result = expectOk(
      buildRanking(params, [
        offer({ id: "mid", interestRateBps: 1_000, affiliateUrl: "https://ads.example/mid" }),
        offer({ id: "high", interestRateBps: 2_000, affiliateUrl: "https://ads.example/top-placement" }),
        offer({ id: "low", interestRateBps: 0, affiliateUrl: null }),
      ]),
    );
    expect(result.offers.map((row) => [row.id, row.rrsoPercent])).toEqual([
      ["low", "0.00"],
      ["mid", "10.47"],
      ["high", "21.94"],
    ]);
    expect(result.criterion).toEqual({
      id: "lowest_rrso_then_total_cost",
      label: "Najniższe RRSO; przy równym RRSO najniższy koszt całkowity",
    });
  });
});

describe("RRSO tie broken by total cost", () => {
  it("ranks the cheaper offer first when displayed RRSO matches", () => {
    const params = new URLSearchParams({ amount: "1000", period: "60" });
    const result = expectOk(
      buildRanking(params, [
        offer({
          id: "dearer",
          partnerName: "Para Plus",
          interestRateBps: 0,
          fixedFeeGrosze: 1_645,
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
      ["cheaper", "10.43", "16.44"],
      ["dearer", "10.43", "16.45"],
    ]);
  });

  it("breaks a full tie by id and still ignores affiliate url", () => {
    const params = new URLSearchParams({ amount: "1000", period: "30" });
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
    const params = new URLSearchParams({ amount: "1000", period: "30" });
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
    minPeriod: 1,
    maxPeriod: 2,
  });
  const tooLong = offer({
    id: "long",
    productType: "installment",
    interestRateBps: 0,
    minAmountPln: 100,
    minPeriod: 6,
    maxPeriod: 36,
  });
  const tooShort = offer({ id: "short", minPeriod: 1, maxPeriod: 15 });

  it("prices every matching offer for 30 days when period is omitted", () => {
    const amountOnly = expectOk(
      buildRanking(new URLSearchParams({ amount: "1200" }), [payday, installment, tooShort, tooLong]),
    );
    expect(amountOnly.query).toMatchObject({ amountPln: "1200.00", period: 30, periodUnit: "days" });
    const byId = Object.fromEntries(amountOnly.offers.map((row) => [row.id, row]));
    expect(Object.keys(byId).sort()).toEqual(["inst", "pay"]);
    expect(byId.long).toBeUndefined();
    expect(byId.pay).toMatchObject({
      period: 30,
      periodUnit: "days",
      periodLabel: "30 dni",
      totalCostPln: "9.86",
      rrsoPercent: "10.47",
      installmentPln: null,
    });
    expect(byId.inst).toMatchObject({
      period: 30,
      periodUnit: "days",
      periodLabel: "30 dni",
      installmentPln: "1200.00",
      totalCostPln: "0.00",
      totalRepayPln: "1200.00",
      rrsoPercent: "0.00",
      productType: "installment",
    });

    const explicitDays = expectOk(
      buildRanking(new URLSearchParams({ amount: "1200", period: "30" }), [payday, installment]),
    );
    expect(explicitDays.query).toMatchObject({ period: 30, periodUnit: "days" });
    expect(explicitDays.offers.map((row) => [row.id, row.period, row.periodUnit, row.totalCostPln])).toEqual([
      ["inst", 30, "days", byId.inst.totalCostPln],
      ["pay", 30, "days", byId.pay.totalCostPln],
    ]);
  });

  it("prices 60 days for offers that support two months or 60 days, and drops the rest", () => {
    const onlyThirty = offer({ id: "only30", minPeriod: 15, maxPeriod: 30, interestRateBps: 1_000 });
    const sixty = expectOk(
      buildRanking(new URLSearchParams({ amount: "1200", period: "60" }), [
        payday,
        onlyThirty,
        installment,
        tooLong,
      ]),
    );
    expect(sixty.query).toMatchObject({ period: 60, periodUnit: "days" });
    expect(ids(sixty).sort()).toEqual(["inst", "pay"]);
    expect(sixty.offers.every((row) => row.period === 60 && row.periodUnit === "days")).toBe(true);
    const inst = sixty.offers.find((row) => row.id === "inst");
    const pay = sixty.offers.find((row) => row.id === "pay");
    expect(inst).toMatchObject({ installmentPln: "600.00", totalCostPln: "0.00", totalRepayPln: "1200.00" });
    expect(pay?.installmentPln).toBeNull();
    expect(pay?.totalCostPln).toBe("19.73");
  });

  it("treats a blank period as 30 days", () => {
    const blank = expectOk(
      buildRanking(new URLSearchParams({ amount: "1200", period: "  " }), [payday, installment, tooLong]),
    );
    expect(blank.query).toMatchObject({ period: 30, periodUnit: "days" });
    expect(blank.offers.every((row) => row.period === 30 && row.periodUnit === "days")).toBe(true);
    expect(ids(blank).sort()).toEqual(["inst", "pay"]);
  });

  it("gives both product types the same total cost for the same rate and term", () => {
    const result = expectOk(
      buildRanking(new URLSearchParams({ amount: "1200", period: "60" }), [
        offer({ id: "pay", interestRateBps: 1_000, minPeriod: 1, maxPeriod: 60 }),
        offer({
          id: "inst",
          productType: "installment",
          interestRateBps: 1_000,
          minPeriod: 1,
          maxPeriod: 2,
        }),
      ]),
    );
    expect(result.offers.map((row) => [row.id, row.totalCostPln, row.rrsoPercent, row.period])).toEqual([
      ["inst", "19.73", "10.43", 60],
      ["pay", "19.73", "10.43", 60],
    ]);
    expect(result.offers[0]?.installmentPln).toBe("609.87");
    expect(result.offers[1]?.installmentPln).toBeNull();
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
      buildRanking(new URLSearchParams({ amount: "1200", period: "30" }), [
        offer({
          id: "inst",
          productType: "installment",
          interestRateBps: 1_200,
          rateType: "variable",
          minPeriod: 1,
          maxPeriod: 2,
        }),
      ]),
    );
    expect(installment.offers[0]).toMatchObject({
      productType: "installment",
      productTypeLabel: "pożyczka ratalna",
      installmentPln: "1211.84",
      totalCostPln: "11.84",
      totalRepayPln: "1211.84",
      rrsoPercent: "12.69",
      interestRatePercent: "12.00",
      rateType: "variable",
      rateTypeLabel: "zmienna",
    });
  });

  it("counts an upfront-with-first-rata fee in total cost and RRSO", () => {
    const result = expectOk(
      buildRanking(new URLSearchParams({ amount: "1200", period: "30" }), [
        offer({
          id: "fee",
          productType: "installment",
          interestRateBps: 0,
          fixedFeeGrosze: 12_000,
          minPeriod: 1,
          maxPeriod: 2,
        }),
      ]),
    );
    expect(result.offers[0]).toMatchObject({
      installmentPln: "1320.00",
      totalCostPln: "120.00",
      totalRepayPln: "1320.00",
      rrsoPercent: "218.87",
    });
  });
});

describe("pricing", () => {
  it("sums interest and fees into total cost for a payday offer", () => {
    const result = expectOk(
      buildRanking(new URLSearchParams({ amount: "1000", period: "30" }), [
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
      period: 30,
      periodUnit: "days",
      periodLabel: "30 dni",
      interestRatePercent: "10.00",
      rateType: "fixed",
      rateTypeLabel: "stała",
      totalCostPln: "59.72",
      totalRepayPln: "1059.72",
      rrsoPercent: "102.53",
      installmentPln: null,
      affiliateUrl: "https://example.com/partner/fala",
    });
  });
});

function ids(result: { offers: { id: string }[] }): string[] {
  return result.offers.map((row) => row.id);
}
