import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  AmbientLight,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  DirectionalLight,
  EdgesGeometry,
  Fog,
  Group,
  IcosahedronGeometry,
  LinearFilter,
  LinearMipmapLinearFilter,
  LineBasicMaterial,
  LineDashedMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  Points,
  PointsMaterial,
  Raycaster,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Texture,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// La landing: una página web que se arma en 3D a medida que se hace scroll, y al final la pared con
// mis trabajos. La línea de tiempo se mide en secciones (`s`): s = 2 es cuando la tercera sección
// llega arriba de la pantalla.
//
//   s 0  intro        el marco de la página flota en el aire
//   s 1  estructura   un cursor ámbar dibuja el esqueleto (HTML)
//   s 2  capas        HTML, CSS y JS se separan en profundidad
//   s 3  diseño       los bloques toman volumen, color, luz y sombra; la página se recuesta
//   s 4  movimiento   la cámara la recorre y los bloques flotan
//   s 5  lanzamiento  la página se levanta terminada y una onda recorre el piso
//   s 6  trabajos     la página despega y suben del piso las placas con mis trabajos
//   s 7  contacto     la cámara se aleja
//
// Alrededor, una lluvia de código hace de telón. Nada es un video ni una secuencia de imágenes: es
// geometría, luces y texturas (las capturas de los trabajos y textos dibujados en un canvas).

type Rect = { x: number; y: number; w: number; h: number; e: number; color: number; solidColor?: number; js?: boolean; text?: string; textColor?: string };

export type Work = { color: string; thumb?: string; title: string; kind: string; lines?: string[] };

const W = 8;
const H = 5.4;
const SEP = 1.9; // separación entre capas en la vista explosionada

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ss = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

type Key = { s: number; [k: string]: number };
// Interpola entre fotogramas clave con suavizado en cada tramo.
function sample(keys: Key[], s: number, prop: string) {
  if (s <= keys[0].s) return keys[0][prop];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (s <= b.s) return mix(a[prop], b[prop], ss(a.s, b.s, s));
  }
  return keys[keys.length - 1][prop];
}

// Cámara en coordenadas esféricas alrededor de un objetivo: azimut, elevación, distancia, altura.
const CAMERA: Key[] = [
  { s: 0, az: 0.62, el: 0.14, r: 14.5, ty: 3.1 },
  { s: 1, az: 0.2, el: 0.08, r: 12.2, ty: 3.1 },
  { s: 2, az: 0.95, el: 0.2, r: 14, ty: 3.0 },
  { s: 3, az: 0.3, el: 0.86, r: 12.6, ty: 1.0 },
  { s: 4, az: -0.6, el: 0.52, r: 12.6, ty: 1.2 },
  { s: 5, az: 0.0, el: 0.1, r: 14.2, ty: 3.5 },
  { s: 6, az: 0.0, el: 0.05, r: 15.5, ty: 3.4 },
  { s: 7, az: 0.3, el: 0.32, r: 19, ty: 3.0 },
];
// Página: recostada (lie 0–1) y altura de su centro.
const PAGE: Key[] = [
  { s: 0, lie: 0, y: 3.1 },
  { s: 2.1, lie: 0, y: 3.1 },
  { s: 3, lie: 1, y: 0.95 },
  { s: 4, lie: 1, y: 0.95 },
  { s: 5, lie: 0, y: 3.5 },
];

// ── Texturas dibujadas al cargar ─────────────────────────────────────────────────────────────────

