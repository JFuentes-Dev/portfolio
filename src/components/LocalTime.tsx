"use client";

import { useEffect, useState } from "react";

// Hora actual en la zona dada (HH:MM). En el HTML estático va "--:--" y se completa al montar,
// para no generar diferencias de hidratación.
export function LocalTime({ timeZone, locale }: { timeZone: string; locale: string }) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const format = new Intl.DateTimeFormat(locale, { timeZone, hour: "2-digit", minute: "2-digit", hour12: false });
    const tick = () => setTime(format.format(new Date()));
    tick();
    const id = window.setInterval(tick, 20_000);
    return () => window.clearInterval(id);
  }, [timeZone, locale]);

  return <time className="tabular-nums">{time ?? "--:--"}</time>;
}
