"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { pageImages, sheets } from "@/content/sheets";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { asset } from "@/lib/asset";
import { motion, prefersReducedMotion, startMotion } from "@/lib/motion";
import type { SiteBuilder, Work } from "@/lib/site-builder";
import { ProjectDialog } from "./ProjectViewer";

// La landing es una sola escena 3D (src/lib/site-builder.ts) en un canvas fijo, con secciones de
// texto encima: presentación, las cinco etapas de cómo construyo una web, mis trabajos y contacto.
// Cada sección que llega arriba de la pantalla avanza la línea de tiempo de la escena en 1.
// En "Mis trabajos" las placas de la pared 3D (y la lista) abren la demo de cada trabajo.

const pad = (n: number) => String(n).padStart(2, "0");

// three.js no entiende colores oklch(): el canvas 2D los convierte a hex.
function toHex(color: string) {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return "#ffb547";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function HomeExperience({
  locale,
  intro,
  contact,
  process,
  work,
}: {
  locale: Locale;
  intro: ReactNode;
  contact: ReactNode;
  process: Dictionary["process"];
  work: Dictionary["work"];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const builderRef = useRef<SiteBuilder | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [current, setCurrent] = useState(0);
  const [hovered, setHovered] = useState(-1);
  const [open, setOpen] = useState<number | null>(null);

  const stages = process.sections;
  const worksIndex = stages.length + 1;
  const rail = [process.intro, ...stages.map((stage) => stage.kicker.replace(/^\d+ · /, "")), work.label];
  const railIds = ["top", ...stages.map((stage) => stage.id), "work"];

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    startMotion();

    // Placas de la pared: color, miniatura (o, sin capturas, las líneas de detalle) y textos.
    const works: Work[] = sheets.map((sheet) => ({
      color: toHex(sheet.color),
      thumb: sheet.pages?.[0] ? pageImages(sheet.pages[0].slug).thumb : undefined,
      title: sheet.title[locale],
      kind: sheet.kind[locale],
      lines: sheet.table?.rows.map((row) => row.area[locale]),
    }));

    // Dónde "llega" cada sección: su borde superior justo bajo el header (como al usar un ancla), o el
    // final del scroll si la última sección es más baja que la pantalla.
    let marks: number[] = [];
    const measure = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const header = document.querySelector("header")?.offsetHeight ?? 0;
      marks = Array.from(wrap.querySelectorAll<HTMLElement>("[data-index]")).map((el) =>
        Math.max(0, Math.min(max, el.getBoundingClientRect().top + window.scrollY - header)),
      );
    };
    measure();
    const sectionAt = (y: number) => {
      if (y <= marks[0]) return 0;
      for (let i = 0; i < marks.length - 1; i++) {
        if (y < marks[i + 1]) return i + (y - marks[i]) / Math.max(1, marks[i + 1] - marks[i]);
      }
      return marks.length - 1;
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (barRef.current) barRef.current.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const getInput = () => {
      const now = performance.now();
      let px = 0;
      let py = 0;
      if (motion.mouseAt) {
        px = (motion.mouseX / window.innerWidth) * 2 - 1;
        py = 1 - (motion.mouseY / window.innerHeight) * 2;
      } else if (now - motion.gyroAt < 1000) {
        px = motion.gx;
        py = -motion.gy;
      }
      return { s: sectionAt(window.scrollY), px, py };
    };

    let disposed = false;
    const resizeObserver = new ResizeObserver(() => {
      measure();
      builderRef.current?.resize();
    });
    const onVisibility = () => (document.hidden ? builderRef.current?.stop() : builderRef.current?.start());

    (async () => {
      const family = getComputedStyle(document.documentElement).getPropertyValue("--font-martian").trim() || "monospace";
      await document.fonts.load(`500 64px ${family}`).catch(() => undefined);
      const { createSiteBuilder } = await import("@/lib/site-builder");
      if (disposed) return;
      const builder = createSiteBuilder(canvas, {
        fontFamily: family,
        mobile: window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768,
        reducedMotion: prefersReducedMotion(),
        texts: process.model,
        works,
        assetUrl: asset,
        getInput,
        onLabels: (points) =>
          points.forEach((point, i) => {
            const el = labelRefs.current[i];
            if (!el) return;
            el.style.transform = `translate3d(${point.x.toFixed(1)}px, ${point.y.toFixed(1)}px, 0)`;
            el.style.opacity = point.o.toFixed(3);
          }),
      });
      if (!builder) {
        setFailed(true);
        return;
      }
      builderRef.current = builder;
      resizeObserver.observe(canvas);
      resizeObserver.observe(wrap);
      document.addEventListener("visibilitychange", onVisibility);
      if (!document.hidden) builder.start();
      setReady(true);
    })();

    // Sección actual, para el riel de etapas.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setCurrent(Number((entry.target as HTMLElement).dataset.index));
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    wrap.querySelectorAll<HTMLElement>("[data-index]").forEach((section) => observer.observe(section));

    return () => {
      disposed = true;
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      resizeObserver.disconnect();
      observer.disconnect();
      builderRef.current?.dispose();
      builderRef.current = null;
    };
  }, [process.model, locale]);

  // Placa resaltada en la escena (desde la lista o desde el puntero).
  useEffect(() => {
    builderRef.current?.highlight(open === null ? hovered : -1);
  }, [hovered, open]);

  // Con la demo abierta la escena no se dibuja: no se ve y así no gasta batería.
  useEffect(() => {
    const builder = builderRef.current;
    if (!builder) return;
    if (open !== null) builder.stop();
    else if (!document.hidden) builder.start();
  }, [open]);

  // Sobre la pared de trabajos: el puntero resalta la placa y un clic abre su demo.
  const onWorksPointerMove = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-panel]")) return;
    const index = builderRef.current?.pick(e.clientX, e.clientY) ?? -1;
    setHovered(index);
  };
  const onWorksClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-panel]")) return;
    const index = builderRef.current?.pick(e.clientX, e.clientY) ?? -1;
    if (index >= 0) setOpen(index);
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        data-ready={ready || undefined}
        className="fixed inset-x-0 top-0 z-0 h-lvh w-full opacity-0 transition-opacity duration-[1400ms] data-ready:opacity-100"
      />
      {/* Barra de avance bajo el header */}
      <span aria-hidden="true" className="fixed inset-x-0 top-14 z-30 h-px bg-border/60">
        <span ref={barRef} className="block h-full origin-left scale-x-0 bg-accent" />
      </span>

      {/* Etiquetas de las capas, ubicadas sobre la escena en cada cuadro */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-20">
        {process.layers.map((layer, i) => (
          <span
            key={layer}
            ref={(el) => {
              labelRefs.current[i] = el;
            }}
            className="label absolute top-0 left-0 -translate-y-full border border-border-strong bg-background/80 px-2 py-1 whitespace-nowrap text-foreground opacity-0 backdrop-blur-sm"
          >
            <span className={i === 2 ? "text-accent" : i === 1 ? "text-ice" : "text-muted"}>●</span> {layer}
          </span>
        ))}
      </div>

      {/* Riel de etapas (escritorio) */}
      <nav
        aria-label={process.rail}
        className={`fixed top-1/2 right-5 z-30 hidden -translate-y-1/2 transition-opacity xl:block ${current >= worksIndex ? "pointer-events-none opacity-0" : ""}`}
      >
        <ol className="flex flex-col gap-1">
          {rail.map((label, i) => (
            <li key={railIds[i]}>
              <a
                href={`#${railIds[i]}`}
                aria-current={i === current ? "step" : undefined}
                className="group flex items-center justify-end gap-3 py-1 font-mono text-[11px] text-faint transition-colors hover:text-foreground aria-[current=step]:text-accent"
              >
                <span className="opacity-0 transition-opacity group-hover:opacity-100 group-aria-[current=step]:opacity-100">{label}</span>
                <span className="h-px w-5 bg-current transition-all group-aria-[current=step]:w-9" />
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div ref={wrapRef} className="relative z-10">
        {/* 0 · Presentación */}
        {/* En celular el panel va más abajo: primero se ve la escena. */}
        <section id="top" data-index={0} aria-labelledby="hero-title" className="stage-section max-md:pt-[36svh]">
          <div data-panel className="web3d-panel w-full max-w-[34rem]">
            {intro}
            {failed && <p className="label mt-5 text-faint">{process.noWebgl}</p>}
          </div>
        </section>

        {/* 1–5 · Cómo construyo una web */}
        {stages.map((stage, i) => (
          <section key={stage.id} id={stage.id} data-index={i + 1} className="stage-section">
            <div data-panel className="web3d-panel w-full max-w-[27rem]">
              <p className="label text-accent">{stage.kicker}</p>
              <h2 className="mt-3 font-display text-[clamp(1.6rem,3vw,2.5rem)] leading-[1.06] font-medium tracking-[-0.055em] text-balance [font-stretch:87.5%]">
                {stage.title}
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-pretty text-muted sm:text-base">{stage.text}</p>
            </div>
          </section>
        ))}

        {/* 6 · Mis trabajos */}
        <section
          id="work"
          data-index={worksIndex}
          aria-labelledby="work-title"
          className={`stage-section max-md:pt-[46svh] ${hovered >= 0 ? "cursor-pointer" : ""}`}
          onPointerMove={onWorksPointerMove}
          onPointerLeave={() => setHovered(-1)}
          onClick={onWorksClick}
        >
          <div data-panel className="web3d-panel w-full max-w-[27rem]">
            <p className="label text-accent">
              {pad(worksIndex)} · {work.label}
            </p>
            <h2
              id="work-title"
              className="mt-3 font-display text-[clamp(1.6rem,3vw,2.5rem)] leading-[1.06] font-medium tracking-[-0.055em] text-balance [font-stretch:87.5%]"
            >
              {work.title}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-pretty text-muted">{work.intro}</p>
            <ol aria-label={work.list} className="mt-5 border-t border-border">
              {sheets.map((sheet, i) => (
                <li key={sheet.id} className="border-b border-border">
                  <button
                    type="button"
                    onClick={() => setOpen(i)}
                    onPointerEnter={() => setHovered(i)}
                    onPointerLeave={() => setHovered(-1)}
                    onFocus={() => setHovered(i)}
                    onBlur={() => setHovered(-1)}
                    aria-haspopup="dialog"
                    className={`group flex w-full cursor-pointer items-center gap-3 py-2.5 text-left transition-colors ${
                      hovered === i ? "text-accent" : "hover:text-accent"
                    }`}
                  >
                    <span className="font-mono text-[10px] text-faint tabular-nums">{pad(i + 1)}</span>
                    <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: sheet.color }} />
                    <span className="text-sm font-medium">{sheet.tab[locale]}</span>
                    <span className="ml-auto truncate font-mono text-[10px] text-muted">{sheet.kind[locale]}</span>
                    <span aria-hidden="true" className={`font-mono text-xs transition-transform ${hovered === i ? "translate-x-0.5" : ""}`}>
                      →
                    </span>
                    <span className="sr-only">· {work.open}</span>
                  </button>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-[11px] leading-snug text-faint">{work.note}</p>
          </div>
        </section>

        {/* 7 · Contacto */}
        <div data-index={worksIndex + 1}>{contact}</div>
      </div>

      <ProjectDialog index={open} onClose={() => setOpen(null)} onNavigate={setOpen} locale={locale} labels={work} />
    </>
  );
}
