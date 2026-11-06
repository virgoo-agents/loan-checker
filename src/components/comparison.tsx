"use client";

import { useState, type FormEvent } from "react";
import { OfferCard } from "@/components/offer-card";
import { formatAmountInput, formatPlnString, formatUpdatedAt } from "@/lib/money-format";
import {
  buildRankingQuery,
  PERIOD_DAY_OPTIONS,
  type PeriodDays,
} from "@/lib/ranking-request";
import type { RankingResult } from "@/lib/ranking";

interface ComparisonProps {
  initialResult: RankingResult;
  defaultAmount: string;
  defaultPeriodDays: PeriodDays;
}

const fieldClassName =
  "h-14 w-full rounded-xl border bg-cream px-4 text-base text-ink outline-none transition focus:border-pine";

function isPeriodDays(value: number): value is PeriodDays {
  return PERIOD_DAY_OPTIONS.some((days) => days === value);
}

const unavailable: RankingResult = {
  ok: false,
  error: {
    code: "OFFERS_UNAVAILABLE",
    field: "offers",
    message: "Nie udało się wczytać ofert. Spróbuj ponownie.",
  },
};

export function Comparison({
  initialResult,
  defaultAmount,
  defaultPeriodDays,
}: ComparisonProps) {
  const [amountInput, setAmountInput] = useState(formatAmountInput(defaultAmount));
  const [periodDays, setPeriodDays] = useState<PeriodDays>(defaultPeriodDays);
  const [result, setResult] = useState(initialResult);
  const [pending, setPending] = useState(false);

  async function loadRanking(amount: string, period: PeriodDays) {
    setPending(true);
    try {
      const params = buildRankingQuery(amount, period);
      const response = await fetch(`/api/ranking?${params.toString()}`);
      const body = (await response.json()) as RankingResult;
      setResult(body);
      if (body.ok) {
        setAmountInput(formatAmountInput(body.query.amountPln));
      }
    } catch {
      setResult(unavailable);
    } finally {
      setPending(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadRanking(amountInput, periodDays);
  }

  function onPeriodChange(value: string) {
    const nextPeriod = Number(value);
    if (!isPeriodDays(nextPeriod)) return;
    setPeriodDays(nextPeriod);
    void loadRanking(amountInput, nextPeriod);
  }

  const amountError = !result.ok && result.error.field === "amount";
  const updatedAt = result.ok ? formatUpdatedAt(result.offersUpdatedAt) : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-6 md:py-12">
      <section className="flex flex-col gap-6">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-tight text-ink md:text-5xl">
            Porównaj chwilówki i pożyczki
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-ink/70 md:text-lg">
            Podaj kwotę i wybierz okres spłaty: 30 albo 60 dni. Ranking odświeża się od razu.
            Bez rejestracji, bez logowania.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-[28px] bg-white p-3 shadow-[0_10px_30px_rgba(20,36,28,0.05)] md:p-4"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <label className="block min-w-0 flex-1">
              <span className="mb-1.5 block px-1 text-sm font-medium text-ink/80">Kwota</span>
              <span className="relative block">
                <input
                  value={amountInput}
                  onChange={(event) => setAmountInput(event.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                  aria-invalid={amountError}
                  aria-describedby={amountError ? "amount-error" : undefined}
                  className={`${fieldClassName} pr-12 ${
                    amountError ? "border-danger bg-danger-soft text-danger" : "border-ink/10"
                  }`}
                />
                <span
                  className={`pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm ${
                    amountError ? "text-danger" : "text-ink/50"
                  }`}
                >
                  zł
                </span>
              </span>
              {amountError ? (
                <span id="amount-error" role="alert" className="mt-2 block px-1 text-sm text-danger">
                  Podaj kwotę całkowitą w złotych, na przykład 2&nbsp;000. Ranking liczymy dopiero po
                  poprawnej kwocie.
                </span>
              ) : null}
            </label>

            <label className="block min-w-0 flex-1">
              <span className="mb-1.5 block px-1 text-sm font-medium text-ink/80">
                Okres spłaty
              </span>
              <select
                value={String(periodDays)}
                onChange={(event) => onPeriodChange(event.target.value)}
                className={`${fieldClassName} border-ink/10`}
              >
                {PERIOD_DAY_OPTIONS.map((days) => (
                  <option key={days} value={days}>
                    {days} dni
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={pending}
              className="h-14 rounded-xl bg-pine px-6 text-base font-semibold text-white hover:bg-pine-dark disabled:opacity-70 md:shrink-0"
            >
              {pending ? "Szukam ofert…" : "Porównaj oferty"}
            </button>
          </div>
        </form>
      </section>

      <section aria-live="polite" aria-busy={pending} className="flex flex-col gap-4">
        {result.ok && result.offers.length > 0 ? (
          <>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-ink">Ranking ofert</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/70 md:text-base">
                Układamy od najniższego RRSO, przy remisie od najniższego kosztu całkowitego.
                {updatedAt ? ` Ostatnia aktualizacja danych: ${updatedAt}.` : null}
              </p>
            </div>
            <ol className="flex flex-col gap-3">
              {result.offers.map((offer, index) => (
                <li key={offer.id}>
                  <OfferCard offer={offer} rank={index + 1} highlighted={index === 0} />
                </li>
              ))}
            </ol>
          </>
        ) : null}

        {!result.ok && result.error.field === "amount" ? (
          <p className="rounded-2xl bg-white px-5 py-6 text-base text-ink/75">
            Ranking pojawi się, gdy podasz poprawną kwotę.
          </p>
        ) : null}

        {!result.ok && result.error.field !== "amount" ? (
          <p role="alert" className="rounded-2xl bg-white px-5 py-6 text-base text-ink/75">
            {result.error.message}
          </p>
        ) : null}

        {result.ok && result.offers.length === 0 ? (
          <div className="rounded-2xl bg-white px-5 py-6">
            <h2 className="text-lg font-semibold text-ink">
              Nie znaleźliśmy ofert dla {formatPlnString(result.query.amountPln)}
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink/70 md:text-base">
              Żadna oferta z listy nie obsługuje tej kwoty. Spróbuj inną kwotę, żeby zobaczyć ranking.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
