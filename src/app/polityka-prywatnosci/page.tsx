import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Polityka prywatności — Loan Checker",
  description:
    "Loan Checker jest porównywarką. Nie zakładamy konta i nie udzielamy pożyczek.",
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 md:px-6">
        <h1 className="text-4xl font-semibold tracking-tight text-ink">
          Polityka prywatności
        </h1>
        <div className="mt-6 flex flex-col gap-4 text-base leading-7 text-ink/80">
          <p>
            Loan Checker pokazuje publiczne porównanie chwilówek i pożyczek
            ratalnych. Nie ma rejestracji ani logowania.
          </p>
          <p>
            Kwota i okres spłaty zostają w tej przeglądarce na czas porównania.
            Nie zapisujemy ich na koncie, bo konta nie ma.
          </p>
          <p>
            „Przejdź do oferty” otwiera stronę partnera w nowej karcie. Od tego
            momentu obowiązuje polityka tego partnera. Link partnerski nie
            zmienia kolejności rankingu.
          </p>
          <p>Usługa jest przeznaczona dla osób pełnoletnich (18+).</p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
