import Link from "next/link";

const links = [
  { href: "/#jak-to-dziala", label: "Jak to działa" },
  { href: "/#faq", label: "FAQ" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-ink/8 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:h-[72px] md:px-6">
        <Link href="/" className="flex items-center gap-2.5 text-ink">
          <span className="grid size-9 place-items-center rounded-lg bg-pine text-sm font-bold tracking-tight text-white">
            LC
          </span>
          <span className="text-base font-semibold tracking-tight md:text-lg">
            Loan Checker
          </span>
        </Link>
        <nav aria-label="Sekcje" className="flex items-center gap-4 text-sm font-medium text-ink md:gap-6 md:text-base">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-pine">
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