// Texto en un canvas, achicado hasta caber.
function textTexture(text: string, color: string, family: string, w: number, h: number, centered: boolean) {
  const scale = 160;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.round(w * scale));
  canvas.height = Math.max(2, Math.round(h * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  const pad = canvas.height * (centered ? 0.25 : 0.12);
  let size = canvas.height * (centered ? 0.6 : 0.72);
  const setFont = () => (ctx.font = `500 ${Math.round(size)}px ${family}, ui-monospace, monospace`);
  setFont();
  while (size > 8 && ctx.measureText(text).width > canvas.width - pad * 2) {
    size *= 0.92;
    setFont();
  }
  ctx.textAlign = centered ? "center" : "left";
  ctx.fillText(text, centered ? canvas.width / 2 : pad, canvas.height * 0.54);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Cara de una placa sin captura (o mientras carga): título, tipo y, si hay, líneas de detalle.
function workTexture(work: Work, family: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 600;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0f131b";
  ctx.fillRect(0, 0, 960, 600);
  ctx.fillStyle = work.color;
  ctx.fillRect(0, 0, 960, 10);
  ctx.fillStyle = "#8d97a9";
  ctx.font = `500 24px ${family}, monospace`;
  ctx.fillText(work.kind.toUpperCase(), 56, 92);
  ctx.fillStyle = "#e6e9ef";
  ctx.font = `500 76px ${family}, monospace`;
  ctx.fillText(work.title, 52, 182);
  ctx.font = `400 26px ${family}, monospace`;
  (work.lines ?? []).slice(0, 6).forEach((line, i) => {
    ctx.fillStyle = work.color;
    ctx.fillText(String(i + 1).padStart(2, "0"), 56, 272 + i * 52);
    ctx.fillStyle = "#c3cad6";
    ctx.fillText(line, 120, 272 + i * 52);
  });
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function gridTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0c0f15";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "#1c2431";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, size, size);
  ctx.strokeStyle = "#141a24";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(size / 2, 0);
  ctx.lineTo(size / 2, size);
  ctx.moveTo(0, size / 2);
  ctx.lineTo(size, size / 2);
  ctx.stroke();
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(30, 30);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

// ── Lluvia de código (telón que rodea la escena) ─────────────────────────────────────────────────

const GLYPHS = Array.from("01010101234567890abcdef{}[]()<>=+-*/\\%;:.#$&|!?~^_@xyzijkghmnrtuvw").slice(0, 64);

function glyphAtlas(family: string) {
  const cell = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = cell * 8;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `500 ${Math.round(cell * 0.6)}px ${family}, ui-monospace, monospace`;
  GLYPHS.forEach((glyph, i) => ctx.fillText(glyph, ((i % 8) + 0.5) * cell, (Math.floor(i / 8) + 0.53) * cell));
  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  return texture;
}

const RAIN_ROWS = 54;
const RAIN_GAP = 0.42;

const rainVertex = /* glsl */ `
  attribute float aRow;
  attribute float aSeed;
  uniform float uTime;
  uniform float uSize;
  varying float vGlyph;
  varying float vBright;
  varying float vHead;
  varying float vWarm;
  float hash(float n) { return fract(sin(n) * 43758.5453123); }
  void main() {
    float speed = mix(3.0, 9.0, hash(aSeed * 1.31));
    float trail = mix(8.0, 22.0, hash(aSeed * 2.17));
    float cycle = ${RAIN_ROWS.toFixed(1)} + trail + mix(0.0, 40.0, hash(aSeed * 3.7));
    float head = mod(uTime * speed + hash(aSeed * 4.9) * cycle, cycle);
    float d = head - aRow;
    float lit = step(0.0, d) * (1.0 - smoothstep(0.0, trail, d));
    vHead = 1.0 - smoothstep(0.0, 1.3, abs(d));
    vWarm = step(0.975, hash(aSeed * 7.7));
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float dist = -mv.z;
    float fade = (1.0 - smoothstep(34.0, 62.0, dist)) * smoothstep(0.2, 2.5, position.y);
    vBright = max(pow(lit, 1.5), 0.05) * fade;
    float rate = mix(0.12, 1.2, hash(aSeed + aRow * 0.37)) + vHead * 8.0;
    float tick = floor(uTime * rate + hash(aRow + aSeed * 9.1) * 10.0);
    vGlyph = floor(hash(aSeed * 13.7 + aRow * 7.13 + tick * 1.7) * 64.0);
    gl_PointSize = vBright < 0.01 ? 0.0 : uSize / dist;
    gl_Position = projectionMatrix * mv;
  }
`;

const rainFragment = /* glsl */ `
  uniform sampler2D uAtlas;
  uniform float uIntensity;
  varying float vGlyph;
  varying float vBright;
  varying float vHead;
  varying float vWarm;
  void main() {
    float c = mod(vGlyph, 8.0);
    float r = floor(vGlyph / 8.0);
    vec2 uv = vec2((c + gl_PointCoord.x) / 8.0, 1.0 - (r + gl_PointCoord.y) / 8.0);
    float a = texture2D(uAtlas, uv).a * vBright * uIntensity;
    if (a < 0.01) discard;
    vec3 col = mix(vec3(0.33, 0.4, 0.5), vec3(0.89, 0.93, 1.0), vHead);
    col = mix(col, vec3(1.0, 0.71, 0.28), vWarm * 0.85);
    gl_FragColor = vec4(col, a);
  }
`;

// ── API ──────────────────────────────────────────────────────────────────────────────────────────

export type BuilderInput = { s: number; px: number; py: number };
export type LabelPoint = { x: number; y: number; o: number };

export type SiteBuilder = {
  resize: () => void;
  start: () => void;
  stop: () => void;
  // Trabajo bajo un punto de la pantalla (coordenadas de ventana), o -1.
  pick: (x: number, y: number) => number;
  // Trabajo resaltado (-1 = ninguno).
  highlight: (index: number) => void;
  dispose: () => void;
};

export function createSiteBuilder(
  canvas: HTMLCanvasElement,
  options: {
    fontFamily: string;
    mobile: boolean;
    reducedMotion: boolean;
    texts: { title1: string; title2: string; button: string; nav: string };
    works: Work[];
    assetUrl: (path: string) => string;
    getInput: () => BuilderInput;
    onLabels?: (points: LabelPoint[]) => void;
  },
): SiteBuilder | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  const { mobile, reducedMotion, fontFamily } = options;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;

  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(item: T) => {
    disposables.push(item);
    return item;
  };

  const scene = new Scene();
  scene.background = new Color(0x090b10);
  scene.fog = new Fog(0x090b10, 22, 52);
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envMap = keep(pmrem.fromScene(room, 0.04).texture);
  room.dispose();
  pmrem.dispose();
  scene.environment = envMap;
  scene.environmentIntensity = 0.35;

  const camera = new PerspectiveCamera(mobile ? 50 : 38, 1, 0.1, 140);

  // ── Luces ────────────────────────────────────────────────────────────────────────────────────
  scene.add(new AmbientLight(0xffffff, 0.12));
  const key = new DirectionalLight(0xfff0d8, 2.4);
  key.position.set(7, 13, 9);
  key.castShadow = true;
  key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 42 });
  key.shadow.bias = -0.0004;
  scene.add(key);
  const rim = new DirectionalLight(0x9ab8ff, 1.1);
  rim.position.set(-9, 6, -7);
  scene.add(rim);
  const glow = new PointLight(0xffb547, 0, 16, 2);
  scene.add(glow);

  // ── Piso, polvo y lluvia de código ───────────────────────────────────────────────────────────
  const floor = new Mesh(keep(new PlaneGeometry(120, 120)), keep(new MeshStandardMaterial({ map: keep(gridTexture()), roughness: 0.85, metalness: 0.05 })));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const dustCount = mobile ? 220 : 500;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 44;
    dustPositions[i * 3 + 1] = Math.random() * 14;
    dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 40;
  }
  const dustGeometry = keep(new BufferGeometry());
  dustGeometry.setAttribute("position", new BufferAttribute(dustPositions, 3));
  scene.add(new Points(dustGeometry, keep(new PointsMaterial({ color: 0x9fb4d8, size: 0.05, transparent: true, opacity: 0.5, depthWrite: false }))));

  // Columnas en un cilindro alrededor de todo: se ven desde cualquier ángulo de la cámara.
  const rainColumns = mobile ? 300 : 640;
  const rainCount = rainColumns * RAIN_ROWS;
  const rainPositions = new Float32Array(rainCount * 3);
  const rainRows = new Float32Array(rainCount);
  const rainSeeds = new Float32Array(rainCount);
  for (let c = 0, k = 0; c < rainColumns; c++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 24 + Math.random() * 16;
    const seed = Math.random() * 1000;
    const top = RAIN_ROWS * RAIN_GAP + Math.random() * 3;
    for (let r = 0; r < RAIN_ROWS; r++, k++) {
      rainPositions[k * 3] = Math.sin(angle) * radius;
      rainPositions[k * 3 + 1] = top - r * RAIN_GAP;
      rainPositions[k * 3 + 2] = Math.cos(angle) * radius;
      rainRows[k] = r;
      rainSeeds[k] = seed;
    }
  }
  const rainGeometry = keep(new BufferGeometry());
  rainGeometry.setAttribute("position", new BufferAttribute(rainPositions, 3));
  rainGeometry.setAttribute("aRow", new BufferAttribute(rainRows, 1));
  rainGeometry.setAttribute("aSeed", new BufferAttribute(rainSeeds, 1));
  const rainUniforms = {
    uAtlas: { value: keep(glyphAtlas(fontFamily)) as Texture },
    uTime: { value: 0 },
    uSize: { value: 300 },
    uIntensity: { value: 0.75 },
  };
  const rain = new Points(
    rainGeometry,
    keep(new ShaderMaterial({ uniforms: rainUniforms, vertexShader: rainVertex, fragmentShader: rainFragment, transparent: true, depthWrite: false, blending: AdditiveBlending })),
  );
  rain.frustumCulled = false;
  scene.add(rain);

  // Onda del lanzamiento: un anillo de puntos que se expande por el piso.
  const ringCount = 420;
  const ringAngles = new Float32Array(ringCount);
  const ringPositions = new Float32Array(ringCount * 3);
  for (let i = 0; i < ringCount; i++) ringAngles[i] = (i / ringCount) * Math.PI * 2 + Math.random() * 0.02;
  const ringGeometry = keep(new BufferGeometry());
  ringGeometry.setAttribute("position", new BufferAttribute(ringPositions, 3));
  const ringMaterial = keep(new PointsMaterial({ color: 0xffb547, size: 0.09, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending }));
  scene.add(new Points(ringGeometry, ringMaterial));

  // ── La página que se arma ────────────────────────────────────────────────────────────────────
  const { title1, title2, button, nav } = options.texts;
  const RECTS: Rect[] = [
    { x: 0.3, y: 0.28, w: 7.4, h: 0.46, e: 0.12, color: 0x2a3343, solidColor: 0x151b26 },
    { x: 0.5, y: 0.41, w: 1.0, h: 0.2, e: 0.24, color: 0xffb547 },
    { x: 4.75, y: 0.45, w: 0.6, h: 0.12, e: 0.16, color: 0x8d97a9 },
    { x: 5.55, y: 0.45, w: 0.6, h: 0.12, e: 0.16, color: 0x8d97a9 },
    { x: 6.45, y: 0.37, w: 1.05, h: 0.28, e: 0.26, color: 0xffb547, js: true, text: nav, textColor: "#1a1206" },
    { x: 0.5, y: 1.1, w: 3.8, h: 0.5, e: 0.28, color: 0xc9d3e6, solidColor: 0x121823, text: title1, textColor: "#e6e9ef" },
    { x: 0.5, y: 1.7, w: 3.0, h: 0.5, e: 0.28, color: 0xc9d3e6, solidColor: 0x121823, text: title2, textColor: "#ffb547" },
    { x: 0.5, y: 2.42, w: 3.3, h: 0.1, e: 0.1, color: 0x5c6678 },
    { x: 0.5, y: 2.62, w: 3.0, h: 0.1, e: 0.1, color: 0x5c6678 },
    { x: 0.5, y: 2.82, w: 2.2, h: 0.1, e: 0.1, color: 0x5c6678 },
    { x: 0.5, y: 3.12, w: 1.55, h: 0.44, e: 0.36, color: 0xffb547, js: true, text: button, textColor: "#1a1206" },
    { x: 4.65, y: 1.05, w: 3.05, h: 2.45, e: 0.5, color: 0x3a4a66, solidColor: 0x1b2638 },
    { x: 0.3, y: 3.85, w: 2.3, h: 1.2, e: 0.38, color: 0x2a3343, solidColor: 0x161c27, js: true },
    { x: 2.85, y: 3.85, w: 2.3, h: 1.2, e: 0.38, color: 0x2a3343, solidColor: 0x161c27, js: true },
    { x: 5.4, y: 3.85, w: 2.3, h: 1.2, e: 0.38, color: 0x2a3343, solidColor: 0x161c27, js: true },
  ];
  const VISUAL = 11;
  const CARDS = [12, 13, 14];

  const page = new Group();
  scene.add(page);
  const htmlLayer = new Group();
  const cssLayer = new Group();
  const jsLayer = new Group();
  page.add(htmlLayer, cssLayer, jsLayer);

  const center = (r: Rect) => ({ cx: r.x + r.w / 2 - W / 2, cy: H / 2 - (r.y + r.h / 2) });

  const baseMaterial = keep(new MeshStandardMaterial({ color: 0x0f131b, roughness: 0.6, metalness: 0.2, transparent: true, opacity: 0 }));
  const base = new Mesh(keep(new BoxGeometry(W + 0.3, H + 0.3, 0.12)), baseMaterial);
  base.position.z = -0.07;
  base.receiveShadow = true;
  cssLayer.add(base);

  // HTML: contornos que se dibujan solos (líneas punteadas cuyo trazo crece) y un cursor ámbar.
  const outlines: { line: LineSegments; material: LineDashedMaterial; length: number; points: ArrayLike<number>; distances: ArrayLike<number> }[] = [];
  const addOutline = (w: number, h: number, x: number, y: number) => {
    const geometry = keep(new EdgesGeometry(keep(new PlaneGeometry(w, h))));
    const material = keep(new LineDashedMaterial({ color: 0xd2def7, dashSize: 0, gapSize: 1000, transparent: true, opacity: 0.95 }));
    const line = new LineSegments(geometry, material);
    line.computeLineDistances();
    const distances = geometry.getAttribute("lineDistance");
    line.position.set(x, y, 0);
    htmlLayer.add(line);
    outlines.push({ line, material, length: distances.getX(distances.count - 1), points: geometry.getAttribute("position").array, distances: distances.array });
  };
  const cursor = new Mesh(keep(new SphereGeometry(0.07, 16, 10)), keep(new MeshBasicMaterial({ color: 0xffb547 })));
  cursor.add(new PointLight(0xffb547, 2.5, 3, 2));
  htmlLayer.add(cursor);
  addOutline(W + 0.3, H + 0.3, 0, 0);
  RECTS.forEach((r) => {
    const { cx, cy } = center(r);
    addOutline(r.w, r.h, cx, cy);
  });

  // CSS: bloques (de vidrio translúcido a sólidos con volumen) y sus textos.
  const unitBox = keep(new BoxGeometry(1, 1, 1));
  const blocks = RECTS.map((r) => {
    const accent = r.color === 0xffb547;
    const material = keep(
      new MeshStandardMaterial({ color: r.color, roughness: 0.5, metalness: 0.15, transparent: true, opacity: 0, emissive: accent ? 0xffb547 : 0x000000, emissiveIntensity: 0 }),
    );
    const mesh = new Mesh(unitBox, material);
    const { cx, cy } = center(r);
    mesh.position.set(cx, cy, 0);
    mesh.scale.set(r.w, r.h, 0.02);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    cssLayer.add(mesh);
    let label: Mesh | null = null;
    if (r.text) {
      const texture = keep(textTexture(r.text, r.textColor ?? "#e6e9ef", fontFamily, r.w, r.h, !!r.js));
      label = new Mesh(keep(new PlaneGeometry(r.w, r.h)), keep(new MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false })));
      label.position.set(cx, cy, 0);
      cssLayer.add(label);
    }
    return { rect: r, accent, mesh, material, label, base: new Color(r.color), solid: new Color(r.solidColor ?? r.color) };
  });

  // Objetos 3D dentro del diseño: un icosaedro sobre el bloque visual y un ícono por tarjeta.
  const accentMaterial = keep(new MeshStandardMaterial({ color: 0xffb547, roughness: 0.3, metalness: 0.5, emissive: 0x3a2200, emissiveIntensity: 0.6 }));
  const iceMaterial = keep(new MeshStandardMaterial({ color: 0xb8cbef, roughness: 0.25, metalness: 0.7 }));
  const visual = RECTS[VISUAL];
  const ico = new Group();
  const icoSolid = new Mesh(keep(new IcosahedronGeometry(0.72, 0)), keep(new MeshStandardMaterial({ color: 0x24324a, roughness: 0.2, metalness: 0.8, flatShading: true })));
  icoSolid.castShadow = true;
  ico.add(icoSolid, new LineSegments(keep(new EdgesGeometry(keep(new IcosahedronGeometry(0.74, 0)))), keep(new LineBasicMaterial({ color: 0xffb547 }))));
  const visualCenter = center(visual);
  ico.position.set(visualCenter.cx, visualCenter.cy, visual.e + 0.95);
  ico.scale.setScalar(0);
  cssLayer.add(ico);

  const iconGeometries = [keep(new TorusGeometry(0.2, 0.07, 16, 40)), keep(new SphereGeometry(0.22, 32, 16)), keep(new ConeGeometry(0.22, 0.42, 4))];
  const icons = CARDS.map((index, i) => {
    const r = RECTS[index];
    const { cx, cy } = center(r);
    const icon = new Mesh(iconGeometries[i], i === 1 ? iceMaterial : accentMaterial);
    icon.position.set(cx - r.w / 2 + 0.45, cy + r.h / 2 - 0.4, r.e + 0.3);
    icon.castShadow = true;
    icon.scale.setScalar(0);
    cssLayer.add(icon);
    return icon;
  });

  // JS: nodos sobre los elementos interactivos, unidos como un grafo.
  const nodeGeometry = keep(new SphereGeometry(0.1, 20, 12));
  const nodeMaterial = keep(new MeshBasicMaterial({ color: 0xffb547, transparent: true, opacity: 0 }));
  const jsRects = RECTS.filter((r) => r.js);
  const nodes = jsRects.map((r) => {
    const node = new Mesh(nodeGeometry, nodeMaterial);
    const { cx, cy } = center(r);
    node.position.set(cx, cy, 0);
    jsLayer.add(node);
    return node;
  });
  const linkPairs = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [1, 3],
  ];
  const linkPositions = new Float32Array(linkPairs.length * 6);
  linkPairs.forEach(([a, b], i) => {
    const pa = center(jsRects[a]);
    const pb = center(jsRects[b]);
    linkPositions.set([pa.cx, pa.cy, 0, pb.cx, pb.cy, 0], i * 6);
  });
  const linkGeometry = keep(new BufferGeometry());
  linkGeometry.setAttribute("position", new BufferAttribute(linkPositions, 3));
  const linkMaterial = keep(new LineBasicMaterial({ color: 0xffb547, transparent: true, opacity: 0 }));
  jsLayer.add(new LineSegments(linkGeometry, linkMaterial));

  const labelAnchors = [htmlLayer, cssLayer, jsLayer];
  const anchor = new Vector3();

  // ── Pared de trabajos ────────────────────────────────────────────────────────────────────────
  // Placas de vidrio con la captura de cada sitio, en una grilla levemente curva de 3 columnas.
  const SLAB_W = 3.2;
  const SLAB_H = 2.0;
  const SLAB_D = 0.14;
  const columns = 3;
  const rows = Math.ceil(options.works.length / columns);
  const slabBox = keep(new BoxGeometry(SLAB_W, SLAB_H, SLAB_D));
  const slabEdges = keep(new EdgesGeometry(slabBox));
  const gallery = new Group();
  scene.add(gallery);
  const loader = new TextureLoader();
  let texturesRequested = false;
  const slabs = options.works.map((work, i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const offset = col - (columns - 1) / 2;
    const home = new Vector3(offset * (SLAB_W + 0.45), 1.15 + (rows - 1 - row) * (SLAB_H + 0.3), -Math.abs(offset) * 0.35);
    const face = keep(new MeshBasicMaterial({ map: keep(workTexture(work, fontFamily)), toneMapped: false, color: 0xffffff }));
    const side = keep(new MeshStandardMaterial({ color: new Color(work.color).lerp(new Color(0x10141c), 0.75), roughness: 0.4, metalness: 0.4 }));
    const mesh = new Mesh(slabBox, [side, side, side, side, face, side]);
    mesh.castShadow = true;
    mesh.userData.index = i;
    const edges = new LineSegments(slabEdges, keep(new LineBasicMaterial({ color: work.color, transparent: true, opacity: 0.35 })));
    mesh.add(edges);
    const holder = new Group();
    holder.add(mesh);
    holder.position.copy(home);
    holder.rotation.y = -offset * 0.14;
    holder.visible = false;
    gallery.add(holder);
    return { work, mesh, face, edges, holder, home, lift: 0 };
  });
  let highlighted = -1;

  function loadThumbnails() {
    if (texturesRequested) return;
    texturesRequested = true;
    slabs.forEach((slab) => {
      if (!slab.work.thumb) return;
      loader.load(options.assetUrl(slab.work.thumb), (texture) => {
        texture.colorSpace = SRGBColorSpace;
        texture.anisotropy = 8;
        keep(texture);
        slab.face.map = texture;
        slab.face.needsUpdate = true;
      });
    });
  }

  const raycaster = new Raycaster();
  const pointer = new Vector2();

  // ── Tamaño y encuadre ────────────────────────────────────────────────────────────────────────
  let width = 1;
  let height = 1;
  let framing = 1;
  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // En escritorio el texto va a la izquierda: la escena se corre a la derecha. En celular el texto
    // va abajo: la escena sube.
    if (width >= 768) camera.setViewOffset(width, height, -width * 0.17, 0, width, height);
    else camera.setViewOffset(width, height, 0, height * 0.17, width, height);
    // En pantallas angostas la cámara se aleja para que la página entre a lo ancho.
    framing = camera.aspect < 1.3 ? Math.min(1.8, 1.3 / camera.aspect) : 1;
    camera.updateProjectionMatrix();
    rainUniforms.uSize.value = RAIN_GAP * 1.3 * height * renderer.getPixelRatio() / (2 * Math.tan(((camera.fov / 2) * Math.PI) / 180));
  }

  // ── Animación ────────────────────────────────────────────────────────────────────────────────
  let s = 0;
  let px = 0;
  let py = 0;
  let time = 0;
  let last = 0;
  let frame = 0;
  const target = new Vector3();

  function tick(now: number) {
    frame = requestAnimationFrame(tick);
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    if (!reducedMotion) time += dt;
    const input = options.getInput();
    const ease = (rate: number) => (reducedMotion ? 1 : 1 - Math.exp(-dt * rate));
    s += (input.s - s) * ease(5);
    px += (input.px - px) * ease(3);
    py += (input.py - py) * ease(3);

    const draw = 0.15 + 0.85 * ss(0.1, 1.2, s);
    const explode = ss(1.2, 1.9, s) * (1 - ss(2.2, 2.8, s));
    const fill = ss(1.3, 2.0, s);
    const solid = ss(2.2, 3.0, s);
    const nodesOn = ss(1.5, 2.1, s) * (1 - 0.7 * ss(2.5, 3.0, s)) + 0.6 * ss(4.2, 4.75, s);
    const motionOn = ss(3.0, 3.5, s) * (1 - ss(4.5, 5, s) * 0.5);
    const launch = ss(4.1, 4.9, s);
    const liftoff = ss(5.05, 5.85, s);
    const appear = ss(5.15, 6.0, s);
    if (s > 4.5) loadThumbnails();

    // Página: se recuesta como maqueta, vuelve a pararse y al final despega.
    page.visible = liftoff < 0.99;
    const lie = sample(PAGE, s, "lie");
    page.rotation.x = -lie * (Math.PI / 2 - 0.22) - liftoff * 0.35;
    page.position.y = sample(PAGE, s, "y") + Math.sin(time * 0.8) * 0.06 + liftoff * liftoff * 13;
    page.rotation.y = Math.sin(time * 0.35) * 0.04 * (1 - lie);

    htmlLayer.position.z = -explode * SEP;
    jsLayer.position.z = explode * SEP + mix(0.02, 0.55, solid);

    // Contornos: se dibujan uno tras otro y se apagan cuando el diseño toma volumen.
    const outlineOpacity = 0.9 * (1 - 0.82 * solid);
    let drawing = -1;
    let drawingLocal = 0;
    outlines.forEach((o, i) => {
      const local = i === 0 ? clamp01(draw / 0.15) : clamp01((draw - 0.15 - ((i - 1) / (outlines.length - 2)) * 0.6) / 0.25);
      o.line.visible = local > 0.001 && outlineOpacity > 0.01;
      o.material.dashSize = local * o.length;
      o.material.opacity = outlineOpacity;
      if (local > 0 && local < 1) {
        drawing = i;
        drawingLocal = local;
      }
    });
    // Cursor ámbar en la punta de la línea que se está dibujando (o esperando la siguiente).
    const next = drawing >= 0 ? drawing : outlines.findIndex((o, i) => i > 0 && o.material.dashSize === 0);
    if (next > 0 && solid < 0.5) {
      const o = outlines[next];
      const at = (drawing >= 0 ? drawingLocal : 0) * o.length;
      let k = 0;
      while (k < o.distances.length - 2 && o.distances[k + 1] < at) k += 2;
      const d0 = o.distances[k];
      const d1 = o.distances[k + 1];
      const f = d1 > d0 ? clamp01((at - d0) / (d1 - d0)) : 0;
      cursor.position.set(
        o.line.position.x + mix(o.points[k * 3], o.points[(k + 1) * 3], f),
        o.line.position.y + mix(o.points[k * 3 + 1], o.points[(k + 1) * 3 + 1], f),
        0.02,
      );
      cursor.visible = true;
      cursor.scale.setScalar(1 + Math.sin(time * 8) * 0.25);
    } else {
      cursor.visible = false;
    }

    // Bloques: vidrio translúcido en la vista de capas, sólidos con volumen en el diseño.
    baseMaterial.opacity = Math.min(1, fill * 0.6 + solid);
    base.visible = baseMaterial.opacity > 0.01;
    base.castShadow = baseMaterial.opacity > 0.6;
    blocks.forEach((b, i) => {
      const depth = mix(0.02, b.rect.e, solid);
      let z = depth / 2;
      if (CARDS.includes(i)) z += Math.sin(time * 1.3 + i) * 0.14 * motionOn;
      b.mesh.scale.z = depth;
      b.mesh.position.z = z;
      b.material.opacity = Math.min(1, fill * 0.55 + solid);
      b.material.color.copy(b.base).lerp(b.solid, solid);
      b.material.emissiveIntensity = b.accent ? 0.15 + 0.35 * solid : 0;
      b.mesh.visible = b.material.opacity > 0.01;
      if (b.label) {
        b.label.position.z = z + depth / 2 + 0.005;
        (b.label.material as MeshBasicMaterial).opacity = solid;
        b.label.visible = solid > 0.01;
      }
    });

    const pop = ss(2.5, 3.2, s);
    ico.scale.setScalar(pop);
    ico.rotation.x = time * 0.4;
    ico.rotation.y = time * 0.6;
    ico.position.z = visual.e + 0.95 + Math.sin(time * 1.1) * 0.12;
    icons.forEach((icon, i) => {
      icon.scale.setScalar(pop);
      icon.rotation.y = time * (0.8 + i * 0.2);
      icon.rotation.x = 0.4;
      const card = blocks[CARDS[i]];
      icon.position.z = card.mesh.position.z + card.mesh.scale.z / 2 + 0.3;
    });

    nodeMaterial.opacity = nodesOn;
    linkMaterial.opacity = nodesOn * 0.6;
    nodes.forEach((node, i) => node.scale.setScalar(1 + Math.sin(time * 3 + i) * 0.25 * nodesOn));

    glow.intensity = 14 * solid * (1 - liftoff);
    glow.position.set(2.5, page.position.y + 2.2, 3.5);

    // Onda del lanzamiento
    const wave = ss(4.3, 5, s);
    const radius = 1.5 + wave * 13;
    for (let i = 0; i < ringCount; i++) {
      ringPositions[i * 3] = Math.cos(ringAngles[i]) * radius;
      ringPositions[i * 3 + 1] = 0.04;
      ringPositions[i * 3 + 2] = Math.sin(ringAngles[i]) * radius;
    }
    ringGeometry.getAttribute("position").needsUpdate = true;
    ringMaterial.opacity = launch > 0 ? (1 - wave) * ss(4.2, 4.4, s) : 0;

    // Pared de trabajos: las placas suben del piso una tras otra; la resaltada se adelanta.
    slabs.forEach((slab, i) => {
      const local = clamp01((appear * 1.45 - i * 0.05) / 1);
      const shown = local > 0.001;
      slab.holder.visible = shown;
      if (!shown) return;
      const rise = 1 - local;
      slab.lift += ((i === highlighted ? 1 : 0) - slab.lift) * ease(8);
      slab.holder.position.set(slab.home.x, slab.home.y - rise * 7, slab.home.z - rise * 4 + slab.lift * 0.9);
      slab.mesh.rotation.x = rise * 0.9 + Math.sin(time * 0.9 + i) * 0.02;
      slab.mesh.rotation.y = px * 0.08 + Math.sin(time * 0.7 + i * 1.3) * 0.025;
      slab.mesh.scale.setScalar(1 + slab.lift * 0.06);
      const dim = highlighted >= 0 && i !== highlighted ? 0.4 : 1;
      slab.face.color.setScalar(mix(slab.face.color.r, dim, ease(6)));
      (slab.edges.material as LineBasicMaterial).opacity = 0.3 + slab.lift * 0.7;
    });

    // Lluvia de código
    rainUniforms.uTime.value = time;
    rainUniforms.uIntensity.value = 0.55 + 0.3 * (1 - solid) + 0.25 * appear;

    // Polvo: sube lento y vuelve a empezar abajo.
    if (!reducedMotion) {
      const pos = dustGeometry.getAttribute("position") as BufferAttribute;
      for (let i = 0; i < dustCount; i++) {
        let y = pos.getY(i) + dt * 0.12;
        if (y > 14) y = 0;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }

    // Cámara
    const az = sample(CAMERA, s, "az") + px * 0.12 + (reducedMotion ? 0 : Math.sin(time * 0.2) * 0.03);
    const el = Math.max(0.03, sample(CAMERA, s, "el") + py * 0.07);
    const r = sample(CAMERA, s, "r") * framing;
    const ty = sample(CAMERA, s, "ty");
    target.set(0, ty, 0);
    camera.position.set(Math.sin(az) * Math.cos(el) * r, ty + Math.sin(el) * r, Math.cos(az) * Math.cos(el) * r);
    camera.lookAt(target);

    renderer.render(scene, camera);

    // Etiquetas de las capas (solo en la vista explosionada)
    if (options.onLabels) {
      page.updateMatrixWorld();
      options.onLabels(
        labelAnchors.map((layer, i) => {
          // HTML arriba a la derecha, CSS arriba a la izquierda, JS abajo a la izquierda: no se tapan.
          if (i === 0) anchor.set(W / 2 - 1.6, H / 2 + 0.45, 0);
          else if (i === 1) anchor.set(-W / 2 - 0.1, H / 2 + 0.45, 0);
          else anchor.set(-W / 2 - 0.1, -H / 2 - 0.15, 0);
          layer.localToWorld(anchor);
          anchor.project(camera);
          return { x: ((anchor.x + 1) / 2) * width, y: ((1 - anchor.y) / 2) * height, o: explode };
        }),
      );
    }
  }

  const onLost = (e: Event) => {
    e.preventDefault();
    stop();
  };
  canvas.addEventListener("webglcontextlost", onLost);

  function start() {
    if (frame) return;
    last = 0;
    frame = requestAnimationFrame(tick);
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
  }

  resize();

  return {
    resize,
    start,
    stop,
    pick(x, y) {
      const rect = canvas.getBoundingClientRect();
      pointer.set(((x - rect.left) / rect.width) * 2 - 1, 1 - ((y - rect.top) / rect.height) * 2);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(
        slabs.filter((slab) => slab.holder.visible).map((slab) => slab.mesh),
        false,
      )[0];
      return hit ? (hit.object.userData.index as number) : -1;
    },
    highlight(index) {
      highlighted = index;
    },
    dispose() {
      stop();
      canvas.removeEventListener("webglcontextlost", onLost);
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
    },
  };
}
