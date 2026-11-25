"use client";

import { useState } from "react";

const tones = {
  // Sobre papel (presentación).
  plain: "border-border text-muted hover:border-foreground hover:text-foreground",
  // Sobre el bloque invertido de contacto (fondo tinta, texto papel).
  inverse: "border-background/50 hover:bg-background hover:text-foreground",
};

export function CopyButton({
  value,
  label,
  done,
  tone = "plain",
}: {
  value: string;
  label: string;
  done: string;
  tone?: keyof typeof tones;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso de portapapeles: el enlace mailto sigue disponible.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`label inline-flex h-8 cursor-pointer items-center border px-2.5 transition-colors ${tones[tone]}`}
    >
      <span aria-live="polite">{copied ? `${done} ✓` : label}</span>
    </button>
  );
}
