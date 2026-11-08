import { Suspense } from "react";
import { connection } from "next/server";
import { Comparison } from "@/components/comparison";
import { Faq } from "@/components/faq";
import { HowItWorks } from "@/components/how-it-works";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { DEFAULT_AMOUNT, DEFAULT_PERIOD_DAYS } from "@/lib/ranking-request";
import type { RankingResult } from "@/lib/ranking";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Suspense fallback={<RankingFallback />}>
          <InitialRanking />
        </Suspense>
        <HowItWorks />
        <Faq />
      </main>
      <SiteFooter />
    </>
  );
}

async function InitialRanking() {
  await connection();
  const initialResult = loadInitialRanking();
  return (
    <Comparison
      initialResult={initialResult}
      defaultAmount={DEFAULT_AMOUNT}
      defaultPeriodDays={DEFAULT_PERIOD_DAYS}
    />
  );
}

function RankingFallback() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <h1 className="text-4xl font-semibold tracking-tight text-ink md:text-5xl">
        Porównaj chwilówki i pożyczki
      </h1>
      <p className="mt-3 text-base text-ink/70">Wczytuję ranking…</p>
    </div>
  );
}

function loadInitialRanking(): RankingResult {
  return {
    ok: false,
    error: {
      code: "OFFERS_UNAVAILABLE",
      field: "offers",
      message: "Nie udało się wczytać ofert. Spróbuj ponownie.",
    },
  };
}
