/**
 * Comparison pricing, not a statutory RRSO certificate. HTTP contract: README.
 * The form allows 30 or 60 days. Omitted period is 30 days for every offer.
 * Interest = amount × nominal annual × days / 365, half-up to the grosz.
 * Pożyczka ratalna shows an equal rata; chwilówka does not.
 * An offer is priced only when that term sits in its own period range
 * (days as stored, or 30 days → 1 month and 60 days → 2 months).
 * Sort key: RRSO rounded half-up to 0.01, then total cost, then id.
 * affiliateUrl is not a sort input.
 */

export const RANKING_CRITERION = {
  id: "lowest_rrso_then_total_cost",
  label: "Najniższe RRSO; przy równym RRSO najniższy koszt całkowity",
} as const;

const MAX_AMOUNT_PLN = 1_000_000;
const DEFAULT_PERIOD_DAYS = 30;

type AllowedPeriodDays = 30 | 60;

export type ProductType = "payday" | "installment";
export type PeriodUnit = "days" | "months";
export type RateType = "fixed" | "variable";

export type OfferInput = {
  id: string;
  partnerName: string;
  logoUrl: string | null;
  productType: ProductType;
  minAmountPln: number;
  maxAmountPln: number;
  minPeriod: number;
  maxPeriod: number;
  interestRateBps: number;
  rateType: RateType;
  commissionBps: number;
  fixedFeeGrosze: number;
  affiliateUrl: string | null;
  active: boolean;
  updatedAt: Date;
};

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
  period: AllowedPeriodDays;
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

type NormalizedQuery = {
  amountPln: number;
  period: AllowedPeriodDays;
  periodUnit: "days";
};

type Priced = {
  rrsoHundredths: number;
  totalCostGrosze: number;
  card: RankedOffer;
};

export function httpStatusForRanking(result: RankingResult): number {
  if (result.ok) return 200;
  switch (result.error.code) {
    case "OFFERS_UNAVAILABLE":
      return 503;
    case "AMOUNT_REQUIRED":
    case "AMOUNT_INVALID":
    case "PERIOD_INVALID":
    case "PERIOD_UNIT_INVALID":
      return 400;
    default: {
      const exhaustive: never = result.error.code;
      return exhaustive;
    }
  }
}

export function buildRanking(params: URLSearchParams, offers: OfferInput[]): RankingResult {
  const parsed = parseQuery(params);
  if (!parsed.ok) return parsed;

  const priced: Priced[] = [];
  for (const offer of offers) {
    if (!offer.active) continue;
    if (parsed.query.amountPln < offer.minAmountPln || parsed.query.amountPln > offer.maxAmountPln) {
      continue;
    }
    const period = periodForOffer(offer, parsed.query);
    if (period === null) continue;
    const row = priceOffer(offer, parsed.query.amountPln, period);
    if (row) priced.push(row);
  }
  priced.sort(comparePriced);

  return {
    ok: true,
    criterion: RANKING_CRITERION,
    offersUpdatedAt: latestUpdatedAt(offers),
    query: {
      amountPln: formatPln(parsed.query.amountPln * 100),
      period: parsed.query.period,
      periodUnit: parsed.query.periodUnit,
    },
    offers: priced.map((row) => row.card),
  };
}

function parseQuery(params: URLSearchParams): { ok: true; query: NormalizedQuery } | RankingFailure {
  const amountRaw = readParam(params, "amount");
  if (amountRaw === null) {
    return failure("AMOUNT_REQUIRED", "amount", "Podaj kwotę w złotych.");
  }
  const amount = parseStrictPositiveInt(amountRaw);
  if (amount === null || amount > MAX_AMOUNT_PLN) {
    return failure(
      "AMOUNT_INVALID",
      "amount",
      "Kwota musi być dodatnią liczbą całkowitą od 1 do 1000000 zł.",
    );
  }

  const unitRaw = readParam(params, "periodUnit");
  if (unitRaw !== null && unitRaw !== "days") {
    return failure("PERIOD_UNIT_INVALID", "periodUnit", "Jednostka okresu musi mieć wartość days.");
  }

  const periodRaw = readParam(params, "period");
  const period = periodRaw === null ? DEFAULT_PERIOD_DAYS : parseAllowedPeriod(periodRaw);
  if (period === null) {
    return failure("PERIOD_INVALID", "period", "Okres musi wynosić 30 albo 60 dni.");
  }

  return { ok: true, query: { amountPln: amount, period, periodUnit: "days" } };
}

