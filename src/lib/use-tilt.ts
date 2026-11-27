"use client";

import { useEffect, type RefObject } from "react";
import { motion, prefersReducedMotion, startMotion } from "./motion";

// Inclinación 3D que sigue al mouse (en escritorio), al giroscopio (en celular) o, sin ninguno de
// los dos, flota sola. Escribe variables CSS en el elemento y el CSS decide qué rota:
//   --rx, --ry    rotación en grados (ya multiplicada por --tilt)
//   --tilt        1 = en perspectiva; baja a 0 mientras el mouse está encima (o tras tocarlo en
//                 celular) si `flattenOnHover`, para leer y hacer scroll cómodo
//   --gx, --gy    posición del brillo (0–100 %), para reflejos
// `force` (ref) vuelve a poner todo en perspectiva aunque el mouse esté encima: p. ej. mientras
// la pila de hojas cambia de hoja.
// El elemento medido no debe rotar él mismo (se rotan sus hijos), para que la medida sea estable.
export function useTilt(
  ref: RefObject<HTMLElement | null>,
  {
    max = 10,
    flattenOnHover = false,
    idle = true,
    force,
  }: { max?: number; flattenOnHover?: boolean; idle?: boolean; force?: RefObject<boolean> } = {},
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.style.setProperty("--tilt", flattenOnHover ? "0" : "1");
      return;
    }
    startMotion();

    let rx = 0;
    let ry = 0;
    let tilt = 0;
    let hovered = false;
    let touchedAt = 0;
    let visible = false;
    let frame = 0;

    const enter = (e: PointerEvent) => {
      if (e.pointerType === "mouse") hovered = true;
    };
    const leave = (e: PointerEvent) => {
      if (e.pointerType === "mouse") hovered = false;
    };
    // En pantallas táctiles, tocar el elemento lo endereza un rato.
    const touch = () => {
      touchedAt = performance.now();
    };
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("touchstart", touch, { passive: true });

    const clamp = (v: number) => Math.max(-1, Math.min(1, v));

    function tick(now: number) {
      frame = 0;
      if (!visible || !el) return;
      let tx = 0;
      let ty = 0;
      let gx = 50;
      let gy = 30;
      if (motion.mouseAt) {
        const r = el.getBoundingClientRect();
        // Normaliza por el tamaño del elemento o por media pantalla: responde aunque el mouse esté lejos.
        const nx = clamp((motion.mouseX - (r.left + r.width / 2)) / Math.max(r.width / 2, window.innerWidth * 0.32));
        const ny = clamp((motion.mouseY - (r.top + r.height / 2)) / Math.max(r.height / 2, window.innerHeight * 0.32));
        tx = -ny * max;
        ty = nx * max;
        gx = 50 + nx * 50;
        gy = 50 + ny * 50;
      } else if (now - motion.gyroAt < 1000) {
        tx = -motion.gy * max;
        ty = motion.gx * max;
        gx = 50 + motion.gx * 50;
        gy = 50 + motion.gy * 50;
      } else if (idle) {
        tx = Math.sin(now / 2300) * max * 0.35;
        ty = Math.sin(now / 2900) * max * 0.5;
        gx = 50 + Math.sin(now / 2900) * 40;
      }
      const flat = flattenOnHover && (hovered || now - touchedAt < 4000) && !force?.current;
      const target = flat ? 0 : 1;
      rx += (tx - rx) * 0.08;
      ry += (ty - ry) * 0.08;
      tilt += (target - tilt) * (force?.current ? 0.2 : 0.1);
      // Cerca del objetivo se fija: una rotación residual deja el texto borroso.
      if (Math.abs(tilt - target) < 0.004) tilt = target;
      const snap = (v: number) => (Math.abs(v) < 0.02 ? "0deg" : `${v.toFixed(2)}deg`);
      el.style.setProperty("--rx", snap(rx * tilt));
      el.style.setProperty("--ry", snap(ry * tilt));
      el.style.setProperty("--tilt", tilt.toFixed(3));
      el.style.setProperty("--gx", `${gx.toFixed(1)}%`);
      el.style.setProperty("--gy", `${gy.toFixed(1)}%`);
      frame = requestAnimationFrame(tick);
    }

    // Solo se anima mientras está en pantalla.
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !frame) frame = requestAnimationFrame(tick);
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("touchstart", touch);
    };
  }, [ref, max, flattenOnHover, idle, force]);
}
