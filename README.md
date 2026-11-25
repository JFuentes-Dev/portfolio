# Portafolio

Sitio personal de Jorge Fuentes. Next.js 16 (App Router) + TypeScript + Tailwind CSS v4,
bilingüe (`/es`, `/en`) y 100 % estático. Hosteado en GitHub Pages:
https://jfuentes-dev.github.io/portfolio/

## Desarrollo

Requiere Node ≥ 20.9 (recomendado 22 LTS).

```bash
npm install
npm run dev      # http://localhost:3000 → redirige a /es o /en según el navegador
npm run lint
npm run build
```

## Dónde editar el contenido

| Qué | Archivo |
| --- | --- |
| Nombre, correo, foto, redes, zona horaria | `src/content/site.ts` |
| Proyectos (hojas del libro de trabajo) | `src/content/sheets.ts` (capturas en `public/prototypes/<slug>/`) |
| Textos de la interfaz y presentación (ES / EN) | `src/i18n/dictionaries/es.json` y `en.json` |
| Colores y tipografías | tokens en `src/app/globals.css`, fuentes en `src/app/[locale]/layout.tsx` |

Los dos diccionarios deben tener las mismas claves: TypeScript falla el build si falta una.

### Diseño

Dirección editorial: papel, tinta y un solo acento bermellón (contraste AA verificado en claro y
oscuro). Titulares en Instrument Serif, texto en Schibsted Grotesk, metadatos en IBM Plex Mono.
Utilidades `label` y `link-underline` en `globals.css`. La imagen para redes
(`opengraph-image.tsx`) lee la serif desde `src/assets/fonts/` (licencia OFL).

La página son dos bloques de pantalla completa (`100svh` menos el header), con scroll que se
acomoda al inicio de cada uno, y un cierre de contacto:

1. **Presentación** (`Hero`): foto, titular, bajada, contacto y datos. Los tamaños dependen también
   del alto de la ventana para que quepa entero sin scroll (verificado en 1366×657, 1440×789,
   1920×953 y celular 390×664).
2. **Libro de trabajo** (`Workbook`): todos los proyectos como hojas de una planilla.
3. **Contacto y pie** (`Contact`), en tinta.

### Libro de trabajo

Pestañas arriba (una por proyecto, con su color), barra de fórmulas con el tipo de proyecto y el
resumen (y el enlace, si está publicado), la hoja, y una barra de estado con los controles.
Las flechas ← → cambian de hoja cuando las pestañas tienen el foco.

- **Hojas visuales** (`pages`): el sitio en celular (izquierda) y escritorio (derecha) sobre una
  cuadrícula de planilla. Scroll sincronizado sección a sección, anotaciones numeradas
  ("Decisiones de diseño"), variantes A/B/C, modo "En vivo" (iframe, solo con `liveUrl`) y
  recorrido automático. La ficha (título, rol, anotaciones, tipografías, paleta, stack) es una
  columna desde `lg` y un panel desplegable ("Ficha") en pantallas menores; en celular se ve un
  dispositivo a la vez.
- **Hojas de datos** (`table`): para trabajo que no es una pantalla (Sellside: ERP e integraciones),
  una planilla real; al hacer clic en una celda, su referencia y su texto aparecen en la barra de
  fórmulas.

Cada página visual necesita en `public/prototypes/<slug>/` dos capturas JPEG de página completa:
`desktop.jpg` (1280 de ancho) y `mobile.jpg` (390 de ancho a 1.6x = 624 px). Además necesita su
entrada en `src/content/showcase-geometry.json`. Ambas cosas las genera
`scripts/capture-showcase.mjs` (Playwright con el Chrome instalado; instrucciones en su
encabezado): mide dónde empieza cada sección en escritorio y en celular, en el mismo estado en que
se captura. Las anotaciones (`notes[].section`) apuntan a esos índices. Si una página cambia, hay
que recapturar y regenerar la geometría juntas. La lista de páginas a capturar va en un JSON
**fuera del repo**, porque las rutas del proyecto `webs` llevan nombres reales.

Juria se captura desde el sitio publicado y el "Estudio web" es mi propio sitio (demo pública).
Las demás hojas visuales vienen de negocios reales del proyecto `webs`, pero **solo se publican
anonimizadas**: nombre, logo, fotos, teléfonos, redes y direcciones reemplazados, sin link en vivo
y sin precios ni oferta en las capturas; las pestañas llevan el rubro, no un nombre de negocio. Con
el nombre real hace falta permiso escrito del negocio: este repo es público y lo que se sube queda
en el historial.

## Estructura

- `src/app/[locale]/`: layout, página y metadata por idioma (hreflang, Open Graph).
- `src/app/page.tsx`: la raíz `/` redirige a `/es/` (en un sitio estático no hay servidor que
  detecte el idioma del navegador).
- `src/proxy.ts`: redirige `/` al idioma preferido (`Accept-Language`), pero solo en `npm run dev`;
  el export estático lo ignora.
- `src/app/sitemap.ts`, `robots.ts`, `icon.svg`, `[locale]/opengraph-image.tsx`: SEO.
- `src/lib/asset.ts`: antepone el `basePath` a las rutas de `/public`. Úsalo en todo `src` de
  `next/image` o `<img>`.

## Deploy

`.github/workflows/deploy.yml` compila el sitio (`output: "export"`) y lo publica en GitHub Pages
en cada push a `main`. Como el repo no se llama `<usuario>.github.io`, el sitio vive bajo
`/portfolio`: `next.config.ts` calcula ese `basePath` a partir del nombre del repo, y el workflow
le pasa la URL de Pages en `NEXT_PUBLIC_SITE_URL` para el sitemap y las URLs canónicas.

Para usar un dominio propio: configúralo en *Settings → Pages → Custom domain* y el workflow
tomará la nueva URL. Si el sitio queda en la raíz del dominio, hay que dejar `basePath` vacío.
