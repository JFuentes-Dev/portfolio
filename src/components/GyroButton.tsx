"use client";

import { useEffect, useState } from "react";
import { motion, needsGyroPermission, requestGyro, startMotion } from "@/lib/motion";

// Solo en iPhone/iPad: el giroscopio necesita un toque del usuario para pedir permiso. Aparece si,
// pasado un momento, no llegó ninguna lectura del giroscopio y el navegador pide permiso; en
// Android las lecturas llegan solas y el botón nunca se muestra.
export function GyroButton({ label }: { label: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches || !needsGyroPermission()) return;
    startMotion();
    const id = window.setTimeout(() => setVisible(motion.gyroAt === 0), 1200);
    return () => window.clearTimeout(id);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        if (await requestGyro()) setVisible(false);
      }}
      className="label inline-flex h-9 items-center gap-2 border border-border-strong bg-background/70 px-3 text-foreground backdrop-blur-sm"
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" className="size-4 text-accent">
        <rect x="4.5" y="1.5" width="7" height="13" rx="1.6" />
        <path d="M1.5 5.5c-.7 1.6-.7 3.4 0 5M14.5 5.5c.7 1.6.7 3.4 0 5" />
      </svg>
      {label}
    </button>
  );
}
