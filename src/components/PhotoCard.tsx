"use client";

import Image from "next/image";
import { useRef, type CSSProperties } from "react";
import { asset } from "@/lib/asset";
import { useTilt } from "@/lib/use-tilt";

// Foto en una placa 3D con grosor: se inclina hacia el mouse (o con el giroscopio, o flota sola) y
// las esquinas del visor van por delante, así que se separan de la foto al girar. Encima: tinte
// acero, líneas de barrido y un reflejo que sigue al puntero. El ancho lo da `className`.
export function PhotoCard({ src, alt, priority = false, className = "" }: { src: string; alt: string; priority?: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useTilt(ref, { max: 16 });

  return (
    <figure ref={ref} className={`relative [perspective:900px] ${className}`}>
      <div
        className="photo-card-inner relative [transform-style:preserve-3d]"
        style={{ "--thick": "6px", "--edge": "#1d2534" } as CSSProperties}
      >
        <div className="relative overflow-hidden rounded-md border border-border-strong bg-card">
          <Image
            src={asset(src)}
            alt={alt}
            width={640}
            height={640}
            preload={priority}
            sizes="96px"
            className="aspect-[4/5] w-full object-cover object-[50%_30%] contrast-[1.12] brightness-[0.92] grayscale"
          />
          <span aria-hidden="true" className="photo-tint absolute inset-0" />
          <span aria-hidden="true" className="scanlines absolute inset-0" />
          <span aria-hidden="true" className="photo-glare absolute inset-0" />
        </div>

        {/* Grosor de la placa */}
        <span aria-hidden="true" className="slab-edge slab-edge-t" />
        <span aria-hidden="true" className="slab-edge slab-edge-r" />
        <span aria-hidden="true" className="slab-edge slab-edge-b" />
        <span aria-hidden="true" className="slab-edge slab-edge-l" />

        <span aria-hidden="true" className="hud-corners absolute -inset-1.5 [transform:translateZ(30px)]" />
      </div>
    </figure>
  );
}
