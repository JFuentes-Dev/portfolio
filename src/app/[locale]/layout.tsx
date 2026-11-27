import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Martian_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { siteConfig } from "@/content/site";
import { defaultLocale, isLocale, locales, ogLocales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import "../globals.css";

// Titulares, etiquetas y código: Martian Mono (variable, con ancho: los titulares van semicondensados).
// Texto corrido: IBM Plex Sans.
const mono = Martian_Mono({
  variable: "--font-martian",
  subsets: ["latin"],
  axes: ["wdth"],
});

const body = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#090b10",
  colorScheme: "dark",
};

// Solo existen /es y /en, pre-renderizados en el build; cualquier otro locale es 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { meta } = await getDictionary(locale);

  return {
    metadataBase: new URL(siteConfig.url),
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, `/${l}`])),
        "x-default": `/${defaultLocale}`,
      },
    },
    openGraph: {
      type: "website",
      url: `/${locale}`,
      siteName: siteConfig.name,
      title: meta.title,
      description: meta.description,
      locale: ogLocales[locale],
      alternateLocale: locales.filter((l) => l !== locale).map((l) => ogLocales[l]),
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
    },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <html lang={locale} className={`${mono.variable} ${body.variable} antialiased`} suppressHydrationWarning>
      <body className="flex min-h-svh flex-col font-sans">
        {/* Marca que hay JS antes de pintar: el titular se oculta hasta empezar a decodificarse. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-foreground"
        >
          {dict.nav.skipToContent}
        </a>
        <Header locale={locale} dict={dict} />
        {/* overflow-x: clip recorta lo que asoma de lado sin crear un contenedor de scroll. */}
        <main id="main" className="relative z-10 flex-1 overflow-x-clip">
          {children}
        </main>
      </body>
    </html>
  );
}
