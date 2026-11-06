import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="bg-ink text-cream">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 md:px-6 md:py-12">
        <p className="text-lg font-semibold text-white">Loan Checker</p>
        <p className="max-w-3xl text-sm leading-6 text-cream/90 md:text-base">
          Nie udzielamy pożyczek. Porównujemy oferty partnerów; umowa i decyzja
          należą wyłącznie do pożyczkodawcy.
        </p>
        <p className="max-w-3xl text-sm leading-6 text-cream/90 md:text-base">
          Usługa jest przeznaczona dla osób pełnoletnich (18+). Linki „Przejdź
          do oferty” są partnerskie i nie podbijają pozycji w rankingu.
        </p>
        <p>
          <Link
            href="/polityka-prywatnosci"
            className="text-sm font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white md:text-base"
          >
            Polityka prywatności
          </Link>
        </p>
      </div>
    </footer>
  );
}
