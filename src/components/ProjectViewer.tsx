"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { pageGeometry, pageImages, sheets, type PageSlug, type Sheet } from "@/content/sheets";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { asset } from "@/lib/asset";
import { useTilt } from "@/lib/use-tilt";

// Demo de un trabajo, a pantalla completa (<dialog>): se abre desde la pared de trabajos de la
// landing. Entra girando en 3D; ← → pasan al trabajo anterior o siguiente; Esc, la ✕ o un clic
// fuera lo cierran.
// - Trabajos visuales: el sitio en celular y escritorio, scroll sincronizado, anotaciones,
//   variantes, vista en vivo y recorrido automático. Si además tienen lista de tareas (Sellside),
//   va en la ficha, junto con una aclaración sobre de quién es el sitio.
// - Trabajos solo de datos: qué hago y con qué.

type Device = "phone" | "browser";
type Labels = Dictionary["work"];

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const pad = (n: number) => String(n).padStart(2, "0");
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isVisible = (el: HTMLElement | null): el is HTMLElement => !!el && el.offsetParent !== null;

export function ProjectDialog({
  index,
  onClose,
  onNavigate,
  locale,
  labels,
}: {
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
  locale: Locale;
  labels: Labels;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const total = sheets.length;
  const sheet = index === null ? null : sheets[index];

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (index !== null && !dialog.open) dialog.showModal();
    if (index === null && dialog.open) dialog.close();
  }, [index]);

  const go = (step: number) => index !== null && onNavigate((index + step + total) % total);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("input, textarea, select")) return;
    if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
  };

  const href = sheet ? (sheet.url ?? sheet.pages?.[0]?.liveUrl) : undefined;
  const hrefLabel = sheet?.url ? labels.visit : labels.openSite;

  return (
    <dialog
      ref={ref}
      aria-labelledby="project-title"
      className="project-dialog"
      onClose={onClose}
      onKeyDown={onKeyDown}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close();
      }}
    >
      {sheet && index !== null && (
        <div key={sheet.id} className="project-panel">
          <header className="relative flex shrink-0 items-start gap-3 border-b border-border px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px]" style={{ backgroundColor: sheet.color }} />
            <div className="min-w-0 flex-1">
              <p className="label flex flex-wrap items-center gap-x-2 text-muted">
                <span className="text-accent tabular-nums">{pad(index + 1)}</span>
                <span className="text-faint">/ {pad(total)}</span>
                <span className="text-faint">·</span>
                {sheet.kind[locale]}
              </p>
              <h2
                id="project-title"
                className="mt-1.5 font-display text-[clamp(1.35rem,2.2vw,2.1rem)] leading-none font-medium tracking-[-0.05em] [font-stretch:87.5%]"
              >
                {sheet.title[locale]}
              </h2>
              <p className="mt-2 hidden max-w-4xl text-sm leading-snug text-pretty text-muted md:line-clamp-2">{sheet.summary[locale]}</p>
            </div>
            {href && (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border-strong px-3 font-mono text-[11px] text-foreground transition-colors hover:border-accent hover:text-accent"
              >
                <span className="hidden sm:inline">{hrefLabel}</span>
                <span aria-hidden="true">↗</span>
                <span className="sr-only">
                  <span className="sm:hidden">{hrefLabel} </span>
                  {labels.opensInNewTab}
                </span>
              </a>
            )}
            <div className="hidden shrink-0 gap-1.5 sm:flex">
              <ArrowButton left label={labels.prev} onClick={() => go(-1)} />
              <ArrowButton label={labels.next} onClick={() => go(1)} />
            </div>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label={labels.close}
              title={labels.close}
              className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-md border border-border-strong text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <Icon>
                <path d="M4 4l8 8M12 4l-8 8" strokeWidth="1.6" />
              </Icon>
            </button>
          </header>

          {sheet.pages ? <PagesBody key={sheet.id} sheet={sheet} locale={locale} labels={labels} /> : <DataBody sheet={sheet} locale={locale} labels={labels} />}
        </div>
      )}
    </dialog>
  );
}

// ── Utilidades de los trabajos visuales ───────────────────────────────────────────────────────────

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

