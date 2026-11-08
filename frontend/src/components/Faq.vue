<script setup lang="ts">
const items = [
  {
    question: "Czy Loan Checker udziela pożyczek?",
    answer:
      "Nie. Porównujemy oferty partnerów. Umowa i decyzja należą wyłącznie do pożyczkodawcy, a wniosek składasz na jego stronie.",
  },
  {
    question: "Dla kogo jest ta usługa?",
    answer: "Dla osób pełnoletnich (18+). Nie trzeba zakładać konta.",
  },
  {
    question: "Czy link partnerski zmienia miejsce oferty?",
    answer:
      "Nie. Kolejność pochodzi z danych: najpierw niższe RRSO, a przy remisie niższy koszt całkowity. Link „Przejdź do oferty” nie podbija pozycji.",
  },
] as const;
</script>

<template>
  <section id="faq" class="scroll-mt-24 bg-cream">
    <div class="mx-auto max-w-6xl px-4 pb-16 md:px-6 md:pb-20">
      <h2 class="text-2xl font-semibold tracking-tight text-ink">FAQ</h2>
      <div class="mt-4 divide-y divide-ink/10 overflow-hidden rounded-[28px] bg-white">
        <details v-for="item in items" :key="item.question" class="group px-5 py-4 md:px-6">
          <summary class="cursor-pointer list-none font-semibold text-ink [&::-webkit-details-marker]:hidden">
            {{ item.question }}
          </summary>
          <p class="pt-2 text-sm leading-6 text-ink/70 md:text-base">{{ item.answer }}</p>
        </details>
      </div>
    </div>
  </section>
</template>
