"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { pageGeometry, pageImages, sheets, type PageSlug, type Sheet } from "@/content/sheets";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { asset } from "@/lib/asset";

// Libro de trabajo: cada proyecto es una hoja (pestañas arriba, como una planilla). Las hojas
// visuales muestran el sitio en celular (izquierda) y escritorio (derecha) con scroll sincronizado,
// anotaciones, variantes, vista en vivo y recorrido automático. Las hojas de datos son una planilla.

type Device = "phone" | "browser";
type Labels = Dictionary["work"];
type Cell = { row: number; col: number };

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const pad = (n: number) => String(n).padStart(2, "0");

// Puntos de anclaje para sincronizar el scroll: inicio de cada sección (0–1) en escritorio y en
// celular, emparejados por índice. Se descartan pares que no avanzan en ambos lados.
function anchorsFor(slug: PageSlug) {
  const g = pageGeometry[slug];
  const d = [0, ...g.desktop.sections, 1];
  const m = [0, ...g.mobile.sections, 1];
  const desktop: number[] = [];
  const mobile: number[] = [];
  d.forEach((y, i) => {
    if (desktop.length === 0 || (y > desktop[desktop.length - 1] && m[i] > mobile[mobile.length - 1])) {
      desktop.push(y);
      mobile.push(m[i]);
    }
  });
  return { desktop, mobile };
}

// Interpola una posición (0–1) de una lista de anclas a la otra, tramo a tramo.
function mapFraction(f: number, from: number[], to: number[]) {
  if (f <= 0) return 0;
  if (f >= 1) return 1;
  let i = 0;
  while (i < from.length - 2 && f > from[i + 1]) i++;
  const t = (f - from[i]) / (from[i + 1] - from[i] || 1);
  return to[i] + t * (to[i + 1] - to[i]);
}

// Tamaño de un elemento que se monta y desmonta (ref de callback + ResizeObserver).
function useElementSize() {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return [setElement, size] as const;
}

const hostOf = (url: string) => {
  const u = new URL(url);
  return u.host.replace(/^www\./, "") + (u.pathname === "/" ? "" : u.pathname);
};

const isVisible = (el: HTMLElement | null): el is HTMLElement => !!el && el.offsetParent !== null;
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── Íconos (16 px, trazo del color del texto) ──────────────────────────────────────────────────

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="size-4 shrink-0">
      {children}
    </svg>
  );
}
const PlayIcon = () => (
  <Icon>
    <path d="M5 3.5v9l7-4.5-7-4.5Z" fill="currentColor" stroke="none" />
  </Icon>
);
const PauseIcon = () => (
  <Icon>
    <path d="M5 3.5v9M11 3.5v9" strokeWidth="2.2" />
  </Icon>
);
const SyncIcon = () => (
  <Icon>
    <path d="M5 13V3M2.5 5.5 5 3l2.5 2.5M11 3v10M8.5 10.5 11 13l2.5-2.5" />
  </Icon>
);
const PhoneIcon = () => (
  <Icon>
    <rect x="4.5" y="1.5" width="7" height="13" rx="1.6" />
    <path d="M7 12.5h2" />
  </Icon>
);
const DesktopIcon = () => (
  <Icon>
    <rect x="1.5" y="2.5" width="13" height="8.5" rx="1" />
    <path d="M6 14h4M8 11v3" />
  </Icon>
);
const ImageIcon = () => (
  <Icon>
    <rect x="1.5" y="2.5" width="13" height="11" rx="1" />
    <path d="m2 12 4-4 3 3 2-2 3 3" />
  </Icon>
);
const LiveIcon = () => (
  <Icon>
    <circle cx="8" cy="8" r="2.5" fill="currentColor" stroke="none" />
    <path d="M4.2 11.8a5.4 5.4 0 0 1 0-7.6M11.8 4.2a5.4 5.4 0 0 1 0 7.6" />
  </Icon>
);
const InfoIcon = () => (
  <Icon>
    <circle cx="8" cy="8" r="6.5" />
    <path d="M8 7v4.5M8 4.6v.1" strokeWidth="1.8" />
  </Icon>
);
const Chevron = ({ left = false }: { left?: boolean }) => (
  <Icon>
    <path d={left ? "M10 3.5 5.5 8l4.5 4.5" : "M6 3.5 10.5 8 6 12.5"} />
  </Icon>
);

