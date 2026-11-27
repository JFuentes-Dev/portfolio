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

// La mono del sitio (OFL, ver src/assets/fonts/OFL.txt). Satori solo acepta ttf/otf/woff.
const fontDir = join(process.cwd(), "src/assets/fonts");
const mono400 = readFile(join(fontDir, "MartianMono-400.woff"));
const mono500 = readFile(join(fontDir, "MartianMono-500.woff"));

const colors = {
  background: "#090b10",
  foreground: "#e6e9ef",
  muted: "#8d97a9",
  faint: "#2e3a4b",
  accent: "#ffb547",
  steel: "#60718c",
};

// Columnas de código del fondo, siempre iguales (pseudoaleatorio con semilla fija).
const GLYPHS = "01{}[]()<>=+-*/;:#$&|!?abcdef0123456789";
function codeColumns(count: number, rows: number) {
  let seed = 7;
  const next = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: count }, () => {
    const head = Math.floor(next() * rows);
    const trail = 5 + Math.floor(next() * 9);
    return Array.from({ length: rows }, (_, r) => {
      const d = head - r;
      const glow = d >= 0 && d < trail ? 1 - d / trail : 0.08;
      return { ch: GLYPHS[Math.floor(next() * GLYPHS.length)], glow, head: d === 0 };
    });
  });
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = await getDictionary(isLocale(locale) ? locale : "es");
  // Palabra por palabra: en Satori cada hijo de un flex es un bloque, así el acento fluye en la línea.
  const words = dict.hero.titleStart.split(" ");
  const columns = codeColumns(9, 19);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: colors.background,
          color: colors.foreground,
          fontFamily: "Martian Mono",
        }}
      >
        {/* Lluvia de código a la derecha */}
        <div style={{ position: "absolute", top: 0, right: 40, height: 520, overflow: "hidden", display: "flex", gap: 18 }}>
          {columns.map((column, c) => (
            <div key={c} style={{ display: "flex", flexDirection: "column", fontSize: 22, lineHeight: 1.45, marginTop: (c % 3) * 14 }}>
              {column.map((cell, r) => (
                <span
                  key={r}
                  style={{
                    color: cell.head ? "#e4ecff" : c === 6 ? colors.accent : colors.steel,
                    opacity: cell.glow,
                  }}
                >
                  {cell.ch}
                </span>
              ))}
            </div>
          ))}
        </div>
        {/* Viñeta para que el texto se lea sobre las columnas */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: `linear-gradient(90deg, ${colors.background} 52%, rgba(9,11,16,0.55) 75%, rgba(9,11,16,0.2))`,
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            padding: "56px 72px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", fontSize: 22, color: colors.foreground }}>
            <span style={{ color: colors.accent }}>~/</span>
            <span>jorge-fuentes</span>
            <span style={{ width: 13, height: 26, marginLeft: 6, background: colors.accent }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", maxWidth: 860 }}>
            <div style={{ display: "flex", fontSize: 22, color: colors.muted, marginBottom: 26 }}>
              <span style={{ color: colors.accent }}>jorge@scl</span>
              <span>:~$ whoami</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", fontSize: 54, fontWeight: 500, lineHeight: 1.12, letterSpacing: -2.5 }}>
              {words.map((word, i) => (
                <span key={i} style={{ marginRight: 26 }}>
                  {word}
                </span>
              ))}
              <span style={{ color: colors.accent }}>{dict.hero.titleEmphasis}</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 18,
              letterSpacing: 1,
              color: colors.muted,
              borderTop: `1px solid ${colors.faint}`,
              paddingTop: 18,
            }}
          >
            <span>{dict.hero.kicker.toUpperCase()}</span>
            <span>SANTIAGO, CL</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Martian Mono", data: await mono400, weight: 400, style: "normal" },
        { name: "Martian Mono", data: await mono500, weight: 500, style: "normal" },
      ],
    },
  );
}
