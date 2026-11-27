import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const nav = [
    // "Proceso" solo desde sm: en celular no cabe y el scroll lleva ahí de todas formas.
    { href: `#${dict.process.sections[0].id}`, label: dict.nav.process, wide: true },
    { href: "#work", label: dict.nav.work },
    { href: "#contact", label: dict.nav.contact },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[100rem] items-center justify-between gap-6 px-5 sm:px-8">
        <Link href={`/${locale}`} className="group flex items-center font-mono text-[12px] tracking-tight whitespace-nowrap sm:text-[13px]">
          <span className="text-accent">~/</span>
          <span className="transition-colors group-hover:text-accent">
            jorge<span className="hidden sm:inline">-fuentes</span>
          </span>
          <span aria-hidden="true" className="caret" />
        </Link>
        <div className="flex items-center gap-5 sm:gap-8">
          <nav aria-label="Main">
            <ol className="flex gap-4 sm:gap-7">
              {nav.map((item, i) => (
                <li key={item.href} className={item.wide ? "hidden sm:block" : undefined}>
                  <a href={item.href} className="group flex items-baseline gap-2 font-mono text-[12px] sm:text-[13px]">
                    <span className="hidden text-faint transition-colors group-hover:text-accent sm:inline">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="transition-colors group-hover:text-accent">{item.label}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <LanguageSwitcher locale={locale} label={dict.nav.language} />
        </div>
      </div>
    </header>
  );
}
