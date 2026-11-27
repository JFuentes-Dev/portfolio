// Captura las páginas del visor de propuestas y genera src/content/showcase-geometry.json.
//
// Uso (Node ≥ 20, con Google Chrome instalado):
//   npm i --no-save playwright-core
//   node scripts/capture-showcase.mjs <targets.json> [slug1,slug2,...]
//
// <targets.json> vive FUERA del repo, porque las rutas del proyecto `webs` llevan nombres reales
// de negocios. Formato:
//   { "base": "http://localhost:3001",
//     "targets": [ { "slug": "bar", "path": "/propuestas/...", "keepOffer": false }, ... ] }
// `keepOffer: true` deja visible la sección #oferta (solo en las variantes de mi propio sitio).
// `waitUntil: "load"` para sitios que nunca dejan la red quieta (p. ej. sitios en Odoo, con
// long-polling): se espera la carga y unos segundos, en vez de "networkidle".
// `css`: CSS extra para esa página (p. ej. ocultar un chat que se abre solo o un video de fondo que
// bloquea a los navegadores automáticos).
//
// Las propuestas de negocios reales se capturan desde una COPIA anonimizada de `webs` (nombre,
// logo, fotos y contactos reemplazados) corriendo en `base`. Nunca desde el proyecto original.
//
// Por cada slug escribe public/prototypes/<slug>/{desktop,mobile}.jpg y mide, en el mismo estado
// de la captura, dónde empieza cada sección y su primer título (para sincronizar el scroll y ubicar
// las anotaciones). Las secciones deben ser las mismas en escritorio y en celular.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const [targetsFile, onlyArg] = process.argv.slice(2);
if (!targetsFile) {
  console.error("Falta <targets.json>. Ver el encabezado del script.");
  process.exit(1);
}
const { base, targets } = JSON.parse(fs.readFileSync(targetsFile, "utf8"));
const only = onlyArg ? onlyArg.split(",") : null;
const root = path.resolve(import.meta.dirname, "..");
const geometryFile = path.join(root, "src/content/showcase-geometry.json");

// Oculta lo que no va en el portafolio: indicador de Next, franja de "prototipo" y botones flotantes.
const HIDE = `
  nextjs-portal { display: none !important; }
  [class*="oklch(20%_0.01_260)"] { display: none !important; }
  .prototipo, .wa-flotante { display: none !important; }
`;
const HIDE_OFFER = "#oferta { display: none !important; }";

async function prepare(page, keepOffer, css = "") {
  await page.addStyleTag({ content: HIDE + (keepOffer ? "" : HIDE_OFFER) + css });
  await page.evaluate(async () => {
    for (const el of document.querySelectorAll("*")) {
      if (getComputedStyle(el).position === "fixed" && el.getBoundingClientRect().width < 120) el.style.display = "none";
    }
    // Recorre la página para disparar animaciones de entrada y carga diferida. Pasos cortos y lentos:
    // las animaciones "al entrar en pantalla" (p. ej. motion con useInView) necesitan verse un rato.
    for (let y = 0; y < document.documentElement.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 250));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 1200));
    // Lleva al estado final las animaciones que sigan a medias, para medir la página ya quieta. Las
    // infinitas (brillos, pulsos) no se pueden terminar: se cancelan.
    for (const animation of document.getAnimations()) {
      try {
        animation.finish();
      } catch {
        animation.cancel();
      }
    }
  });
  await page.waitForTimeout(500);
}

// La captura de página completa agranda la ventana, y eso puede reiniciar animaciones de entrada
// (la página saldría a medio aparecer). `animations: "disabled"` las vuelve a llevar al final.
const SHOT = { fullPage: true, animations: "disabled" };

function measure(page) {
  return page.evaluate(() => {
    const H = document.documentElement.scrollHeight;
    const W = document.documentElement.clientWidth;
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      return r.height > 0 && r.width > 0 && getComputedStyle(el).visibility !== "hidden";
    };
    const sections = [...document.querySelectorAll("section, footer")]
      // Las secciones dentro del header o el menú (p. ej. un mega menú) no son de la página.
      .filter((el) => visible(el) && !el.parentElement.closest("section, footer") && !el.closest("header, nav"))
      .map((el) => +((el.getBoundingClientRect().top + window.scrollY) / H).toFixed(4));
    const headings = [...document.querySelectorAll("h1, h2, h3")].filter(visible).map((el) => {
      const r = el.getBoundingClientRect();
      return [+(r.left / W).toFixed(4), +((r.top + window.scrollY) / H).toFixed(4)];
    });
    // Ancla de cada sección: su primer título (o el borde de la sección si no tiene).
    const pins = sections.map((y, i) => {
      const next = sections[i + 1] ?? 1;
      return headings.find(([, hy]) => hy >= y - 0.002 && hy < next) ?? [0.06, +(y + 0.01).toFixed(4)];
    });
    return { height: H, width: W, sections, pins };
  });
}

async function open(page, t) {
  await page.goto(base + t.path, { waitUntil: t.waitUntil ?? "networkidle", timeout: 120000 });
  if (t.waitUntil === "load") await page.waitForTimeout(4000);
}

const geometry = fs.existsSync(geometryFile) ? JSON.parse(fs.readFileSync(geometryFile, "utf8")) : {};
const browser = await chromium.launch({ channel: "chrome", headless: true });

for (const t of targets) {
  if (only && !only.includes(t.slug)) continue;
  const dir = path.join(root, "public/prototypes", t.slug);
  fs.mkdirSync(dir, { recursive: true });

  let ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  let page = await ctx.newPage();
  await open(page, t);
  await prepare(page, t.keepOffer, t.css);
  const desktop = await measure(page);
  await page.screenshot({ path: path.join(dir, "desktop.jpg"), type: "jpeg", quality: 72, ...SHOT });
  await ctx.close();

  ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.6, isMobile: true, hasTouch: true });
  page = await ctx.newPage();
  await open(page, t);
  await prepare(page, t.keepOffer, t.css);
  const mobile = await measure(page);
  await page.screenshot({ path: path.join(dir, "mobile.jpg"), type: "jpeg", quality: 70, ...SHOT });
  await ctx.close();

  if (desktop.sections.length !== mobile.sections.length) {
    console.warn(`⚠ ${t.slug}: ${desktop.sections.length} secciones en escritorio y ${mobile.sections.length} en celular`);
  }
  geometry[t.slug] = { desktop, mobile };
  console.log("ok", t.slug, desktop.height, mobile.height);
}

await browser.close();
fs.writeFileSync(geometryFile, JSON.stringify(geometry) + "\n");
