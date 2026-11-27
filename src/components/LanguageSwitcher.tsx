"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { locales, type Locale } from "@/i18n/config";

export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();

  // Reemplaza solo el primer segmento (/es/... -> /en/...) para conservar la ruta actual.
  const hrefFor = (target: Locale) => {
    const segments = pathname.split("/");
    segments[1] = target;
    return segments.join("/");
  };

  return (
    <nav aria-label={label} className="label flex items-center gap-1.5">
      {locales.map((target, i) => {
        const active = target === locale;
        return (
          <Fragment key={target}>
            {i > 0 && <span aria-hidden="true" className="text-faint">/</span>}
            <Link
              href={hrefFor(target)}
              hrefLang={target}
              lang={target}
              aria-current={active ? "true" : undefined}
              className={active ? "text-foreground" : "text-muted transition-colors hover:text-accent"}
            >
              {target}
            </Link>
          </Fragment>
        );
      })}
    </nav>
  );
}
