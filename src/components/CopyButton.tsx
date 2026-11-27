"use client";

import { useState } from "react";

const tones = {
  plain: "border-border-strong text-muted hover:border-accent hover:text-accent",
  // Relleno en ámbar (terminal de contacto).
  accent: "border-accent/60 text-accent hover:bg-accent hover:text-accent-foreground",
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
