/** Default amount shown in the form and rendered on the first HTML response. */
export const DEFAULT_AMOUNT = "2000";

/** One repayment period for the whole ranking. Days, not per-product defaults. */
export const PERIOD_DAY_OPTIONS = [30, 60] as const;

export type PeriodDays = (typeof PERIOD_DAY_OPTIONS)[number];

export const DEFAULT_PERIOD_DAYS: PeriodDays = 30;

/**
 * Query for `loadRanking` and `GET /api/ranking`.
 * Always sends the form's single period in days so every card is priced for
 * that same period. Does not omit `period`.
 */
export function buildRankingQuery(amount: string, periodDays: PeriodDays): URLSearchParams {
  const params = new URLSearchParams();
  const compactAmount = amount.trim().replace(/\s+/g, "");
  if (compactAmount !== "") {
    params.set("amount", compactAmount);
  }
  params.set("period", String(periodDays));
  params.set("periodUnit", "days");
  return params;
}