// Botón de la barra de estado: ícono siempre, texto desde sm.
function ToolButton({
  icon,
  label,
  pressed,
  className = "",
  ...props
}: {
  icon: ReactNode;
  label: string;
  pressed?: boolean;
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      title={label}
      className={`label inline-flex h-7 cursor-pointer items-center gap-1.5 px-2 text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:ring-1 aria-pressed:ring-border ${className}`}
      {...props}
    >
      {icon}
      <span className="sr-only sm:not-sr-only">{label}</span>
    </button>
  );
}

// Captura de página completa que aparece con un fundido cuando termina de cargar.
function Shot({ src, alt, ready, onReady }: { src: string; alt: string; ready: boolean; onReady: (src: string) => void }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset(src)}
      alt={alt}
      decoding="async"
      // Si ya estaba en caché, onLoad pudo dispararse antes de hidratar.
      ref={(img) => {
        if (img?.complete && img.naturalWidth > 0) onReady(src);
      }}
      onLoad={() => onReady(src)}
      className={`block w-full transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
    />
  );
}

function Loading({ label, color }: { label: string; color: string }) {
  return (
    <span role="status" className="pointer-events-none absolute inset-0 grid place-items-center" style={{ color }}>
      <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-50" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function Workbook({ locale, labels }: { locale: Locale; labels: Labels }) {
  const [sheetIndex, setSheetIndex] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [live, setLive] = useState(false);
  const [sync, setSync] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [activeNote, setActiveNote] = useState<number | null>(null);
  const [activeCell, setActiveCell] = useState<Cell | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  // En pantallas angostas cabe un solo dispositivo: se elige cuál.
  const [smallView, setSmallView] = useState<Device>("phone");
  const [loaded, setLoaded] = useState<Record<string, true>>({});

  const sheet = sheets[sheetIndex];
  const page = sheet.pages?.[pageIndex] ?? sheet.pages?.[0];
  const geo = page ? pageGeometry[page.slug] : null;
  const anchors = useMemo(() => (page ? anchorsFor(page.slug) : null), [page]);
  const images = page ? pageImages(page.slug) : null;
  const isLive = live && !!page?.liveUrl;
  const title = sheet.title[locale];

  // Refs de objeto (scroll, recorrido) + refs de callback para medir el tamaño (iframes en vivo).
  const phoneRef = useRef<HTMLDivElement | null>(null);
  const browserRef = useRef<HTMLDivElement | null>(null);
  const [observePhone, phoneSize] = useElementSize();
  const [observeBrowser, browserSize] = useElementSize();
  const setPhone = useCallback(
    (node: HTMLDivElement | null) => {
      phoneRef.current = node;
      observePhone(node);
    },
    [observePhone],
  );
  const setBrowser = useCallback(
    (node: HTMLDivElement | null) => {
      browserRef.current = node;
      observeBrowser(node);
    },
    [observeBrowser],
  );
  const stripRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Dispositivo que el usuario está moviendo: solo ese propaga su scroll al otro.
  const driver = useRef<Device | null>(null);
  const preloaded = useRef(new Set<string>());

  const markLoaded = useCallback((src: string) => setLoaded((prev) => (prev[src] ? prev : { ...prev, [src]: true })), []);

  // Precarga las capturas de una hoja (al pasar el mouse por su pestaña o al estar al lado).
  const preload = useCallback((target: Sheet | undefined) => {
    const first = target?.pages?.[0];
    if (!first) return;
    const { desktop, mobile } = pageImages(first.slug);
    for (const src of [mobile, desktop]) {
      if (preloaded.current.has(src)) continue;
      preloaded.current.add(src);
      const img = new window.Image();
      img.src = asset(src);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      preload(sheets[sheetIndex + 1]);
      preload(sheets[sheetIndex - 1]);
    }, 700);
    return () => window.clearTimeout(id);
  }, [sheetIndex, preload]);

  // Mantiene visible la pestaña activa dentro de la tira.
  useEffect(() => {
    const strip = stripRef.current;
    const tab = tabRefs.current[sheetIndex];
    if (!strip || !tab) return;
    const behavior = prefersReducedMotion() ? "auto" : "smooth";
    if (tab.offsetLeft < strip.scrollLeft) strip.scrollTo({ left: tab.offsetLeft - 32, behavior });
    else if (tab.offsetLeft + tab.offsetWidth > strip.scrollLeft + strip.clientWidth)
      strip.scrollTo({ left: tab.offsetLeft + tab.offsetWidth - strip.clientWidth + 32, behavior });
  }, [sheetIndex]);

  function resetView() {
    setPlaying(false);
    setActiveNote(null);
    setActiveCell(null);
    driver.current = null;
    phoneRef.current?.scrollTo({ top: 0 });
    browserRef.current?.scrollTo({ top: 0 });
  }

  function selectSheet(index: number) {
    const next = (index + sheets.length) % sheets.length;
    if (next === sheetIndex) return;
    setSheetIndex(next);
    setPageIndex(0);
    if (!sheets[next].pages?.[0]?.liveUrl) setLive(false);
    resetView();
  }

  function selectPage(index: number) {
    if (index === pageIndex) return;
    setPageIndex(index);
    resetView();
  }

  function onTabKeyDown(e: React.KeyboardEvent, index: number) {
    const keys: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: sheets.length - 1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const next = (keys[e.key] + sheets.length) % sheets.length;
    selectSheet(next);
    tabRefs.current[next]?.focus();
  }

  // El usuario toma el control de un dispositivo: deja de propagar el otro y corta el recorrido.
  function take(device: Device, interrupt: boolean) {
    if (interrupt && playing) setPlaying(false);
    if (!playing || interrupt) driver.current = device;
  }

  function onScroll(source: Device) {
    if (!sync || isLive || !anchors || driver.current !== source) return;
    const src = source === "phone" ? phoneRef.current : browserRef.current;
    const dst = source === "phone" ? browserRef.current : phoneRef.current;
    if (!src || !isVisible(dst)) return;
    const f = src.scrollTop / src.scrollHeight;
    const g =
      source === "phone" ? mapFraction(f, anchors.mobile, anchors.desktop) : mapFraction(f, anchors.desktop, anchors.mobile);
    dst.scrollTop = g * dst.scrollHeight;
  }

  // Recorrido automático: baja por el dispositivo principal visible (celular si se ve).
  useEffect(() => {
    if (!playing) return;
    const el = isVisible(phoneRef.current) ? phoneRef.current : browserRef.current;
    if (!el) return;
    driver.current = el === phoneRef.current ? "phone" : "browser";
    const max = el.scrollHeight - el.clientHeight;
    let pos = el.scrollTop >= max - 2 ? 0 : el.scrollTop;
    el.scrollTop = pos;
    const speed = Math.max(60, max / 40);
    let last = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      pos = Math.min(max, pos + speed * dt);
      el.scrollTop = pos;
      if (pos >= max) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  // Ir a la sección de una anotación (en escritorio si se ve; si no, en el celular).
  function goToNote(section: number, index: number) {
    if (!geo) return;
    setPlaying(false);
    setActiveNote(index);
    setInfoOpen(false);
    const useBrowser = isVisible(browserRef.current);
    const el = useBrowser ? browserRef.current : phoneRef.current;
    if (!el) return;
    driver.current = useBrowser ? "browser" : "phone";
    const y = (useBrowser ? geo.desktop.pins : geo.mobile.pins)[section][1];
    el.scrollTo({ top: Math.max(0, y * el.scrollHeight - 32), behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  const deviceHandlers = (device: Device) => ({
    onScroll: () => onScroll(device),
    onPointerEnter: () => take(device, false),
    onPointerDown: () => take(device, true),
    onWheel: () => take(device, true),
    onTouchStart: () => take(device, true),
    onKeyDown: () => take(device, true),
  });

  // Barra de fórmulas: la celda activa (hojas de datos) o el resumen del proyecto.
  const cellText = (cell: Cell) => {
    const row = sheet.table?.rows[cell.row];
    if (!row) return "";
    return [row.area[locale], row.detail[locale], row.tools][cell.col] ?? "";
  };
  const nameBox = activeCell ? `${LETTERS[activeCell.col]}${activeCell.row + 2}` : sheet.kind[locale];
  const formula = activeCell ? cellText(activeCell) : sheet.summary[locale];
  const href = sheet.url ?? page?.liveUrl;
  const hrefLabel = sheet.url ? labels.visit : labels.openDemo;
  const address = page?.liveUrl && (isLive || !sheet.url) ? hostOf(page.liveUrl) : sheet.url ? hostOf(sheet.url) : title;
  const variantLabel = page?.label && sheet.pages && sheet.pages.length > 1 ? page.label[locale] : null;

  return (
    <div className="flex h-full min-h-0 flex-col border border-foreground bg-card">
      {/* ── Pestañas ─────────────────────────────────────────────────────────────── */}
      <div className="flex h-10 shrink-0 items-stretch bg-background">
        <div className="flex shrink-0 items-stretch border-r border-b border-r-border border-b-foreground">
          <button
            type="button"
            onClick={() => selectSheet(sheetIndex - 1)}
            aria-label={labels.prev}
            title={labels.prev}
            className="grid w-8 cursor-pointer place-items-center text-muted transition-colors hover:bg-card hover:text-foreground"
          >
            <Chevron left />
          </button>
          <button
            type="button"
            onClick={() => selectSheet(sheetIndex + 1)}
            aria-label={labels.next}
            title={labels.next}
            className="grid w-8 cursor-pointer place-items-center text-muted transition-colors hover:bg-card hover:text-foreground"
          >
            <Chevron />
          </button>
        </div>
        <div ref={stripRef} role="tablist" aria-label={labels.sheets} className="no-scrollbar relative flex min-w-0 flex-1 items-stretch overflow-x-auto">
          {sheets.map((entry, i) => (
            <button
              key={entry.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`sheet-tab-${entry.id}`}
              aria-selected={i === sheetIndex}
              aria-controls="sheet-panel"
              tabIndex={i === sheetIndex ? 0 : -1}
              onClick={() => selectSheet(i)}
              onKeyDown={(e) => onTabKeyDown(e, i)}
              onPointerEnter={() => preload(entry)}
              onFocus={() => preload(entry)}
              style={{ "--tab": entry.color } as CSSProperties}
              className="group relative flex shrink-0 cursor-pointer items-center gap-2 border-r border-b border-r-border border-b-foreground px-4 text-[13px] whitespace-nowrap text-muted transition-colors hover:bg-card/70 hover:text-foreground aria-selected:border-b-transparent aria-selected:bg-card aria-selected:font-medium aria-selected:text-foreground"
            >
              <span aria-hidden="true" className="size-2 shrink-0 bg-[var(--tab)]" />
              {entry.tab[locale]}
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-[3px] bg-[var(--tab)] opacity-0 transition-opacity group-aria-selected:opacity-100"
              />
            </button>
          ))}
          <a
            href="#contact"
            title={labels.newSheet}
            className="flex shrink-0 items-center border-b border-foreground px-3.5 text-lg text-muted transition-colors hover:text-accent"
          >
            <span aria-hidden="true">+</span>
            <span className="sr-only">{labels.newSheet}</span>
          </a>
          <span aria-hidden="true" className="min-w-4 flex-1 border-b border-foreground" />
        </div>
      </div>

      {/* ── Barra de fórmulas ────────────────────────────────────────────────────── */}
      <div className="flex min-h-10 shrink-0 items-stretch border-b border-border text-sm leading-snug">
        <span
          title={nameBox}
          className="label flex w-24 shrink-0 items-center truncate border-r border-border px-2.5 text-muted sm:w-36 sm:px-3"
        >
          <span className="truncate">{nameBox}</span>
        </span>
        <span aria-hidden="true" className="flex items-center px-2.5 font-display text-lg text-muted italic">
          fx
        </span>
        {/* El padding va afuera: line-clamp recorta en el borde del padding, no del texto. */}
        <div className="flex min-w-0 flex-1 items-center py-1.5 pr-3">
          <p aria-label={labels.summary} title={formula} className="line-clamp-2 text-pretty">
            {formula}
          </p>
        </div>
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="label flex shrink-0 items-center gap-1.5 border-l border-border px-3 text-foreground transition-colors hover:bg-background hover:text-accent"
          >
            <span className="hidden sm:inline">{hrefLabel}</span>
            <span aria-hidden="true">↗</span>
            <span className="sr-only">
              <span className="sm:hidden">{hrefLabel} </span>
              {labels.opensInNewTab}
            </span>
          </a>
        )}
      </div>

      {/* ── Hoja ─────────────────────────────────────────────────────────────────── */}
      <div
        role="tabpanel"
        id="sheet-panel"
        aria-labelledby={`sheet-tab-${sheet.id}`}
        className="relative flex min-h-0 flex-1"
      >
        {/* Ficha: columna fija desde lg; en pantallas menores se abre encima de la hoja. */}
        <aside
          aria-label={labels.info}
          className={`${infoOpen ? "flex" : "hidden"} absolute inset-0 z-30 flex-col bg-card lg:static lg:z-auto lg:flex lg:w-64 lg:shrink-0 lg:border-r lg:border-border xl:w-72`}
        >
          <div className="device-scroll min-h-0 flex-1 overflow-y-auto p-5">
            <div key={sheet.id} className="animate-sheet-in">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-3xl leading-[1.05] text-balance xl:text-[2.25rem]">{title}</h3>
                <button
                  type="button"
                  onClick={() => setInfoOpen(false)}
                  className="label -mt-1 -mr-1 inline-flex h-8 cursor-pointer items-center px-2 text-muted hover:text-foreground lg:hidden"
                >
                  {labels.close} ✕
                </button>
              </div>
              <p className="mt-2 text-sm leading-snug text-muted">{sheet.meta?.[locale] ?? sheet.kind[locale]}</p>
              <p className="mt-4 text-sm leading-relaxed text-pretty lg:hidden">{sheet.summary[locale]}</p>

              {sheet.pages && sheet.pages.length > 1 && (
                <div className="mt-6">
                  <p className="label text-muted">{labels.variants}</p>
                  <div role="group" aria-label={labels.variants} className="mt-2 grid gap-1.5">
                    {sheet.pages.map((p, i) => (
                      <button
                        key={p.slug}
                        type="button"
                        aria-pressed={i === pageIndex}
                        onClick={() => selectPage(i)}
                        className="group flex cursor-pointer items-center gap-3 border border-border px-3 py-2 text-left text-sm transition-colors hover:border-foreground aria-pressed:border-foreground aria-pressed:bg-background"
                      >
                        <span className="font-mono text-xs text-muted group-aria-pressed:text-accent">{LETTERS[i]}</span>
                        <span className="flex-1">{p.label?.[locale]}</span>
                        <span aria-hidden="true" className="flex -space-x-1">
                          {p.palette.slice(0, 3).map((color) => (
                            <span key={color} className="size-3 rounded-full ring-1 ring-black/20" style={{ backgroundColor: color }} />
                          ))}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {page && page.notes.length > 0 && (
                <div className="mt-6">
                  <p className="label text-muted">{labels.notes}</p>
                  <ol className="mt-2 border-t border-border">
                    {page.notes.map((note, i) => (
                      <li key={note.section} className="border-b border-border">
                        <button
                          type="button"
                          disabled={isLive}
                          onClick={() => goToNote(note.section, i)}
                          onPointerEnter={() => setActiveNote(i)}
                          onPointerLeave={() => setActiveNote(null)}
                          onFocus={() => setActiveNote(i)}
                          onBlur={() => setActiveNote(null)}
                          aria-describedby={`note-${page.slug}-${i}`}
                          className={`group grid w-full cursor-pointer grid-cols-[1.5rem_1fr] gap-2 py-3 text-left transition-colors hover:text-accent disabled:cursor-default disabled:hover:text-foreground ${
                            activeNote === i ? "text-accent" : ""
                          }`}
                        >
                          <span className="font-display text-2xl leading-none text-accent">{i + 1}</span>
                          <span>
                            <span className="block text-sm font-medium">
                              {note.title[locale]}
                              {!isLive && <span className="sr-only"> · {labels.noteGoTo}</span>}
                            </span>
                            <span id={`note-${page.slug}-${i}`} className="mt-1 block text-[13px] leading-relaxed text-pretty text-muted">
                              {note.text[locale]}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <dl className="mt-6 space-y-4 text-sm">
                {page && (
                  <>
                    <div>
                      <dt className="label text-muted">{labels.fonts}</dt>
                      <dd className="mt-1">{page.fonts.join(" + ")}</dd>
                    </div>
                    <div>
                      <dt className="label text-muted">{labels.palette}</dt>
                      <dd className="mt-1.5 flex gap-1">
                        {page.palette.map((color) => (
                          <span key={color} title={color} className="h-6 flex-1 ring-1 ring-black/15 ring-inset" style={{ backgroundColor: color }} />
                        ))}
                      </dd>
                    </div>
                  </>
                )}
                <div>
                  <dt className="label text-muted">{labels.builtWith}</dt>
                  <dd className="mt-1 font-mono text-xs leading-relaxed">{sheet.stack.join(" · ")}</dd>
                </div>
              </dl>
            </div>
          </div>
        </aside>

        {/* Escenario */}
        {sheet.table ? (
          <DataSheet sheet={sheet} locale={locale} activeCell={activeCell} onSelect={setActiveCell} />
        ) : (
          page &&
          geo &&
          images && (
            <div className="relative min-w-0 flex-1 md:grid md:grid-cols-[2rem_minmax(0,1fr)] md:grid-rows-[1.25rem_minmax(0,1fr)]">
              {/* Encabezados de la planilla (decorativos) */}
              <div aria-hidden="true" className="hidden border-r border-b border-border bg-background md:block" />
              <div aria-hidden="true" className="hidden overflow-hidden border-b border-border bg-background md:flex">
                {LETTERS.map((letter) => (
                  <span key={letter} className="w-24 shrink-0 border-r border-border text-center font-mono text-[10px] leading-5 text-muted">
                    {letter}
                  </span>
                ))}
              </div>
              <div aria-hidden="true" className="hidden overflow-hidden border-r border-border bg-background md:block">
                {Array.from({ length: 48 }, (_, i) => (
                  <span key={i} className="block h-7 border-b border-border text-center font-mono text-[10px] leading-7 text-muted">
                    {i + 1}
                  </span>
                ))}
              </div>

              <div className="sheet-grid absolute inset-0 md:relative md:inset-auto">
                <div className="absolute inset-0 flex items-center justify-center gap-4 p-3 sm:p-5 lg:gap-6">
                  {/* Celular */}
                  <div
                    className={`${smallView === "phone" ? "block" : "hidden"} relative h-full w-full md:block md:aspect-[9/19.5] md:max-h-[46rem] md:w-auto md:shrink-0 md:rounded-[2.5rem] md:bg-[#1b1916] md:p-[7px] md:shadow-[0_28px_50px_-28px_rgb(0_0_0/0.55)] md:dark:ring-1 md:dark:ring-white/15`}
                  >
                    <span
                      aria-hidden="true"
                      className="absolute top-[11px] left-1/2 z-20 hidden h-4 w-16 -translate-x-1/2 rounded-full bg-[#1b1916] md:block"
                    />
                    <div
                      className="relative h-full w-full overflow-hidden border border-border md:rounded-[2.05rem] md:border-0"
                      style={{ backgroundColor: page.palette[0] }}
                    >
                      <div
                        ref={setPhone}
                        tabIndex={0}
                        aria-label={`${labels.mobile}: ${title}`}
                        className={`device-scroll h-full ${isLive ? "overflow-hidden" : "overflow-y-auto"}`}
                        {...deviceHandlers("phone")}
                      >
                        {isLive ? (
                          phoneSize.w > 0 && (
                            <iframe
                              key={`live-m-${page.slug}`}
                              src={page.liveUrl}
                              title={`${labels.liveTitle} (${labels.mobile}): ${title}`}
                              className="absolute top-0 left-0 origin-top-left border-0 bg-white"
                              style={{ width: 390, height: phoneSize.h / (phoneSize.w / 390), transform: `scale(${phoneSize.w / 390})` }}
                            />
                          )
                        ) : (
                          <div
                            key={page.slug}
                            className="animate-sheet-in relative"
                            style={{ aspectRatio: `${geo.mobile.width} / ${geo.mobile.height}` }}
                          >
                            <Shot
                              src={images.mobile}
                              alt={`${labels.screenshotAlt} (${labels.mobile}): ${title}`}
                              ready={!!loaded[images.mobile]}
                              onReady={markLoaded}
                            />
                            {page.notes.map((note, i) => (
                              <span
                                key={note.section}
                                aria-hidden="true"
                                className={`absolute left-1.5 grid size-5 place-items-center rounded-full bg-accent font-mono text-[10px] text-accent-foreground shadow transition-transform ${
                                  activeNote === i ? "scale-125" : ""
                                }`}
                                style={{ top: `${geo.mobile.pins[note.section][1] * 100}%` }}
                              >
                                {i + 1}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {!isLive && !loaded[images.mobile] && <Loading label={labels.loading} color={page.palette[1]} />}
                    </div>
                  </div>

                  {/* Escritorio */}
                  <div
                    className={`${smallView === "browser" ? "flex" : "hidden"} h-full min-w-0 flex-1 flex-col border border-foreground bg-card md:flex md:max-h-[46rem] md:shadow-[0_28px_50px_-30px_rgb(0_0_0/0.45)]`}
                  >
                    <div className="flex h-8 shrink-0 items-center gap-3 border-b border-foreground px-3">
                      <span aria-hidden="true" className="flex w-10 shrink-0 gap-1.5">
                        {[0, 1, 2].map((dot) => (
                          <span key={dot} className="size-2 rounded-full bg-foreground/20" />
                        ))}
                      </span>
                      <span className="mx-auto min-w-0 truncate bg-background px-3 py-0.5 text-center font-mono text-[11px] text-muted">
                        {address}
                        {variantLabel && <span className="hidden sm:inline"> · {variantLabel}</span>}
                      </span>
                      <span aria-hidden="true" className="w-10 shrink-0" />
                    </div>
                    <div className="relative min-h-0 flex-1" style={{ backgroundColor: page.palette[0] }}>
                      <div
                        ref={setBrowser}
                        tabIndex={0}
                        aria-label={`${labels.desktop}: ${title}`}
                        className={`device-scroll absolute inset-0 ${isLive ? "overflow-hidden" : "overflow-y-auto"}`}
                        {...deviceHandlers("browser")}
                      >
                        {isLive ? (
                          browserSize.w > 0 && (
                            <iframe
                              key={`live-d-${page.slug}`}
                              src={page.liveUrl}
                              title={`${labels.liveTitle} (${labels.desktop}): ${title}`}
                              className="absolute top-0 left-0 origin-top-left border-0 bg-white"
                              style={{
                                width: 1280,
                                height: browserSize.h / (browserSize.w / 1280),
                                transform: `scale(${browserSize.w / 1280})`,
                              }}
                            />
                          )
                        ) : (
                          <div
                            key={page.slug}
                            className="animate-sheet-in relative"
                            style={{ aspectRatio: `${geo.desktop.width} / ${geo.desktop.height}` }}
                          >
                            <Shot
                              src={images.desktop}
                              alt={`${labels.screenshotAlt} (${labels.desktop}): ${title}`}
                              ready={!!loaded[images.desktop]}
                              onReady={markLoaded}
                            />
                            {page.notes.map((note, i) => {
                              const [x, y] = geo.desktop.pins[note.section];
                              const right = x > 0.55;
                              return (
                                <span
                                  key={note.section}
                                  className="group/pin absolute z-10"
                                  style={{ left: `${Math.max(1.5, x * 100 - 3.5)}%`, top: `${y * 100}%` }}
                                  onPointerEnter={() => setActiveNote(i)}
                                  onPointerLeave={() => setActiveNote(null)}
                                >
                                  <span
                                    aria-hidden="true"
                                    className={`grid size-5 place-items-center rounded-full bg-accent font-mono text-[10px] text-accent-foreground shadow-lg ring-2 ring-accent/25 transition-transform sm:size-7 sm:text-xs sm:ring-4 ${
                                      activeNote === i ? "scale-125" : ""
                                    }`}
                                  >
                                    {i + 1}
                                  </span>
                                  <span
                                    aria-hidden="true"
                                    className={`pointer-events-none absolute top-0 w-64 border border-foreground bg-card p-3 text-left text-foreground opacity-0 shadow-xl transition-opacity ${
                                      right ? "right-9" : "left-9"
                                    } ${activeNote === i ? "opacity-100" : ""}`}
                                  >
                                    <span className="block text-sm font-semibold">{note.title[locale]}</span>
                                    <span className="mt-1 block text-xs leading-relaxed text-muted">{note.text[locale]}</span>
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      {!isLive && !loaded[images.desktop] && <Loading label={labels.loading} color={page.palette[1]} />}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {/* ── Barra de estado ──────────────────────────────────────────────────────── */}
      <div className="flex h-10 shrink-0 items-center gap-3 border-t border-foreground bg-background px-2 sm:px-3">
        <p className="label flex min-w-0 items-center gap-4 text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
            {labels.ready}
          </span>
          <span className="hidden tabular-nums sm:inline">
            {labels.sheet} {pad(sheetIndex + 1)} / {pad(sheets.length)}
          </span>
          <span className="hidden xl:inline">{labels.hint}</span>
        </p>
        <div className="ml-auto flex items-center gap-1">
          {page && (
            <>
              <ToolButton
                icon={playing ? <PauseIcon /> : <PlayIcon />}
                label={playing ? labels.pause : labels.play}
                pressed={playing}
                disabled={isLive}
                onClick={() => setPlaying((p) => !p)}
              />
              {/* Con un solo dispositivo a la vista no hay nada que sincronizar. */}
              <span className="hidden md:contents">
                <ToolButton
                  icon={<SyncIcon />}
                  label={labels.sync}
                  pressed={sync}
                  disabled={isLive}
                  onClick={() => setSync((s) => !s)}
                />
              </span>
              {page.liveUrl && (
                <div role="group" aria-label={labels.view} className="flex border-l border-border pl-1">
                  <ToolButton icon={<ImageIcon />} label={labels.screens} pressed={!live} onClick={() => setLive(false)} />
                  <ToolButton
                    icon={<LiveIcon />}
                    label={labels.live}
                    pressed={live}
                    onClick={() => {
                      setPlaying(false);
                      setLive(true);
                    }}
                  />
                </div>
              )}
              <div role="group" aria-label={labels.view} className="flex border-l border-border pl-1 md:hidden">
                <ToolButton
                  icon={<PhoneIcon />}
                  label={labels.mobile}
                  pressed={smallView === "phone"}
                  onClick={() => setSmallView("phone")}
                  className="[&>span]:sr-only"
                />
                <ToolButton
                  icon={<DesktopIcon />}
                  label={labels.desktop}
                  pressed={smallView === "browser"}
                  onClick={() => setSmallView("browser")}
                  className="[&>span]:sr-only"
                />
              </div>
            </>
          )}
          <ToolButton
            icon={<InfoIcon />}
            label={labels.info}
            pressed={infoOpen}
            onClick={() => setInfoOpen((o) => !o)}
            className="border-l border-border lg:hidden"
          />
        </div>
      </div>
    </div>
  );
}

// Hoja de datos: una planilla de verdad, con letras de columna, números de fila y celda activa.
function DataSheet({
  sheet,
  locale,
  activeCell,
  onSelect,
}: {
  sheet: Sheet;
  locale: Locale;
  activeCell: Cell | null;
  onSelect: (cell: Cell) => void;
}) {
  const table = sheet.table!;
  const filler = Math.max(0, 18 - table.rows.length);
  const cellClass = (row: number, col: number) =>
    `cursor-cell border-r border-b border-border px-3 py-2.5 align-top ${
      activeCell?.row === row && activeCell.col === col ? "outline-2 -outline-offset-2 outline-accent" : ""
    }`;

  return (
    <div key={sheet.id} className="device-scroll animate-sheet-in relative min-w-0 flex-1 overflow-auto bg-card">
      <table className="w-full min-w-[42rem] border-separate border-spacing-0 text-left text-sm">
        <thead className="sticky top-0 z-10 bg-background">
          <tr aria-hidden="true">
            <th className="w-8 border-r border-b border-border" />
            {LETTERS.slice(0, 4).map((letter) => (
              <th key={letter} className="h-5 border-r border-b border-border text-center font-mono text-[10px] font-normal text-muted">
                {letter}
              </th>
            ))}
          </tr>
          <tr>
            <td aria-hidden="true" className="border-r border-b border-border text-center font-mono text-[10px] text-muted">
              1
            </td>
            {table.columns.map((column) => (
              <th key={column.es} scope="col" className="label border-r border-b border-border bg-card px-3 py-2 font-medium text-foreground">
                {column[locale]}
              </th>
            ))}
            <td aria-hidden="true" className="border-b border-border bg-card" />
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            <tr key={row.area.es} className="transition-colors hover:bg-background/60">
              <td aria-hidden="true" className="w-8 border-r border-b border-border text-center font-mono text-[10px] text-muted">
                {r + 2}
              </td>
              <th scope="row" className={`${cellClass(r, 0)} w-44 font-medium`} onClick={() => onSelect({ row: r, col: 0 })}>
                {row.area[locale]}
              </th>
              <td className={`${cellClass(r, 1)} leading-relaxed text-pretty`} onClick={() => onSelect({ row: r, col: 1 })}>
                {row.detail[locale]}
              </td>
              <td className={`${cellClass(r, 2)} w-52 font-mono text-xs text-muted`} onClick={() => onSelect({ row: r, col: 2 })}>
                {row.tools}
              </td>
              <td aria-hidden="true" className="w-16 border-b border-border" />
            </tr>
          ))}
          {Array.from({ length: filler }, (_, i) => (
            <tr key={`empty-${i}`} aria-hidden="true">
              <td className="h-8 border-r border-b border-border text-center font-mono text-[10px] text-muted">
                {table.rows.length + i + 2}
              </td>
              <td className="border-r border-b border-border" />
              <td className="border-r border-b border-border" />
              <td className="border-r border-b border-border" />
              <td className="border-b border-border" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
