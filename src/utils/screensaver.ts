const IDLE_TIMEOUT_MS = 60_000;
const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
] as const;

let ssInterval: ReturnType<typeof setInterval> | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function wakeUpScreensaver(): void {
  const ssOverlay = document.getElementById("screensaver-overlay");
  if (!ssOverlay) return;

  ssOverlay.style.opacity = "0";
  ssOverlay.classList.remove("pointer-events-auto");
  ssOverlay.classList.add("pointer-events-none");

  window.setTimeout(() => {
    ssOverlay.classList.add("hidden");
  }, 700);

  stopScreensaverAnimation();
}

function stopScreensaverAnimation(): void {
  if (ssInterval) {
    clearInterval(ssInterval);
    ssInterval = null;
  }
}

function startScreensaverAnimation(): void {
  const ssCanvas = document.getElementById(
    "screensaver-canvas",
  ) as HTMLCanvasElement | null;
  if (!ssCanvas || prefersReducedMotion()) return;

  const ctx = ssCanvas.getContext("2d");
  if (!ctx) return;
  const ssCtx = ctx;
  const canvas = ssCanvas;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const fontSize = 13;
  const columns = Math.floor(canvas.width / fontSize);
  const drops: number[] = Array(columns).fill(1);
  const binaryAlphabet = "01010101010101010101010101010101";

  function draw() {
    ssCtx.fillStyle = "rgba(5, 6, 11, 0.05)";
    ssCtx.fillRect(0, 0, canvas.width, canvas.height);

    ssCtx.fillStyle = "#818cf8";
    ssCtx.font = `${fontSize}px monospace`;

    for (let i = 0; i < drops.length; i++) {
      const char =
        binaryAlphabet[Math.floor(Math.random() * binaryAlphabet.length)];
      const x = i * fontSize;
      const y = drops[i] * fontSize;

      ssCtx.fillText(char, x, y);

      if (y > canvas.height && Math.random() > 0.98) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }

  if (ssInterval) clearInterval(ssInterval);
  ssInterval = setInterval(draw, 33);
}

function activateScreensaver(): void {
  const ssOverlay = document.getElementById("screensaver-overlay");
  const ssCanvas = document.getElementById(
    "screensaver-canvas",
  ) as HTMLCanvasElement | null;
  if (!ssOverlay || !ssCanvas || prefersReducedMotion()) return;

  ssOverlay.classList.remove("hidden");
  window.setTimeout(() => {
    ssOverlay.style.opacity = "1";
    ssOverlay.classList.remove("pointer-events-none");
    ssOverlay.classList.add("pointer-events-auto");
    ssOverlay.focus();
  }, 50);

  startScreensaverAnimation();
}

function resetIdleTimer(): void {
  const ssOverlay = document.getElementById("screensaver-overlay");
  if (ssOverlay && !ssOverlay.classList.contains("hidden")) {
    wakeUpScreensaver();
  }

  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(activateScreensaver, IDLE_TIMEOUT_MS);
}

export function initScreensaver(): void {
  const ssOverlay = document.getElementById("screensaver-overlay");
  const ssCanvas = document.getElementById(
    "screensaver-canvas",
  ) as HTMLCanvasElement | null;
  if (!ssOverlay || !ssCanvas) return;

  ACTIVITY_EVENTS.forEach((evt) => {
    window.addEventListener(evt, resetIdleTimer, { passive: true });
  });

  ssOverlay.addEventListener("keydown", (e) => {
    if (!ssOverlay.classList.contains("hidden")) {
      wakeUpScreensaver();
      e.preventDefault();
    }
  });

  window.addEventListener("resize", () => {
    if (!ssOverlay.classList.contains("hidden")) {
      ssCanvas.width = window.innerWidth;
      ssCanvas.height = window.innerHeight;
    }
  });

  resetIdleTimer();
}
