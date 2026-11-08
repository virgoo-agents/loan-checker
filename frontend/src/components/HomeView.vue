<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Faq from "./Faq.vue";
import HowItWorks from "./HowItWorks.vue";
import OfferCard from "./OfferCard.vue";
import {
  DEFAULT_AMOUNT,
  DEFAULT_PERIOD_DAYS,
  PERIOD_DAY_OPTIONS,
  fetchRanking,
  formatAmountInput,
  formatPlnString,
  formatUpdatedAt,
  isPeriodDays,
  type PeriodDays,
  type RankingView,
} from "../lib/ranking";

const fieldClass =
  "h-14 w-full rounded-xl border bg-cream px-4 text-base text-ink outline-none transition focus:border-pine";

const amountInput = ref(formatAmountInput(DEFAULT_AMOUNT));
const periodDays = ref<PeriodDays>(DEFAULT_PERIOD_DAYS);
const view = ref<RankingView>({ kind: "loading" });

let requestSeq = 0;

const amountError = computed(() => view.value.kind === "amount-error");
const updatedLabel = computed(() =>
  view.value.kind === "offers" ? formatUpdatedAt(view.value.updatedAt) : null,
);

async function load(amount: string, period: PeriodDays) {
  const seq = ++requestSeq;
  view.value = { kind: "loading" };
  const next = await fetchRanking(amount, period);
  if (seq !== requestSeq) return;
  view.value = next;
  if (next.kind === "offers" || next.kind === "empty") {
    amountInput.value = formatAmountInput(next.amountPln);
  }
}

function onSubmit(event: Event) {
  event.preventDefault();
  void load(amountInput.value, periodDays.value);
}

function onPeriodChange(event: Event) {
  const next = Number((event.target as HTMLSelectElement).value);
  if (!isPeriodDays(next)) return;
  periodDays.value = next;
  void load(amountInput.value, next);
}

onMounted(() => {
  void load(amountInput.value, periodDays.value);
});
</script>

<template>
  <main class="flex-1">
    <div class="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-6 md:py-12">
      <section class="flex flex-col gap-6">
        <div class="max-w-3xl">
          <h1 class="text-4xl font-semibold tracking-tight text-ink md:text-5xl">
            Porównaj chwilówki i pożyczki
          </h1>
          <p class="mt-3 max-w-2xl text-base leading-7 text-ink/70 md:text-lg">
            Podaj kwotę i wybierz okres spłaty: 30 albo 60 dni. Ranking odświeża się od razu. Bez
            rejestracji, bez logowania.
          </p>
        </div>

        <form
          class="rounded-[28px] bg-white p-3 shadow-[0_10px_30px_rgba(20,36,28,0.05)] md:p-4"
          @submit="onSubmit"
        >
          <div class="flex flex-col gap-3 md:flex-row md:items-end">
            <label class="block min-w-0 flex-1">
              <span class="mb-1.5 block px-1 text-sm font-medium text-ink/80">Kwota</span>
              <span class="relative block">
                <input
                  v-model="amountInput"
                  inputmode="numeric"
                  autocomplete="off"
                  :aria-invalid="amountError"
                  :aria-describedby="amountError ? 'amount-error' : undefined"
                  class="pr-12"
                  :class="[
                    fieldClass,
                    amountError ? 'border-danger bg-danger-soft text-danger' : 'border-ink/10',
                  ]"
                />
                <span
                  class="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm"
                  :class="amountError ? 'text-danger' : 'text-ink/50'"
                >
                  zł
                </span>
              </span>
              <span
                v-if="amountError"
                id="amount-error"
                role="alert"
                class="mt-2 block px-1 text-sm text-danger"
              >
                Podaj kwotę całkowitą w złotych, na przykład 2&nbsp;000. Ranking liczymy dopiero po
                poprawnej kwocie.
              </span>
            </label>

            <label class="block min-w-0 flex-1">
              <span class="mb-1.5 block px-1 text-sm font-medium text-ink/80">Okres spłaty</span>
              <select
                :value="String(periodDays)"
                class="border-ink/10"
                :class="fieldClass"
                @change="onPeriodChange"
              >
                <option v-for="days in PERIOD_DAY_OPTIONS" :key="days" :value="String(days)">{{ days }} dni</option>
              </select>
            </label>

            <button
              type="submit"
              class="h-14 rounded-xl bg-pine px-6 text-base font-semibold text-white hover:bg-pine-dark md:shrink-0"
            >
              Porównaj oferty
            </button>
          </div>
        </form>
      </section>

      <section class="flex flex-col gap-4" aria-live="polite" :aria-busy="view.kind === 'loading'">
        <div v-if="view.kind === 'loading'" class="flex flex-col gap-3">
          <p class="text-sm font-medium text-ink/70">Ładowanie ofert…</p>
          <div
            v-for="index in 3"
            :key="index"
            class="animate-pulse rounded-2xl border border-ink/10 bg-white/80 p-4 opacity-60 motion-reduce:animate-none md:p-5"
            aria-hidden="true"
          >
            <div class="flex items-center gap-3">
              <div class="size-8 rounded-full bg-ink/10" />
              <div class="h-4 w-36 rounded bg-ink/10" />
              <div class="ml-auto h-8 w-16 rounded bg-ink/10" />
            </div>
            <div class="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <div v-for="bar in 5" :key="bar" class="h-8 rounded bg-ink/5" />
            </div>
          </div>
        </div>

        <template v-else-if="view.kind === 'offers'">
          <div>
            <h2 class="text-2xl font-semibold tracking-tight text-ink">Ranking ofert</h2>
            <p class="mt-2 max-w-3xl text-sm leading-6 text-ink/70 md:text-base">
              Układamy od najniższego RRSO, przy remisie od najniższego kosztu całkowitego.
              <template v-if="updatedLabel"> Ostatnia aktualizacja danych: {{ updatedLabel }}.</template>
            </p>
          </div>
          <ol class="flex flex-col gap-3">
            <li v-for="(offer, index) in view.offers" :key="offer.id">
              <OfferCard :offer="offer" :rank="index + 1" :highlighted="index === 0" />
            </li>
          </ol>
        </template>

        <p
          v-else-if="view.kind === 'amount-error'"
          class="rounded-2xl bg-white px-5 py-6 text-base text-ink/75"
        >
          Ranking pojawi się, gdy podasz poprawną kwotę.
        </p>

        <div v-else-if="view.kind === 'empty'" class="rounded-2xl bg-white px-5 py-6">
          <h2 class="text-lg font-semibold text-ink">
            Nie znaleźliśmy ofert dla {{ formatPlnString(view.amountPln) }}
          </h2>
          <p class="mt-2 text-sm leading-6 text-ink/70 md:text-base">
            Żadna oferta z listy nie obsługuje tej kwoty. Spróbuj inną kwotę, żeby zobaczyć ranking.
          </p>
        </div>

        <p
          v-else-if="view.kind === 'unavailable'"
          role="alert"
          class="rounded-2xl bg-white px-5 py-6 text-base text-ink/75"
        >
          {{ view.message }}
        </p>
      </section>
    </div>

    <HowItWorks />
    <Faq />
  </main>
</template>
