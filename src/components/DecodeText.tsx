"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";

// Texto que se "decodifica": parte como caracteres al azar y se resuelve de izquierda a derecha.
// Con una fuente monoespaciada no se mueve nada al cambiar letras. Los caracteres de ruido son
// letras, números y símbolos que no abren cortes de línea, para que el texto no salte de renglón.
//
// El HTML estático trae el texto final (buscadores, sin JS). Con JS, el elemento con
// `data-decode` queda oculto hasta el primer cuadro (ver globals.css) y se muestra ya revuelto.
// Las letras se cambian directo en el DOM: nada de re-renders por cuadro.
const NOISE = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#*=<>&";

export function DecodeText({
  parts,
  delay = 150,
  duration = 1500,
}: {
  parts: { text: string; className?: string }[];
  delay?: number;
  duration?: number;
}) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const full = parts.map((part) => part.text).join("");

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const host = root.closest<HTMLElement>("[data-decode]");
    const show = () => host?.setAttribute("data-decoded", "");
    const spans = Array.from(root.querySelectorAll<HTMLElement>("[data-part]"));
    const texts = spans.map((span) => span.textContent ?? "");
    if (prefersReducedMotion()) {
      show();
      return;
    }

    const chars = Array.from(texts.join(""));
    const n = chars.length;
    const revealAt = chars.map((_, i) => delay + (i / n) * duration * 0.65 + Math.random() * duration * 0.35);
    const write = (elapsed: number) => {
      let offset = 0;
      spans.forEach((span, s) => {
        const len = texts[s].length;
        let out = "";
        for (let i = offset; i < offset + len; i++) {
          const ch = chars[i];
          out += ch === " " || elapsed >= revealAt[i] ? ch : NOISE[Math.floor(Math.random() * NOISE.length)];
        }
        span.textContent = out;
        offset += len;
      });
    };

    write(0);
    show();
    const start = performance.now();
    let lastWrite = 0;
    let frame = requestAnimationFrame(function step(now) {
      const elapsed = now - start;
      if (elapsed > delay + duration) {
        spans.forEach((span, s) => (span.textContent = texts[s]));
        return;
      }
      // Un cambio cada ~55 ms: se ve "digital", no un borrón.
      if (now - lastWrite > 55) {
        lastWrite = now;
        write(elapsed);
      }
      frame = requestAnimationFrame(step);
    });
    return () => {
      cancelAnimationFrame(frame);
      spans.forEach((span, s) => (span.textContent = texts[s]));
      show();
    };
  }, [full, delay, duration]);

  return (
    <>
      <span className="sr-only">{full}</span>
      <span ref={rootRef} aria-hidden="true">
        {parts.map((part, i) => (
          <span key={i} data-part={i} className={part.className}>
            {part.text}
          </span>
        ))}
      </span>
    </>
  );
}
