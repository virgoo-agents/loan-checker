import { capitalizeLabel, formatPercentString, formatPlnString, interestPhrase } from "@/lib/money-format";
import type { RankedOffer } from "@/lib/ranking";

interface OfferCardProps {
  offer: RankedOffer;
  rank: number;
  highlighted: boolean;
}

interface Stat {
  label: string;
  value: string;
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5" fill="none">
      <path
        d="M6 3.5H3.5v9h9V10M8.5 3.5H12.5V7.5M12.2 3.8 7 9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function OfferCard({ offer, rank, highlighted }: OfferCardProps) {
  const stats: Stat[] = [
    { label: "Kwota", value: formatPlnString(offer.requestedAmountPln) },
    { label: "Okres", value: offer.periodLabel },
    {
      label: "Oprocentowanie",
      value: interestPhrase(offer.interestRatePercent, offer.rateType),
    },
    { label: "Koszt całkowity", value: formatPlnString(offer.totalCostPln) },
    { label: "Do spłaty", value: formatPlnString(offer.totalRepayPln) },
  ];

  if (offer.installmentPln !== null) {
    stats.push({ label: "Rata", value: formatPlnString(offer.installmentPln) });
  }

  const ctaClassName =
    "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-pine px-4 text-sm font-semibold text-white hover:bg-pine-dark lg:w-auto";

  return (
    <article
      className={`rounded-2xl border p-4 md:p-5 ${
        highlighted ? "border-pine/50 bg-mint" : "border-ink/10 bg-white"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
        <div className="flex min-w-0 items-start justify-between gap-3 lg:w-52 lg:shrink-0">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                highlighted ? "bg-pine text-white" : "bg-cream text-ink"
              }`}
            >
              {rank}
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-ink">{offer.partnerName}</h3>
              <p className="mt-1 inline-flex rounded-full border border-ink/15 px-2 py-0.5 text-xs font-medium text-ink/80">
                {capitalizeLabel(offer.productTypeLabel)}
              </p>
            </div>
          </div>
          <div className="text-right lg:hidden">
            <p className="text-[11px] font-medium tracking-wide text-ink/55">RRSO</p>
            <p className="text-2xl font-semibold tracking-tight text-ink">
              {formatPercentString(offer.rrsoPercent)}
            </p>
          </div>
        </div>

        <dl
          className={`grid flex-1 grid-cols-2 gap-x-4 gap-y-3 ${
            offer.installmentPln === null ? "lg:grid-cols-5" : "lg:grid-cols-6"
          }`}
        >
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="text-xs text-ink/60">{stat.label}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-ink">{stat.value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col items-stretch gap-3 lg:w-52 lg:shrink-0 lg:items-end">
          <div className="hidden text-right lg:block">
            <p className="text-[11px] font-medium tracking-wide text-ink/55">RRSO</p>
            <p className="text-2xl font-semibold tracking-tight text-ink">
              {formatPercentString(offer.rrsoPercent)}
            </p>
          </div>
          {offer.affiliateUrl ? (
            <a
              href={offer.affiliateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={ctaClassName}
            >
              Przejdź do oferty
              <ExternalIcon />
            </a>
          ) : (
            <span className={`${ctaClassName} pointer-events-none opacity-50`} aria-disabled="true">
              Przejdź do oferty
              <ExternalIcon />
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
