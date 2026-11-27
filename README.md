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
| Mis trabajos (placas de la pared y demos) | `src/content/sheets.ts` (capturas en `public/prototypes/<slug>/`) |
| Textos de la interfaz, presentación y etapas (ES / EN) | `src/i18n/dictionaries/es.json` y `en.json` |
| Colores y tipografías | tokens en `src/app/globals.css`, fuentes en `src/app/[locale]/layout.tsx` |
| Escena 3D (cámara, etapas, pared, lluvia de código) | `src/lib/site-builder.ts` (fotogramas clave al principio) |

Los dos diccionarios deben tener las mismas claves: TypeScript falla el build si falta una.

### Diseño

Estética de terminal en 3D: grafito azulado, código en acero y hielo, y un solo acento ámbar (como
los monitores de fósforo ámbar, la alternativa histórica al verde). Solo tema oscuro. Titulares,
etiquetas y código en Martian Mono (titulares semicondensados con `[font-stretch:87.5%]`); texto
corrido en IBM Plex Sans. Tokens de color y utilidades (`label`, `link-underline`, `caret`,
`btn-primary`) en `globals.css`. La imagen para redes (`opengraph-image.tsx`) usa la mono desde
`src/assets/fonts/` (licencia OFL).

### La landing: una web que se arma en 3D

La landing muestra cómo construyo cada web, sea una landing sencilla o una plataforma compleja: una
página se arma en 3D mientras se hace scroll, sin videos ni secuencias de imágenes (geometría, luz,
sombras y reflejos calculados en el navegador). `HomeExperience` pone un canvas fijo detrás de las
secciones de texto; cada sección que llega bajo el header avanza en 1 la línea de tiempo de la
escena (`src/lib/site-builder.ts`; three.js va en su propio chunk y se carga después de pintar):

0. **Presentación** (`HeroIntro` en `Hero.tsx`): foto en una placa 3D (`PhotoCard`), prompt
   `whoami`, titular que se decodifica (`DecodeText`), bajada y contacto. Al lado, el marco de la
   página flota en el aire.
1. **Estructura**: un cursor ámbar dibuja el esqueleto (HTML).
2. **Capas**: HTML, CSS y JS se separan en profundidad, con etiquetas que siguen a cada capa.
3. **Diseño**: los bloques toman volumen, color y sombra; la página se recuesta como una maqueta.
4. **Movimiento**: la cámara la recorre mientras las tarjetas flotan.
5. **Lanzamiento**: la página se levanta terminada y una onda recorre el piso.
6. **Mis trabajos**: la página despega y suben del piso las placas con cada trabajo (ver abajo).
7. **Contacto** (`Contact`): una terminal con datos, correo y redes; la cámara se aleja.

Alrededor de todo cae una lluvia de código (símbolos, no katakana) que hace de telón. El mouse, o el
giroscopio en celular (en iPhone, después de tocar "Mover con el celular"), inclina la cámara; mouse,
dedo y giroscopio se leen una sola vez en `src/lib/motion.ts`. Con `prefers-reduced-motion` no hay
animación propia, solo la que mueve el scroll. Sin WebGL quedan los textos. En escritorio el texto
va a la izquierda y la escena a la derecha; en celular la escena va arriba y el texto abajo. El panel
de la presentación cabe sin scroll en 1366×657, 1440×789 y 1920×953.

### Mis trabajos

Cada trabajo es una placa de vidrio en una pared 3D, con el primer pantallazo del sitio
(`thumb.jpg`, 960×600) o, si no tiene capturas (Sellside), su título y lo que hago ahí, dibujados en
un canvas. Pasar el mouse por una placa (o por la lista del panel) la adelanta y apaga las demás; un
clic en cualquiera de las dos abre su demo (`ProjectDialog` en `ProjectViewer.tsx`): un diálogo a
pantalla completa que entra girando en 3D, con ← → para pasar de un trabajo a otro y Esc para
cerrar. Mientras está abierto, la escena deja de dibujarse.

