import { notFound } from "next/navigation";
import { Contact } from "@/components/Contact";
import { Hero } from "@/components/Hero";
import { Workbook } from "@/components/Workbook";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <>
      {/* Bloque 1: presentación */}
      <Hero locale={locale} dict={dict} />

      {/* Bloque 2: libro de trabajo, también de una pantalla exacta bajo el header */}
      <section id="work" aria-labelledby="work-title" className="snap-start">
        <div className="mx-auto flex h-[calc(100svh-3.5rem)] min-h-[32rem] max-w-[100rem] flex-col px-3 pt-3 pb-3 sm:px-6 sm:pt-5 sm:pb-6 lg:px-8">
          <div className="flex items-end justify-between gap-6 pb-3">
            <h2 id="work-title" className="flex items-baseline gap-3">
              <span className="label text-accent">{dict.work.label}</span>
              <span className="font-display text-2xl leading-none sm:text-3xl">{dict.work.title}</span>
            </h2>
            <p className="hidden max-w-sm text-right text-xs leading-snug text-muted md:block">{dict.work.note}</p>
          </div>
          <div className="min-h-0 flex-1">
            <Workbook locale={locale} labels={dict.work} />
          </div>
          <p className="pt-2 text-[11px] leading-snug text-muted md:hidden">{dict.work.note}</p>
        </div>
      </section>

      <Contact dict={dict} />
    </>
  );
}
