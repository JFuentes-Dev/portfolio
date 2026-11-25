import Link from "next/link";
import { siteConfig } from "@/content/site";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const nav = [
    { href: "#work", label: dict.nav.work },
    { href: "#contact", label: dict.nav.contact },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[100rem] items-center justify-between gap-6 px-5 sm:px-8">
        <Link href={`/${locale}`} className="font-display text-xl leading-none tracking-tight">
          {siteConfig.name}
        </Link>
        <div className="flex items-center gap-5 sm:gap-8">
          <nav aria-label="Main">
            <ol className="flex gap-4 sm:gap-7">
              {nav.map((item, i) => (
                <li key={item.href}>
                  <a href={item.href} className="group flex items-baseline gap-1.5 text-sm">
                    <span className="label hidden text-muted transition-colors group-hover:text-accent sm:inline">
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