- **Trabajos visuales** (`pages`): el sitio en celular (izquierda) y escritorio (derecha), en
  perspectiva. Scroll sincronizado sección a sección, anotaciones numeradas ("Decisiones de
  diseño"), variantes A/B/C, modo "En vivo" (iframe, solo con `liveUrl`) y recorrido automático. La
  ficha (rol, anotaciones, tipografías, paleta, stack) es una columna desde `lg` y un panel
  desplegable ("Ficha") en pantallas menores; en celular se ve un dispositivo a la vez.
  Sin `fonts` (un sitio que no diseñé yo) no se muestra la ficha de diseño, y `notesTitle` cambia el
  título de las anotaciones.
- **Qué hago** (`table`): lista de tareas y herramientas. Sellside la tiene junto a la vista de su
  sitio (`pages`): la ficha dice mi rol (Odoo developer que implementa Odoo ERP en distintas
  empresas), qué hago ahí y, con `preview`, que la vista es el sitio de la empresa donde trabajo.
  Un trabajo solo con `table` se muestra como esa lista.

Cada trabajo visual necesita en `public/prototypes/<slug>/` capturas JPEG de página completa:
`desktop.jpg` (1280 de ancho) y `mobile.jpg` (390 de ancho a 1.6x = 624 px), más `thumb.jpg` para
la placa (el recorte 1280×800 de arriba de `desktop.jpg`, a 960×600). Además necesita su entrada en
`src/content/showcase-geometry.json`. Las capturas y la geometría las genera
`scripts/capture-showcase.mjs` (Playwright con el Chrome instalado; instrucciones en su
encabezado): mide dónde empieza cada sección en escritorio y en celular, en el mismo estado en que
se captura. Las anotaciones (`notes[].section`) apuntan a esos índices. Si una página cambia, hay
que recapturar y regenerar la geometría y la miniatura. La lista de páginas a capturar va en un
JSON **fuera del repo**, porque las rutas del proyecto `webs` llevan nombres reales. Cada página
acepta `waitUntil: "load"` (para sitios que nunca dejan la red quieta) y `css` (CSS extra para la
captura). Sellside los usa: es un sitio en Odoo con un chat que se abre solo y un video de fondo de
Vimeo que bloquea a los navegadores automáticos, así que se captura con
`.o-livechat-root { display: none } .o_bg_video_iframe { visibility: hidden }
.o_bg_video_container { background: #000 }` y `.o_animate` forzado a visible.

Juria y Sellside se capturan desde sus sitios publicados y el "Estudio web" es mi propio sitio
(demo pública).
Los demás trabajos visuales vienen de negocios reales del proyecto `webs`, pero **solo se publican
anonimizados**: nombre, logo, fotos, teléfonos, redes y direcciones reemplazados, sin link en vivo
y sin precios ni oferta en las capturas; la lista lleva el rubro, no un nombre de negocio. Con el
nombre real hace falta permiso escrito del negocio: este repo es público y lo que se sube queda en
el historial.

## Estructura

- `src/app/[locale]/layout.tsx`: `<html>`, fuentes, header y metadata por idioma (hreflang, Open
  Graph). `src/app/[locale]/page.tsx`: la landing.
- `src/app/page.tsx`: la raíz `/` redirige a `/es/` (en un sitio estático no hay servidor que
  detecte el idioma del navegador).
- `src/proxy.ts`: redirige `/` al idioma preferido (`Accept-Language`), pero solo en `npm run dev`;
  el export estático lo ignora.
- `src/app/sitemap.ts`, `robots.ts`, `icon.svg`, `[locale]/opengraph-image.tsx`: SEO.
- `src/lib/asset.ts`: antepone el `basePath` a las rutas de `/public`. Úsalo en todo `src` de
  `next/image`, `<img>` o texturas.

## Deploy

`.github/workflows/deploy.yml` compila el sitio (`output: "export"`) y lo publica en GitHub Pages
en cada push a `main`. Como el repo no se llama `<usuario>.github.io`, el sitio vive bajo
`/portfolio`: `next.config.ts` calcula ese `basePath` a partir del nombre del repo, y el workflow
le pasa la URL de Pages en `NEXT_PUBLIC_SITE_URL` para el sitemap y las URLs canónicas.

Para usar un dominio propio: configúralo en *Settings → Pages → Custom domain* y el workflow
tomará la nueva URL. Si el sitio queda en la raíz del dominio, hay que dejar `basePath` vacío.