function parseAllowedPeriod(raw: string): AllowedPeriodDays | null {
  const parsed = parseStrictPositiveInt(raw);
  if (parsed === 30 || parsed === 60) return parsed;
  return null;
}

function periodForOffer(offer: OfferInput, query: NormalizedQuery): AllowedPeriodDays | null {
  const supported = supportedTerm(offer.productType, query.period);
  if (supported < offer.minPeriod || supported > offer.maxPeriod) return null;
  return query.period;
}

function supportedTerm(productType: ProductType, periodDays: AllowedPeriodDays): number {
  switch (productType) {
    case "payday":
      return periodDays;
    case "installment":
      return monthsForDays(periodDays);
    default: {
      const exhaustive: never = productType;
      return exhaustive;
    }
  }
}

function monthsForDays(periodDays: AllowedPeriodDays): 1 | 2 {
  switch (periodDays) {
    case 30:
      return 1;
    case 60:
      return 2;
    default: {
      const exhaustive: never = periodDays;
      return exhaustive;
    }
  }
}

function priceOffer(offer: OfferInput, amountPln: number, period: AllowedPeriodDays): Priced | null {
  const amountGrosze = BigInt(amountPln) * 100n;
  switch (offer.productType) {
    case "payday":
      return pricePayday(offer, amountPln, amountGrosze, period);
    case "installment":
      return priceInstallmentDays(offer, amountPln, amountGrosze, period);
    default: {
      const exhaustive: never = offer.productType;
      return exhaustive;
    }
  }
}

function pricePayday(offer: OfferInput, amountPln: number, amountGrosze: bigint, days: number): Priced | null {
  const interest = divRound(
    amountGrosze * BigInt(offer.interestRateBps) * BigInt(days),
    10_000n * 365n,
  );
  const fee = feeGrosze(offer, amountGrosze);
  const totalCost = interest + fee;
  const totalRepay = amountGrosze + totalCost;
  const ratio = Number(totalRepay) / Number(amountGrosze);
  const rrso = totalCost === 0n ? 0 : ratio ** (365 / days) - 1;
  return toPriced(offer, amountPln, days, "days", totalCost, totalRepay, null, rrso);
}

function priceInstallmentDays(
  offer: OfferInput,
  amountPln: number,
  amountGrosze: bigint,
  days: number,
): Priced | null {
  const interest = divRound(
    amountGrosze * BigInt(offer.interestRateBps) * BigInt(days),
    10_000n * 365n,
  );
  const fee = feeGrosze(offer, amountGrosze);
  const totalCost = interest + fee;
  const totalRepay = amountGrosze + totalCost;
  const payments = Math.max(1, Math.round(days / 30));
  let rata = divRound(totalRepay, BigInt(payments));
  if (rata * BigInt(payments) < totalRepay) rata += 1n;
  const ratio = Number(totalRepay) / Number(amountGrosze);
  const rrso = totalCost === 0n ? 0 : ratio ** (365 / days) - 1;
  return toPriced(offer, amountPln, days, "days", totalCost, totalRepay, rata, rrso);
}

function feeGrosze(offer: OfferInput, amountGrosze: bigint): bigint {
  return divRound(amountGrosze * BigInt(offer.commissionBps), 10_000n) + BigInt(offer.fixedFeeGrosze);
}

