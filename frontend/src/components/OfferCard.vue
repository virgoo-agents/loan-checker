<script setup lang="ts">
import { computed } from "vue";
import {
  capitalizeLabel,
  formatPercentString,
  formatPlnString,
  interestPhrase,
  type RankedOffer,
} from "../lib/ranking";

const props = defineProps<{
  offer: RankedOffer;
  rank: number;
  highlighted: boolean;
}>();

const stats = computed(() => {
  const rows = [
    { label: "Kwota", value: formatPlnString(props.offer.requestedAmountPln) },
    { label: "Okres", value: props.offer.periodLabel },
    {
      label: "Oprocentowanie",
      value: interestPhrase(props.offer.interestRatePercent, props.offer.rateType),
    },
    { label: "Koszt całkowity", value: formatPlnString(props.offer.totalCostPln) },
    { label: "Do spłaty", value: formatPlnString(props.offer.totalRepayPln) },
  ];
  if (props.offer.installmentPln !== null) {
    rows.push({ label: "Rata", value: formatPlnString(props.offer.installmentPln) });
  }
  return rows;
});

const gridClass = computed(() =>
  props.offer.installmentPln === null ? "lg:grid-cols-5" : "lg:grid-cols-6",
);

const ctaClass =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-pine px-4 text-sm font-semibold text-white hover:bg-pine-dark lg:w-auto";
</script>

<template>
  <article
    class="rounded-2xl border p-4 md:p-5"
    :class="highlighted ? 'border-pine/50 bg-mint' : 'border-ink/10 bg-white'"
  >
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
      <div class="flex min-w-0 items-start justify-between gap-3 lg:w-52 lg:shrink-0">
        <div class="flex min-w-0 items-center gap-3">
          <span
            class="grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold"
            :class="highlighted ? 'bg-pine text-white' : 'bg-cream text-ink'"
          >
            {{ rank }}
          </span>
          <div class="min-w-0">
            <h3 class="truncate text-base font-semibold text-ink">{{ offer.partnerName }}</h3>
            <p class="mt-1 inline-flex rounded-full border border-ink/15 px-2 py-0.5 text-xs font-medium text-ink/80">
              {{ capitalizeLabel(offer.productTypeLabel) }}
            </p>
          </div>
        </div>
        <div class="text-right lg:hidden">
          <p class="text-[11px] font-medium tracking-wide text-ink/55">RRSO</p>
          <p class="text-2xl font-semibold tracking-tight text-ink">
            {{ formatPercentString(offer.rrsoPercent) }}
          </p>
        </div>
      </div>

      <dl class="grid flex-1 grid-cols-2 gap-x-4 gap-y-3" :class="gridClass">
        <div v-for="stat in stats" :key="stat.label">
          <dt class="text-xs text-ink/60">{{ stat.label }}</dt>
          <dd class="mt-0.5 text-sm font-semibold text-ink">{{ stat.value }}</dd>
        </div>
      </dl>

      <div class="flex flex-col items-stretch gap-3 lg:w-52 lg:shrink-0 lg:items-end">
        <div class="hidden text-right lg:block">
          <p class="text-[11px] font-medium tracking-wide text-ink/55">RRSO</p>
          <p class="text-2xl font-semibold tracking-tight text-ink">
            {{ formatPercentString(offer.rrsoPercent) }}
          </p>
        </div>
        <a
          v-if="offer.affiliateUrl"
          :href="offer.affiliateUrl"
          target="_blank"
          rel="noopener noreferrer"
          :class="ctaClass"
        >
          Przejdź do oferty
          <svg viewBox="0 0 16 16" aria-hidden="true" class="size-3.5" fill="none">
            <path
              d="M6 3.5H3.5v9h9V10M8.5 3.5H12.5V7.5M12.2 3.8 7 9"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </a>
        <span v-else :class="[ctaClass, 'pointer-events-none opacity-50']" aria-disabled="true">
          Przejdź do oferty
          <svg viewBox="0 0 16 16" aria-hidden="true" class="size-3.5" fill="none">
            <path
              d="M6 3.5H3.5v9h9V10M8.5 3.5H12.5V7.5M12.2 3.8 7 9"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      </div>
    </div>
  </article>
</template>
