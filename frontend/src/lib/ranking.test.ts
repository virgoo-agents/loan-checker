import { describe, expect, it } from "vitest";
import {
  buildRankingQuery,
  classifyRanking,
  fetchRanking,
  formatAmountInput,
  interestPhrase,
  PERIOD_DAY_OPTIONS,
  UNAVAILABLE_MESSAGE,
  type RankedOffer,
} from "./ranking";

function offer(overrides: Partial<RankedOffer> & Pick<RankedOffer, "id">): RankedOffer {
  return {
    partnerName: overrides.id,
    productTypeLabel: "chwilówka",
    requestedAmountPln: "2000.00",
    periodLabel: "30 dni",
    rrsoPercent: "10.00",
    interestRatePercent: "0.00",
    rateType: "fixed",
    totalCostPln: "10.00",
    totalRepayPln: "2010.00",
    installmentPln: null,
    affiliateUrl: null,
    ...overrides,
  };
}

function success(offers: RankedOffer[], amountPln = "2000.00") {
  return {
    ok: true,
    criterion: { id: "lowest_rrso_then_total_cost", label: "Najniższe RRSO" },
    offersUpdatedAt: "2026-11-06T12:00:00.000Z",
    query: { amountPln, period: 30, periodUnit: "days" },
    offers,
  };
}

describe("buildRankingQuery", () => {
  it("always sends one period in days and strips spaces from the amount", () => {
    const params = buildRankingQuery("2\u00a0000", 30);
    expect(params.get("amount")).toBe("2000");
    expect(params.get("period")).toBe("30");
    expect(params.get("periodUnit")).toBe("days");
    expect(params.has("period")).toBe(true);
  });

  it("sends 60 days and still includes period when the amount is blank", () => {
    const params = buildRankingQuery("   ", 60);
    expect(params.has("amount")).toBe(false);
    expect(params.get("period")).toBe("60");
    expect(params.get("periodUnit")).toBe("days");
  });

  it("exposes only the two period options", () => {
    expect([...PERIOD_DAY_OPTIONS]).toEqual([30, 60]);
  });
});

describe("classifyRanking", () => {
  it("maps 400 to the amount error state", () => {
    expect(classifyRanking(400, { ok: false, error: { code: "AMOUNT_INVALID" } })).toEqual({
      kind: "amount-error",
    });
    expect(classifyRanking(400, null)).toEqual({ kind: "amount-error" });
  });

  it("maps an empty 200 list to the no-offers state", () => {
    expect(classifyRanking(200, success([]))).toEqual({
      kind: "empty",
      amountPln: "2000.00",
    });
  });

  it("keeps the API order, including when a later card has an affiliate link", () => {
    const first = offer({ id: "para", affiliateUrl: null, rrsoPercent: "40.00" });
    const second = offer({
      id: "para-plus",
      affiliateUrl: "https://example.com/partner/para-plus",
      rrsoPercent: "10.00",
    });
    const view = classifyRanking(200, success([first, second]));
    expect(view.kind).toBe("offers");
    if (view.kind !== "offers") return;
    expect(view.offers.map((item) => item.id)).toEqual(["para", "para-plus"]);
  });

  it("maps 503 and OFFERS_UNAVAILABLE to the unavailable message", () => {
    const expected = { kind: "unavailable", message: UNAVAILABLE_MESSAGE };
    expect(
      classifyRanking(503, {
        ok: false,
        error: { code: "OFFERS_UNAVAILABLE", field: "offers", message: "db down" },
      }),
    ).toEqual(expected);
    expect(
      classifyRanking(200, {
        ok: false,
        error: { code: "OFFERS_UNAVAILABLE", field: "offers", message: "db down" },
      }),
    ).toEqual(expected);
  });
});

describe("fetchRanking", () => {
  it("calls relative /api/ranking and preserves the returned order", async () => {
    const urls: string[] = [];
    const view = await fetchRanking("2 000", 60, async (input) => {
      urls.push(input);
      const higherFirst = offer({ id: "higher", rrsoPercent: "80.00", affiliateUrl: null });
      const linked = offer({
        id: "linked",
        rrsoPercent: "1.00",
        affiliateUrl: "https://example.com/go",
      });
      return new Response(JSON.stringify(success([higherFirst, linked], "2000.00")), {
        status: 200,
      });
    });

    expect(urls).toEqual(["/api/ranking?amount=2000&period=60&periodUnit=days"]);
    expect(view.kind).toBe("offers");
    if (view.kind !== "offers") return;
    expect(view.offers.map((item) => item.id)).toEqual(["higher", "linked"]);
  });

  it("turns a network failure into the unavailable state", async () => {
    const view = await fetchRanking("2000", 30, async () => {
      throw new Error("offline");
    });
    expect(view).toEqual({ kind: "unavailable", message: UNAVAILABLE_MESSAGE });
  });
});

describe("display helpers", () => {
  it("groups the example amount and labels the rate", () => {
    expect(formatAmountInput("2000")).toBe("2\u00a0000");
    expect(formatAmountInput("2000.00")).toBe("2\u00a0000");
    expect(interestPhrase("10.00", "fixed")).toMatch(/stałe$/);
    expect(interestPhrase("10.00", "variable")).toMatch(/zmienne$/);
  });
});
