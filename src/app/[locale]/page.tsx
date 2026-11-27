import { notFound } from "next/navigation";
import { Contact } from "@/components/Contact";
import { HeroIntro } from "@/components/Hero";
import { HomeExperience } from "@/components/HomeExperience";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

// La landing: una web que se arma en 3D mientras se hace scroll (así construyo cada sitio), con mis
// trabajos al final. La presentación y el contacto se renderizan en el servidor y van como piezas
// dentro de la experiencia.
export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const contactNumber = String(dict.process.sections.length + 2).padStart(2, "0");

  return (
    <HomeExperience
      locale={locale}
      intro={<HeroIntro locale={locale} dict={dict} />}
      contact={<Contact dict={dict} number={contactNumber} />}
      process={dict.process}
      work={dict.work}
    />
  );
}
