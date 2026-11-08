/** Default amount shown in the form before the ranking returns. */
export const DEFAULT_AMOUNT = "2000";

/** One repayment period for the whole ranking. */
export const PERIOD_DAY_OPTIONS = [30, 60] as const;

export type PeriodDays = (typeof PERIOD_DAY_OPTIONS)[number];

export const DEFAULT_PERIOD_DAYS: PeriodDays = 30;

export const UNAVAILABLE_MESSAGE =
  "Ranking jest chwilowo niedostępny. Spróbuj ponownie za chwilę.";

export type RateType = "fixed" | "variable";

export type RankedOffer = {
  id: string;
  partnerName: string;
  productTypeLabel: string;
  requestedAmountPln: string;
  periodLabel: string;
  rrsoPercent: string;
  interestRatePercent: string;
  rateType: RateType;
  totalCostPln: string;
  totalRepayPln: string;
  installmentPln: string | null;
  affiliateUrl: string | null;
};

export type RankingView =
  | { kind: "loading" }
  | {
      kind: "offers";
      offers: RankedOffer[];
      amountPln: string;
      updatedAt: string | null;
    }
  | { kind: "empty"; amountPln: string }
  | { kind: "amount-error" }
  | { kind: "unavailable"; message: string };

const plnFormat = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormat = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormat = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function isPeriodDays(value: number): value is PeriodDays {
  return PERIOD_DAY_OPTIONS.some((days) => days === value);
}

/**
 * Query for GET /api/ranking. Always sends the single selected period.
 * Does not omit `period`.
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

export function rankingUrl(amount: string, periodDays: PeriodDays): string {
  const base = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
  const params = buildRankingQuery(amount, periodDays);
  return `${base}/api/ranking?${params.toString()}`;
}

export function formatPlnString(value: string): string {
  return plnFormat.format(Number(value));
}

export function formatPercentString(value: string): string {
  return `${percentFormat.format(Number(value))}%`;
}

export function formatUpdatedAt(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return dateFormat.format(date);
}

export function formatAmountInput(value: string): string {
  const digits = value.replace(/\s+/g, "").replace(/\.00$/, "");
  if (!/^\d+$/.test(digits)) return value;
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
}

export function interestPhrase(percent: string, rateType: RateType): string {
  const rate = formatPercentString(percent);
  switch (rateType) {
    case "fixed":
      return `${rate} stałe`;
    case "variable":
      return `${rate} zmienne`;
    default: {
      const exhaustive: never = rateType;
      return exhaustive;
    }
  }
}

export function capitalizeLabel(label: string): string {
  if (label.length === 0) return label;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

type FetchLike = (input: string) => Promise<Response>;

export async function fetchRanking(
  amount: string,
  periodDays: PeriodDays,
  fetchImpl: FetchLike = (input) => fetch(input),
): Promise<RankingView> {
  try {
    const response = await fetchImpl(rankingUrl(amount, periodDays));
    const body: unknown = await response.json().catch(() => null);
    return classifyRanking(response.status, body);
  } catch {
    return { kind: "unavailable", message: UNAVAILABLE_MESSAGE };
  }
}

/** Maps the ranking HTTP contract onto the screen states. Does not sort offers. */
export function classifyRanking(status: number, body: unknown): RankingView {
  if (status === 400) return { kind: "amount-error" };

  const code = errorCode(body);
  if (status === 503 || code === "OFFERS_UNAVAILABLE") {
    return { kind: "unavailable", message: UNAVAILABLE_MESSAGE };
  }

  if (status === 200) {
    const parsed = readSuccess(body);
    if (parsed) {
      if (parsed.offers.length === 0) {
        return { kind: "empty", amountPln: parsed.amountPln };
      }
      return {
        kind: "offers",
        offers: parsed.offers,
        amountPln: parsed.amountPln,
        updatedAt: parsed.updatedAt,
      };
    }
  }

  return { kind: "unavailable", message: UNAVAILABLE_MESSAGE };
}

function errorCode(body: unknown): string | null {
  if (!isRecord(body) || !isRecord(body.error)) return null;
  return typeof body.error.code === "string" ? body.error.code : null;
}

function readSuccess(body: unknown): {
  offers: RankedOffer[];
  amountPln: string;
  updatedAt: string | null;
} | null {
  if (!isRecord(body) || body.ok !== true || !Array.isArray(body.offers)) return null;
  if (!isRecord(body.query) || typeof body.query.amountPln !== "string") return null;

  const offers: RankedOffer[] = [];
  for (const item of body.offers) {
    const offer = readOffer(item);
    if (!offer) return null;
    offers.push(offer);
  }

  const updatedAt =
    typeof body.offersUpdatedAt === "string" || body.offersUpdatedAt === null
      ? body.offersUpdatedAt
      : null;

  return { offers, amountPln: body.query.amountPln, updatedAt };
}

function readOffer(value: unknown): RankedOffer | null {
  if (!isRecord(value)) return null;
  const rateType = value.rateType;
  if (rateType !== "fixed" && rateType !== "variable") return null;
  if (
    typeof value.id !== "string" ||
    typeof value.partnerName !== "string" ||
    typeof value.productTypeLabel !== "string" ||
    typeof value.requestedAmountPln !== "string" ||
    typeof value.periodLabel !== "string" ||
    typeof value.rrsoPercent !== "string" ||
    typeof value.interestRatePercent !== "string" ||
    typeof value.totalCostPln !== "string" ||
    typeof value.totalRepayPln !== "string"
  ) {
    return null;
  }
  if (typeof value.installmentPln !== "string" && value.installmentPln !== null) return null;
  if (typeof value.affiliateUrl !== "string" && value.affiliateUrl !== null) return null;

  return {
    id: value.id,
    partnerName: value.partnerName,
    productTypeLabel: value.productTypeLabel,
    requestedAmountPln: value.requestedAmountPln,
    periodLabel: value.periodLabel,
    rrsoPercent: value.rrsoPercent,
    interestRatePercent: value.interestRatePercent,
    rateType,
    totalCostPln: value.totalCostPln,
    totalRepayPln: value.totalRepayPln,
    installmentPln: value.installmentPln,
    affiliateUrl: value.affiliateUrl,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
