import type { RateType } from "@/lib/ranking";

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
