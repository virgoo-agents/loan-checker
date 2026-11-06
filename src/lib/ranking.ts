/**
 * Comparison pricing, not a statutory RRSO certificate. HTTP contract: README.
 * One period for the whole ranking. Omitted period is 30 days for every offer.
 * A day term prices both products with interest = amount × nominal annual × days / 365.
 * Pożyczka ratalna still shows an equal rata; chwilówka does not.
 * An explicit month term uses the annuity for ratalne and the same month count for chwilówki.
 * Sort key: RRSO rounded half-up to 0.01, then total cost, then id.
 * affiliateUrl is not a sort input.
 */

export const RANKING_CRITERION = {
  id: "lowest_rrso_then_total_cost",
  label: "Najniższe RRSO; przy równym RRSO najniższy koszt całkowity",
} as const;

const MAX_AMOUNT_PLN = 1_000_000;
const MAX_PERIOD = { days: 3650, months: 120 } as const;
const DEFAULT_PERIOD_DAYS = 30;

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
  period: number;
  periodUnit: PeriodUnit;
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
  period: number;
  periodUnit: PeriodUnit;
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
    const row = priceOffer(offer, parsed.query.amountPln, period, parsed.query.periodUnit);
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
  let periodUnit: PeriodUnit | null = null;
  if (unitRaw !== null) {
    if (!isPeriodUnit(unitRaw)) {
      return failure(
        "PERIOD_UNIT_INVALID",
        "periodUnit",
        "Jednostka okresu musi mieć wartość days albo months.",
      );
    }
    periodUnit = unitRaw;
  }

  const periodRaw = readParam(params, "period");
  let period: number | null = null;
  if (periodRaw !== null) {
    const unitForLimit = periodUnit ?? "days";
    const parsedPeriod = parseStrictPositiveInt(periodRaw);
    if (parsedPeriod === null || parsedPeriod > maxPeriod(unitForLimit)) {
      return failure(
        "PERIOD_INVALID",
        "period",
        "Okres musi być dodatnią liczbą całkowitą (do 3650 dni albo 120 miesięcy).",
      );
    }
    period = parsedPeriod;
    if (periodUnit === null) periodUnit = "days";
  } else {
    period = DEFAULT_PERIOD_DAYS;
    periodUnit = "days";
  }

  return { ok: true, query: { amountPln: amount, period, periodUnit } };
}

function periodForOffer(offer: OfferInput, query: NormalizedQuery): number | null {
  if (unitOf(offer.productType) === query.periodUnit) {
    if (query.period < offer.minPeriod || query.period > offer.maxPeriod) return null;
  }
  return query.period;
}

function priceOffer(
  offer: OfferInput,
  amountPln: number,
  period: number,
  unit: PeriodUnit,
): Priced | null {
  if (period < 1) return null;
  const amountGrosze = BigInt(amountPln) * 100n;
  switch (offer.productType) {
    case "payday":
      return pricePaydayFor(offer, amountPln, amountGrosze, period, unit);
    case "installment":
      return priceInstallmentFor(offer, amountPln, amountGrosze, period, unit);
    default: {
      const exhaustive: never = offer.productType;
      return exhaustive;
    }
  }
}

function pricePaydayFor(
  offer: OfferInput,
  amountPln: number,
  amountGrosze: bigint,
  period: number,
  unit: PeriodUnit,
): Priced | null {
  switch (unit) {
    case "days":
      return pricePayday(offer, amountPln, amountGrosze, period);
    case "months":
      return pricePaydayMonths(offer, amountPln, amountGrosze, period);
    default: {
      const exhaustive: never = unit;
      return exhaustive;
    }
  }
}

