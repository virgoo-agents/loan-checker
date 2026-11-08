/**
 * Response types for the Next.js ranking screens.
 * Ordering and pricing are the Symfony API in `backend/`.
 */

export const RANKING_CRITERION = {
  id: "lowest_rrso_then_total_cost",
  label: "Najniższe RRSO; przy równym RRSO najniższy koszt całkowity",
} as const;

export type ProductType = "payday" | "installment";
export type PeriodUnit = "days" | "months";
export type RateType = "fixed" | "variable";

export type RankedOffer = {
  id: string;
  partnerName: string;
  logoUrl: string | null;
  productType: ProductType;
  productTypeLabel: "chwilówka" | "pożyczka ratalna";
  requestedAmountPln: string;
  period: number;
  periodUnit: PeriodUnit;
  periodLabel: string;
  rrsoPercent: string;
  interestRatePercent: string;
  rateType: RateType;
  rateTypeLabel: "stała" | "zmienna";
  totalCostPln: string;
  totalRepayPln: string;
  installmentPln: string | null;
  affiliateUrl: string | null;
};

export type RankingQuery = {
  amountPln: string;
  period: 30 | 60;
  periodUnit: "days";
};

export type RankingSuccess = {
  ok: true;
  criterion: typeof RANKING_CRITERION;
  offersUpdatedAt: string | null;
  query: RankingQuery;
  offers: RankedOffer[];
};

export type RankingErrorCode =
  | "AMOUNT_REQUIRED"
  | "AMOUNT_INVALID"
  | "PERIOD_INVALID"
  | "PERIOD_UNIT_INVALID"
  | "OFFERS_UNAVAILABLE";

export type RankingFailure = {
  ok: false;
  error: {
    code: RankingErrorCode;
    field: "amount" | "period" | "periodUnit" | "offers";
    message: string;
  };
};

export type RankingResult = RankingSuccess | RankingFailure;
