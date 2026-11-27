// Estado de movimiento compartido por las piezas 3D (fondo de código, tarjeta de la foto, escenario
// de proyectos): último mouse, último toque y giroscopio. Un solo juego de listeners para todo el
// sitio; cada pieza lo lee en su propio requestAnimationFrame, sin re-renders de React.

type MotionState = {
  // Mouse o lápiz, en coordenadas de ventana. `mouseAt` = 0 si salió de la ventana.
  mouseX: number;
  mouseY: number;
  mouseAt: number;
  // Último dedo en pantalla (también mientras hace scroll).
  touchX: number;
  touchY: number;
  touchAt: number;
  // Giroscopio relativo a la postura inicial, de −1 a 1 (x: inclinar a los lados, y: adelante/atrás).
  gx: number;
  gy: number;
  gyroAt: number;
};

export const motion: MotionState = {
  mouseX: 0,
  mouseY: 0,
  mouseAt: 0,
  touchX: 0,
  touchY: 0,
  touchAt: 0,
  gx: 0,
  gy: 0,
  gyroAt: 0,
};

type TapListener = (x: number, y: number) => void;
const tapListeners = new Set<TapListener>();

/** Avisa de cada clic o toque (coordenadas de ventana). Devuelve la función para desuscribirse. */
export function onTap(listener: TapListener) {
  tapListeners.add(listener);
  return () => tapListeners.delete(listener);
}

const clamp = (v: number, min = -1, max = 1) => Math.min(max, Math.max(min, v));

let started = false;
let gyroListening = false;

export function startMotion() {
  if (started || typeof window === "undefined") return;
  started = true;

  window.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType === "touch") return;
      motion.mouseX = e.clientX;
      motion.mouseY = e.clientY;
      motion.mouseAt = performance.now();
    },
    { passive: true },
  );
  // El mouse salió de la ventana: las piezas vuelven a su movimiento propio.
  document.addEventListener("mouseout", (e) => {
    if (!e.relatedTarget) motion.mouseAt = 0;
  });
  window.addEventListener("pointerdown", (e) => tapListeners.forEach((fn) => fn(e.clientX, e.clientY)), { passive: true });

  // touchmove sigue llegando durante el scroll nativo (pointermove no: el navegador lo cancela).
  const touch = (e: TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    motion.touchX = t.clientX;
    motion.touchY = t.clientY;
    motion.touchAt = performance.now();
  };
  window.addEventListener("touchstart", touch, { passive: true });
  window.addEventListener("touchmove", touch, { passive: true });

  // En iOS no llega nada hasta que el usuario da permiso (GyroButton); el listener ya queda puesto.
  listenGyro();
}

/** iOS pide permiso explícito (con un toque del usuario) para leer el giroscopio. */
export function needsGyroPermission() {
  return (
    typeof window !== "undefined" &&
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission === "function"
  );
}

export async function requestGyro() {
  try {
    const request = (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission;
    if ((await request()) === "granted") {
      listenGyro();
      return true;
    }
  } catch {
    // Sin permiso: el sitio sigue con el dedo y el movimiento automático.
  }
  return false;
}

function listenGyro() {
  if (gyroListening) return;
  gyroListening = true;
  let beta0: number | null = null;
  let gamma0 = 0;
  window.addEventListener(
    "deviceorientation",
    (e) => {
      if (e.beta == null || e.gamma == null) return;
      let beta = e.beta;
      let gamma = e.gamma;
      // En horizontal se intercambian los ejes.
      const angle = screen.orientation?.angle ?? 0;
      if (angle === 90) [beta, gamma] = [-gamma, beta];
      else if (angle === 270 || angle === -90) [beta, gamma] = [gamma, -beta];
      if (beta0 === null) {
        beta0 = beta;
        gamma0 = gamma;
      }
      // La postura de referencia se recentra despacio: cambiar de posición no deja todo torcido.
      beta0 += (beta - beta0) * 0.004;
      gamma0 += (gamma - gamma0) * 0.004;
      motion.gx = clamp((gamma - gamma0) / 18);
      motion.gy = clamp((beta - beta0) / 18);
      motion.gyroAt = performance.now();
    },
    { passive: true },
  );
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