// Botón de la barra de controles: ícono siempre, texto desde sm.
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
      className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2.5 font-mono text-[11px] text-muted transition-colors hover:bg-raised hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 aria-pressed:bg-raised aria-pressed:text-accent ${className}`}
      {...props}
    >
      {icon}
      <span className="sr-only sm:not-sr-only">{label}</span>
    </button>
  );
}

function ArrowButton({ left = false, label, onClick }: { left?: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-md border border-border-strong text-muted transition-colors hover:border-accent hover:text-accent"
    >
      <Chevron left={left} />
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

// Trabajo de datos: qué hago y con qué, fila por fila.
function DataBody({ sheet, locale, labels }: { sheet: Sheet; locale: Locale; labels: Labels }) {
  const table = sheet.table!;
  return (
    <div className="device-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
      {sheet.meta && <p className="pt-4 text-sm text-muted">{sheet.meta[locale]}</p>}
      <p className="mt-4 text-sm text-pretty md:hidden">{sheet.summary[locale]}</p>
      <ol className="mt-2 divide-y divide-border">
        {table.rows.map((row, r) => (
          <li key={row.area.es} className="grid gap-x-6 gap-y-1.5 py-4 sm:grid-cols-[3rem_12rem_minmax(0,1fr)] xl:grid-cols-[3rem_14rem_minmax(0,1fr)_16rem]">
            <span className="font-mono text-lg leading-6 text-accent tabular-nums">{pad(r + 1)}</span>
            <h4 className="font-medium leading-6">{row.area[locale]}</h4>
            <p className="text-sm leading-6 text-pretty text-muted">{row.detail[locale]}</p>
            <p className="font-mono text-[11px] leading-6 text-ice sm:col-start-3 xl:col-start-auto">{row.tools}</p>
          </li>
        ))}
      </ol>
      <p className="label mt-4 text-faint">{labels.builtWith}</p>
      <p className="mt-1 font-mono text-xs text-foreground/90">{sheet.stack.join(" · ")}</p>
    </div>
  );
}

// Trabajo visual: celular y escritorio con todos los controles.
function PagesBody({ sheet, locale, labels }: { sheet: Sheet; locale: Locale; labels: Labels }) {
  const [pageIndex, setPageIndex] = useState(0);
  const [live, setLive] = useState(false);
  const [sync, setSync] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [activeNote, setActiveNote] = useState<number | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  // En pantallas angostas cabe un solo dispositivo: se elige cuál.
  const [smallView, setSmallView] = useState<Device>("phone");
  const [loaded, setLoaded] = useState<Record<string, true>>({});

  const page = sheet.pages![pageIndex] ?? sheet.pages![0];
  const geo = pageGeometry[page.slug];
  const anchors = useMemo(() => anchorsFor(page.slug), [page]);
  const images = pageImages(page.slug);
  const isLive = live && !!page.liveUrl;
  const title = sheet.title[locale];

  // Celular y navegador van en perspectiva y se enderezan al pasar encima.
  const devicesRef = useRef<HTMLDivElement>(null);
  useTilt(devicesRef, { max: 3, flattenOnHover: true, idle: false });

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
  // Dispositivo que el usuario está moviendo: solo ese propaga su scroll al otro.
  const driver = useRef<Device | null>(null);
  const markLoaded = useCallback((src: string) => setLoaded((prev) => (prev[src] ? prev : { ...prev, [src]: true })), []);

  function selectPage(index: number) {
    if (index === pageIndex) return;
    setPageIndex(index);
    setPlaying(false);
    setActiveNote(null);
    driver.current = null;
  }

  // El usuario toma el control de un dispositivo: deja de propagar el otro y corta el recorrido.
  function take(device: Device, interrupt: boolean) {
    if (interrupt && playing) setPlaying(false);
    if (!playing || interrupt) driver.current = device;
  }

  function onScroll(source: Device) {
    if (!sync || isLive || driver.current !== source) return;
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

  const address = page.liveUrl && (isLive || !sheet.url) ? hostOf(page.liveUrl) : sheet.url ? hostOf(sheet.url) : title;
  const variantLabel = page.label && sheet.pages!.length > 1 ? page.label[locale] : null;

  return (
    <>
      <div className="relative flex min-h-0 flex-1">
        {/* Ficha: columna fija desde lg; en pantallas menores se abre encima del proyecto. */}
        <aside
          aria-label={labels.info}
          className={`${infoOpen ? "flex" : "hidden"} absolute inset-0 z-30 flex-col bg-card lg:static lg:z-auto lg:flex lg:w-64 lg:shrink-0 lg:border-r lg:border-border xl:w-72`}
        >
          <div className="device-scroll min-h-0 flex-1 overflow-y-auto p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm leading-snug text-muted">{sheet.meta?.[locale] ?? sheet.kind[locale]}</p>
              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                className="label -mt-1 -mr-1 inline-flex h-8 shrink-0 cursor-pointer items-center px-2 text-muted hover:text-foreground lg:hidden"
              >
                {labels.close} ✕
              </button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-pretty lg:hidden">{sheet.summary[locale]}</p>
            {sheet.preview && (
              <p className="mt-4 border-l-2 border-accent/60 pl-3 text-[13px] leading-snug text-muted">{sheet.preview[locale]}</p>
            )}

            {/* Qué hago (trabajos con vista del sitio y además una lista de tareas, como Sellside) */}
            {sheet.table && (
              <div className="mt-6">
                <p className="label text-faint">{labels.whatIDo}</p>
                <ol className="mt-2 border-t border-border">
                  {sheet.table.rows.map((row, r) => (
                    <li key={row.area.es} className="grid grid-cols-[1.75rem_1fr] gap-2 border-b border-border py-3">
                      <span className="font-mono text-[13px] leading-5 text-accent">{pad(r + 1)}</span>
                      <span>
                        <span className="block text-sm font-medium">{row.area[locale]}</span>
                        <span className="mt-1 block text-[13px] leading-relaxed text-pretty text-muted">{row.detail[locale]}</span>
                        <span className="mt-1 block font-mono text-[10px] text-ice">{row.tools}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {sheet.pages!.length > 1 && (
              <div className="mt-6">
                <p className="label text-faint">{labels.variants}</p>
                <div role="group" aria-label={labels.variants} className="mt-2 grid gap-1.5">
                  {sheet.pages!.map((p, i) => (
                    <button
                      key={p.slug}
                      type="button"
                      aria-pressed={i === pageIndex}
                      onClick={() => selectPage(i)}
                      className="group flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2 text-left text-sm transition-colors hover:border-border-strong aria-pressed:border-accent/60 aria-pressed:bg-raised"
                    >
                      <span className="font-mono text-xs text-muted group-aria-pressed:text-accent">{LETTERS[i]}</span>
                      <span className="flex-1">{p.label?.[locale]}</span>
                      <span aria-hidden="true" className="flex -space-x-1">
                        {p.palette.slice(0, 3).map((color) => (
                          <span key={color} className="size-3 rounded-full ring-1 ring-black/40" style={{ backgroundColor: color }} />
                        ))}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {page.notes.length > 0 && (
              <div className="mt-6">
                <p className="label text-faint">{page.notesTitle?.[locale] ?? labels.notes}</p>
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
                        className={`group grid w-full cursor-pointer grid-cols-[1.75rem_1fr] gap-2 py-3 text-left transition-colors hover:text-accent disabled:cursor-default disabled:hover:text-foreground ${
                          activeNote === i ? "text-accent" : ""
                        }`}
                      >
                        <span className="font-mono text-[13px] leading-5 text-accent">{pad(i + 1)}</span>
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
              {/* La ficha de diseño solo va en sitios que diseñé yo (los que tienen tipografías). */}
              {page.fonts && (
                <>
                  <div>
                    <dt className="label text-faint">{labels.fonts}</dt>
                    <dd className="mt-1">{page.fonts.join(" + ")}</dd>
                  </div>
                  <div>
                    <dt className="label text-faint">{labels.palette}</dt>
                    <dd className="mt-1.5 flex gap-1">
                      {page.palette.map((color) => (
                        <span key={color} title={color} className="h-6 flex-1 rounded-[3px] ring-1 ring-white/10 ring-inset" style={{ backgroundColor: color }} />
                      ))}
                    </dd>
                  </div>
                </>
              )}
              <div>
                <dt className="label text-faint">{labels.builtWith}</dt>
                <dd className="mt-1 font-mono text-xs leading-relaxed text-foreground/90">{sheet.stack.join(" · ")}</dd>
              </div>
            </dl>
          </div>
        </aside>

        {/* Dispositivos */}
        <div ref={devicesRef} className="stage-grid relative min-w-0 flex-1">
          <div className="stage-3d absolute inset-0 flex items-center justify-center gap-4 p-3 sm:p-5 lg:gap-8 lg:px-10">
            {/* Celular */}
            <div
              className={`${smallView === "phone" ? "block" : "hidden"} device-phone relative h-full w-full md:block md:aspect-[9/19.5] md:max-h-[46rem] md:w-auto md:shrink-0 md:rounded-[2.5rem] md:bg-[#05070a] md:p-[7px] md:shadow-[0_40px_70px_-30px_rgb(0_0_0/0.9)] md:ring-1 md:ring-white/12`}
            >
              <span aria-hidden="true" className="absolute top-[11px] left-1/2 z-20 hidden h-4 w-16 -translate-x-1/2 rounded-full bg-[#05070a] md:block" />
              <div
                key={page.slug}
                className="animate-sheet-in relative h-full w-full overflow-hidden rounded-md border border-border md:rounded-[2.05rem] md:border-0"
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
                    <div className="relative" style={{ aspectRatio: `${geo.mobile.width} / ${geo.mobile.height}` }}>
                      <Shot src={images.mobile} alt={`${labels.screenshotAlt} (${labels.mobile}): ${title}`} ready={!!loaded[images.mobile]} onReady={markLoaded} />
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
              className={`${smallView === "browser" ? "flex" : "hidden"} device-browser h-full min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border-strong bg-raised md:flex md:max-h-[46rem] md:shadow-[0_40px_70px_-34px_rgb(0_0_0/0.9)]`}
            >
              <div className="flex h-8 shrink-0 items-center gap-3 border-b border-border px-3">
                <span aria-hidden="true" className="flex w-10 shrink-0 gap-1.5">
                  {[0, 1, 2].map((dot) => (
                    <span key={dot} className="size-2 rounded-full bg-border-strong" />
                  ))}
                </span>
                <span className="mx-auto min-w-0 truncate rounded-sm bg-background/70 px-3 py-0.5 text-center font-mono text-[11px] text-muted">
                  {address}
                  {variantLabel && <span className="hidden sm:inline"> · {variantLabel}</span>}
                </span>
                <span aria-hidden="true" className="w-10 shrink-0" />
              </div>
              <div key={page.slug} className="animate-sheet-in relative min-h-0 flex-1" style={{ backgroundColor: page.palette[0] }}>
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
                        style={{ width: 1280, height: browserSize.h / (browserSize.w / 1280), transform: `scale(${browserSize.w / 1280})` }}
                      />
                    )
                  ) : (
                    <div className="relative" style={{ aspectRatio: `${geo.desktop.width} / ${geo.desktop.height}` }}>
                      <Shot src={images.desktop} alt={`${labels.screenshotAlt} (${labels.desktop}): ${title}`} ready={!!loaded[images.desktop]} onReady={markLoaded} />
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
                              className={`grid size-5 place-items-center rounded-full bg-accent font-mono text-[10px] text-accent-foreground shadow-lg ring-2 ring-accent/30 transition-transform sm:size-7 sm:text-xs sm:ring-4 ${
                                activeNote === i ? "scale-125" : ""
                              }`}
                            >
                              {i + 1}
                            </span>
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none absolute top-0 w-64 rounded-md border border-border-strong bg-raised/95 p-3 text-left text-foreground opacity-0 shadow-xl backdrop-blur-sm transition-opacity ${
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

      {/* Controles */}
      <div className="flex h-11 shrink-0 items-center gap-1 border-t border-border px-2 sm:px-3">
        <ToolButton
          icon={playing ? <PauseIcon /> : <PlayIcon />}
          label={playing ? labels.pause : labels.play}
          pressed={playing}
          disabled={isLive}
          onClick={() => setPlaying((p) => !p)}
        />
        {/* Con un solo dispositivo a la vista no hay nada que sincronizar. */}
        <span className="hidden md:contents">
          <ToolButton icon={<SyncIcon />} label={labels.sync} pressed={sync} disabled={isLive} onClick={() => setSync((s) => !s)} />
        </span>
        {page.liveUrl && (
          <div role="group" aria-label={labels.view} className="ml-1 flex gap-0.5 border-l border-border pl-1.5">
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
        <div className="ml-auto flex items-center gap-0.5">
          <div role="group" aria-label={labels.view} className="flex gap-0.5 md:hidden">
            <ToolButton icon={<PhoneIcon />} label={labels.mobile} pressed={smallView === "phone"} onClick={() => setSmallView("phone")} className="[&>span]:sr-only" />
            <ToolButton icon={<DesktopIcon />} label={labels.desktop} pressed={smallView === "browser"} onClick={() => setSmallView("browser")} className="[&>span]:sr-only" />
          </div>
          <ToolButton icon={<InfoIcon />} label={labels.info} pressed={infoOpen} onClick={() => setInfoOpen((o) => !o)} className="lg:hidden" />
        </div>
      </div>
    </>
  );
}
