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

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 bg-cream">
      <div className="mx-auto max-w-6xl px-4 pb-16 md:px-6 md:pb-20">
        <h2 className="text-2xl font-semibold tracking-tight text-ink">FAQ</h2>
        <div className="mt-4 divide-y divide-ink/10 overflow-hidden rounded-[28px] bg-white">
          {items.map((item) => (
            <details key={item.question} className="group px-5 py-4 md:px-6">
              <summary className="cursor-pointer list-none font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {item.question}
              </summary>
              <p className="pt-2 text-sm leading-6 text-ink/70 md:text-base">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
