<script setup lang="ts">
const steps = [
  {
    title: "Podaj kwotę",
    body: "Wpisz kwotę w złotych i wybierz okres spłaty: 30 albo 60 dni.",
  },
  {
    title: "Widzisz ranking",
    body: "Oferty układamy od najniższego RRSO, a przy remisie od najniższego kosztu całkowitego.",
  },
  {
    title: "Porównaj koszty",
    body: "Na karcie są RRSO, koszt całkowity, kwota do spłaty i rata, gdy produkt ją ma.",
  },
  {
    title: "Przechodzisz do partnera",
    body: "Wniosek składasz na stronie partnera. Loan Checker nie udziela pożyczek.",
  },
] as const;
</script>

<template>
  <section id="jak-to-dziala" class="scroll-mt-24 bg-cream">
    <div class="mx-auto max-w-6xl px-4 pb-12 md:px-6 md:pb-16">
      <div class="rounded-[28px] bg-white/80 p-5 md:p-8">
        <h2 class="text-2xl font-semibold tracking-tight text-ink">Jak działa Loan Checker</h2>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-ink/70 md:text-base">
          Porównanie bez rejestracji i bez logowania. Kolejność kart jest kolejnością z danych, a
          link partnerski jej nie zmienia.
        </p>
        <ol class="mt-6 grid gap-3 md:grid-cols-4">
          <li
            v-for="(step, index) in steps"
            :key="step.title"
            class="rounded-2xl border border-ink/8 bg-cream p-4"
          >
            <span class="grid size-7 place-items-center rounded-full bg-pine text-sm font-semibold text-white">
              {{ index + 1 }}
            </span>
            <h3 class="mt-3 font-semibold text-ink">{{ step.title }}</h3>
            <p class="mt-1 text-sm leading-6 text-ink/70">{{ step.body }}</p>
          </li>
        </ol>
        <p class="mt-4 rounded-2xl bg-cream px-4 py-3 text-sm leading-6 text-ink/70">
          Nazwy pożyczkodawców na kartach to przykłady. Linki „Przejdź do oferty” są partnerskie i
          nie podbijają pozycji w rankingu.
        </p>
      </div>
    </div>
  </section>
</template>
