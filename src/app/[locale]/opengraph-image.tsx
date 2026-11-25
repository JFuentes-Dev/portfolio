import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { siteConfig } from "@/content/site";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export const dynamic = "force-static";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = siteConfig.name;

// La serif del sitio (OFL, ver src/assets/fonts/OFL.txt). Satori solo acepta ttf/otf/woff.
const fontDir = join(process.cwd(), "src/assets/fonts");
const serifRegular = readFile(join(fontDir, "InstrumentSerif-Regular.ttf"));
const serifItalic = readFile(join(fontDir, "InstrumentSerif-Italic.ttf"));

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = await getDictionary(isLocale(locale) ? locale : "es");
  // Palabra por palabra: en Satori cada hijo de un flex es un bloque, así el acento fluye en la línea.
  const words = dict.hero.titleStart.split(" ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 80px",
          background: "#f3efe6",
          color: "#161412",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            letterSpacing: 2,
            color: "#625c52",
            borderTop: "2px solid #161412",
            paddingTop: 14,
          }}
        >
          <span>{siteConfig.name.toUpperCase()}</span>
          <span>SANTIAGO, CHILE</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", fontFamily: "Instrument Serif", fontSize: 92, lineHeight: 0.98 }}>
          {words.map((word, i) => (
            <span key={i} style={{ marginRight: 22 }}>
              {word}
            </span>
          ))}
          <span style={{ color: "#b83a16", fontStyle: "italic" }}>{dict.hero.titleEmphasis}</span>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#625c52" }}>{dict.hero.kicker}</div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Instrument Serif", data: await serifRegular, weight: 400, style: "normal" },
        { name: "Instrument Serif", data: await serifItalic, weight: 400, style: "italic" },
      ],
    },
  );
}
