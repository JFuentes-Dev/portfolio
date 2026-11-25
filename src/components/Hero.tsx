import Image from "next/image";
import { siteConfig } from "@/content/site";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { asset } from "@/lib/asset";
import { CopyButton } from "./CopyButton";
import { LocalTime } from "./LocalTime";

// Bloque 1: foto y presentación. Ocupa exactamente una pantalla bajo el header (100svh − 3.5rem);
// los tamaños dependen también del alto (svh) para que todo quepa sin scroll en laptops bajos.
export function Hero({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const t = dict.hero;
  const { email, links, photo } = siteConfig;
  const facts = [
    { term: t.now, value: t.nowValue },
    { term: t.studies, value: t.studiesValue },
    { term: t.daily, value: t.dailyValue },
  ];

  return (
    <section id="top" aria-labelledby="hero-title" className="snap-start">
      <div className="mx-auto grid min-h-[calc(100svh-3.5rem)] max-w-[88rem] items-center gap-10 px-5 py-6 sm:px-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:py-8 lg:gap-16">
        {/* Foto grande (desde md) */}
        {/* El ancho sale del alto disponible (64svh en proporción 4:5) para no empujar el bloque. */}
        <figure className="hidden w-[min(100%,calc(64svh*0.8))] justify-self-center md:block">
          {photo && (
            <Image
              src={asset(photo)}
              alt={t.photoAlt}
              width={640}
              height={640}
              preload
              sizes="(min-width: 768px) 30vw, 0px"
              className="aspect-[4/5] w-full object-cover object-[50%_30%] grayscale contrast-110"
            />
          )}
          <figcaption className="label mt-3 flex justify-between gap-4 text-muted">
            <span>{t.base}</span>
            <span>
              <LocalTime timeZone={siteConfig.timeZone} locale={locale} /> {t.localTime}
            </span>
          </figcaption>
        </figure>

        <div className="min-w-0">
          <div className="flex items-center gap-4">
            {photo && (
              <Image
                src={asset(photo)}
                alt=""
                width={640}
                height={640}
                sizes="64px"
                className="size-14 shrink-0 object-cover object-[50%_30%] grayscale contrast-110 md:hidden"
              />
            )}
            <p className="label text-muted">
              {t.kicker}
              <span className="mt-1 block md:hidden">
                {t.base} · <LocalTime timeZone={siteConfig.timeZone} locale={locale} />
              </span>
            </p>
          </div>

          <h1
            id="hero-title"
            className="mt-5 font-display text-[clamp(2.5rem,min(6.4vw,9.4svh),6.5rem)] leading-[0.92] tracking-[-0.02em] text-balance lg:mt-7"
          >
            {t.titleStart} <em className="text-accent">{t.titleEmphasis}</em>
          </h1>

          <p className="mt-5 max-w-[40rem] text-base leading-relaxed text-pretty sm:text-lg lg:mt-7">{t.lead}</p>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4 lg:mt-8">
            <a
              href="#work"
              className="inline-flex h-11 items-center gap-2 bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {t.ctaWork} <span aria-hidden="true">↓</span>
            </a>
            {email && (
              <span className="inline-flex min-w-0 items-center gap-3">
                <a href={`mailto:${email}`} className="link-underline truncate text-sm sm:text-base">
                  {email}
                </a>
                <CopyButton value={email} label={t.copy} done={t.copied} />
              </span>
            )}
            {links.github && (
              <a href={links.github} target="_blank" rel="noopener noreferrer" className="link-underline text-sm sm:text-base">
                GitHub <span aria-hidden="true">↗</span>
              </a>
            )}
          </div>

          {/* En pantallas bajas los datos se omiten para que el bloque quepa entero. */}
          <dl
            aria-label={t.factsLabel}
            className="mt-8 hidden gap-x-6 gap-y-4 border-t border-border pt-4 sm:grid sm:grid-cols-3 lg:mt-10 [@media(max-height:560px)]:hidden"
          >
            {facts.map((fact) => (
              <div key={fact.term}>
                <dt className="label text-muted">{fact.term}</dt>
                <dd className="mt-1 text-sm leading-snug text-balance">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