function priceInstallmentFor(
  offer: OfferInput,
  amountPln: number,
  amountGrosze: bigint,
  period: number,
  unit: PeriodUnit,
): Priced | null {
  switch (unit) {
    case "days":
      return priceInstallmentDays(offer, amountPln, amountGrosze, period);
    case "months":
      return priceInstallment(offer, amountPln, amountGrosze, period);
    default: {
      const exhaustive: never = unit;
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

function pricePaydayMonths(
  offer: OfferInput,
  amountPln: number,
  amountGrosze: bigint,
  months: number,
): Priced | null {
  const interest = divRound(
    amountGrosze * BigInt(offer.interestRateBps) * BigInt(months),
    10_000n * 12n,
  );
  const fee = feeGrosze(offer, amountGrosze);
  const totalCost = interest + fee;
  const totalRepay = amountGrosze + totalCost;
  const ratio = Number(totalRepay) / Number(amountGrosze);
  const rrso = totalCost === 0n ? 0 : ratio ** (12 / months) - 1;
  return toPriced(offer, amountPln, months, "months", totalCost, totalRepay, null, rrso);
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

function priceInstallment(
  offer: OfferInput,
  amountPln: number,
  amountGrosze: bigint,
  months: number,
): Priced | null {
  let rata = annuityGrosze(amountGrosze, offer.interestRateBps, months);
  if (rata * BigInt(months) < amountGrosze) rata += 1n;
  const fee = feeGrosze(offer, amountGrosze);
  const interest = rata * BigInt(months) - amountGrosze;
  const totalCost = interest + fee;
  const totalRepay = amountGrosze + totalCost;
  const rrso =
    totalCost === 0n ? 0 : solveRrso(Number(amountGrosze), installmentPayments(rata, fee, months));
  return toPriced(offer, amountPln, months, "months", totalCost, totalRepay, rata, rrso);
}

function installmentPayments(rata: bigint, fee: bigint, months: number): { t: number; grosze: number }[] {
  const payments: { t: number; grosze: number }[] = [];
  for (let month = 1; month <= months; month += 1) {
    payments.push({
      t: month / 12,
      grosze: Number(rata) + (month === 1 ? Number(fee) : 0),
    });
  }
  return payments;
}

function annuityGrosze(principal: bigint, annualBps: number, months: number): bigint {
  if (annualBps === 0) return divRound(principal, BigInt(months));
  const monthly = annualBps / 10_000 / 12;
  const growth = (1 + monthly) ** months;
  return BigInt(Math.round((Number(principal) * monthly * growth) / (growth - 1)));
}

// ponytail: IEEE Newton IRR, stable to 0.01 pp on these loan sizes; use a decimal solver if a statutory certificate needs bit-exact rounding.
function solveRrso(principalGrosze: number, payments: { t: number; grosze: number }[]): number {
  let rate = 0.1;
  for (let iteration = 0; iteration < 80; iteration += 1) {
    let value = -principalGrosze;
    let slope = 0;
    for (const payment of payments) {
      const discount = (1 + rate) ** payment.t;
      value += payment.grosze / discount;
      slope += (-payment.t * payment.grosze) / (1 + rate) ** (payment.t + 1);
    }
    if (!Number.isFinite(value) || !Number.isFinite(slope) || slope === 0) break;
    const next = rate - value / slope;
    if (!Number.isFinite(next) || next <= -0.999999) break;
    if (Math.abs(next - rate) < 1e-12) return next;
    rate = next;
  }
  return rate;
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

function isPeriodUnit(value: string): value is PeriodUnit {
  return value === "days" || value === "months";
}

function unitOf(productType: ProductType): PeriodUnit {
  switch (productType) {
    case "payday":
      return "days";
    case "installment":
      return "months";
    default: {
      const exhaustive: never = productType;
      return exhaustive;
    }
  }
}

function maxPeriod(unit: PeriodUnit): number {
  switch (unit) {
    case "days":
      return MAX_PERIOD.days;
    case "months":
      return MAX_PERIOD.months;
    default: {
      const exhaustive: never = unit;
      return exhaustive;
    }
  }
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