function toPriced(
  offer: OfferInput,
  amountPln: number,
  period: number,
  periodUnit: PeriodUnit,
  totalCost: bigint,
  totalRepay: bigint,
  installment: bigint | null,
  rrso: number,
): Priced | null {
  if (!Number.isFinite(rrso)) return null;
  const rrsoHundredths = Math.round(rrso * 10_000);
  const totalCostGrosze = Number(totalCost);
  const totalRepayGrosze = Number(totalRepay);
  const installmentGrosze = installment === null ? null : Number(installment);
  if (
    !Number.isSafeInteger(rrsoHundredths) ||
    !Number.isSafeInteger(totalCostGrosze) ||
    !Number.isSafeInteger(totalRepayGrosze) ||
    (installmentGrosze !== null && !Number.isSafeInteger(installmentGrosze))
  ) {
    return null;
  }

  return {
    rrsoHundredths,
    totalCostGrosze,
    card: {
      id: offer.id,
      partnerName: offer.partnerName,
      logoUrl: offer.logoUrl,
      productType: offer.productType,
      productTypeLabel: productLabel(offer.productType),
      requestedAmountPln: formatPln(amountPln * 100),
      period,
      periodUnit,
      periodLabel: formatPeriod(period, periodUnit),
      rrsoPercent: formatPercentHundredths(rrsoHundredths),
      interestRatePercent: formatBps(offer.interestRateBps),
      rateType: offer.rateType,
      rateTypeLabel: rateLabel(offer.rateType),
      totalCostPln: formatPln(totalCostGrosze),
      totalRepayPln: formatPln(totalRepayGrosze),
      installmentPln: installmentGrosze === null ? null : formatPln(installmentGrosze),
      affiliateUrl: offer.affiliateUrl,
    },
  };
}

function comparePriced(a: Priced, b: Priced): number {
  if (a.rrsoHundredths !== b.rrsoHundredths) return a.rrsoHundredths - b.rrsoHundredths;
  if (a.totalCostGrosze !== b.totalCostGrosze) return a.totalCostGrosze - b.totalCostGrosze;
  if (a.card.id < b.card.id) return -1;
  if (a.card.id > b.card.id) return 1;
  return 0;
}

function latestUpdatedAt(offers: OfferInput[]): string | null {
  if (offers.length === 0) return null;
  let latest = offers[0]?.updatedAt.getTime() ?? 0;
  for (const offer of offers) {
    const time = offer.updatedAt.getTime();
    if (time > latest) latest = time;
  }
  return new Date(latest).toISOString();
}

function divRound(numer: bigint, denom: bigint): bigint {
  return (numer + denom / 2n) / denom;
}

function readParam(params: URLSearchParams, key: string): string | null {
  const raw = params.get(key);
  if (raw === null) return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

function parseStrictPositiveInt(raw: string): number | null {
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

function productLabel(productType: ProductType): RankedOffer["productTypeLabel"] {
  switch (productType) {
    case "payday":
      return "chwilówka";
    case "installment":
      return "pożyczka ratalna";
    default: {
      const exhaustive: never = productType;
      return exhaustive;
    }
  }
}

function rateLabel(rateType: RateType): RankedOffer["rateTypeLabel"] {
  switch (rateType) {
    case "fixed":
      return "stała";
    case "variable":
      return "zmienna";
    default: {
      const exhaustive: never = rateType;
      return exhaustive;
    }
  }
}

function formatPeriod(period: number, unit: PeriodUnit): string {
  switch (unit) {
    case "days":
      return polishCount(period, "dzień", "dni", "dni");
    case "months":
      return polishCount(period, "miesiąc", "miesiące", "miesięcy");
    default: {
      const exhaustive: never = unit;
      return exhaustive;
    }
  }
}

function polishCount(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} ${few}`;
  return `${count} ${many}`;
}

function formatBps(bps: number): string {
  const sign = bps < 0 ? "-" : "";
  const abs = Math.abs(bps);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

function formatPercentHundredths(hundredths: number): string {
  const sign = hundredths < 0 ? "-" : "";
  const abs = Math.abs(hundredths);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

function formatPln(grosze: number): string {
  const sign = grosze < 0 ? "-" : "";
  const abs = Math.abs(grosze);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

function failure(
  code: RankingFailure["error"]["code"],
  field: RankingFailure["error"]["field"],
  message: string,
): RankingFailure {
  return { ok: false, error: { code, field, message } };
}
