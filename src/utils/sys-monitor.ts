import { STORAGE_KEYS } from "../constants/storage";
import { clientT } from "./i18n";
import { persistGithubRateLimit } from "./github-http";

let sysInterval: ReturnType<typeof setInterval> | null = null;
let cpuHistory: number[] = Array(30).fill(10);
let clickBound = false;

function getElements() {
  return {
    panel: document.getElementById("sys-monitor-panel"),
    cpuVal: document.getElementById("sys-cpu-val"),
    cpuBar: document.getElementById("sys-cpu-bar") as HTMLElement | null,
    ramVal: document.getElementById("sys-ram-val"),
    ramBar: document.getElementById("sys-ram-bar") as HTMLElement | null,
    pingVal: document.getElementById("sys-ping-val"),
    ratelimitVal: document.getElementById("sys-ratelimit-val"),
    cpuCanvas: document.getElementById(
      "sys-cpu-canvas",
    ) as HTMLCanvasElement | null,
  };
}

function drawCpuGraph(cpuCanvas: HTMLCanvasElement): void {
  const ctx = cpuCanvas.getContext("2d");
  if (!ctx) return;

  cpuCanvas.width = cpuCanvas.clientWidth;
  cpuCanvas.height = cpuCanvas.clientHeight;
  ctx.clearRect(0, 0, cpuCanvas.width, cpuCanvas.height);

  ctx.strokeStyle = "rgba(165, 180, 252, 0.05)";
  ctx.lineWidth = 1;
  for (let i = 0; i < cpuCanvas.width; i += 20) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, cpuCanvas.height);
    ctx.stroke();
  }
  for (let i = 0; i < cpuCanvas.height; i += 10) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(cpuCanvas.width, i);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(129, 140, 248, 0.8)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();

  const step = cpuCanvas.width / (cpuHistory.length - 1);
  cpuHistory.forEach((val, i) => {
    const x = i * step;
    const y = cpuCanvas.height - (val / 100) * cpuCanvas.height - 2;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = "rgba(129, 140, 248, 0.08)";
  ctx.lineTo(cpuCanvas.width, cpuCanvas.height);
  ctx.lineTo(0, cpuCanvas.height);
  ctx.closePath();
  ctx.fill();
}

function updateMetrics(): void {
  const { cpuVal, cpuBar, ramVal, ramBar, ratelimitVal, cpuCanvas } =
    getElements();

  const currentCpu = Math.floor(Math.random() * 25) + 8;
  if (cpuVal) cpuVal.textContent = `${currentCpu}%`;
  if (cpuBar) cpuBar.style.width = `${currentCpu}%`;

  cpuHistory.push(currentCpu);
  cpuHistory.shift();
  if (cpuCanvas) drawCpuGraph(cpuCanvas);

  const currentRam = Math.floor(Math.random() * 15) + 240;
  const ramPct = Math.floor((currentRam / 1024) * 100);
  if (ramVal) ramVal.textContent = `${currentRam} MB`;
  if (ramBar) ramBar.style.width = `${ramPct}%`;

  const remaining =
    localStorage.getItem(STORAGE_KEYS.githubApiRemaining) || "56";
  if (ratelimitVal) ratelimitVal.textContent = remaining;
}

function stopSysUpdates(): void {
  if (sysInterval) {
    clearInterval(sysInterval);
    sysInterval = null;
  }
}

function startSysUpdates(): void {
  if (sysInterval) clearInterval(sysInterval);
  sysInterval = setInterval(updateMetrics, 1000);
  updateMetrics();
}

async function triggerPing(): Promise<void> {
  const { panel, pingVal, ratelimitVal } = getElements();
  if (panel?.classList.contains("hidden")) return;

  const startTime = Date.now();
  try {
    const response = await fetch("https://api.github.com", { method: "HEAD" });
    const latency = Date.now() - startTime;

    if (pingVal) {
      pingVal.textContent = `${latency} ms`;
      pingVal.className =
        latency < 200
          ? "font-bold text-accent-success"
          : latency < 500
            ? "font-bold text-accent-secondary"
            : "font-bold text-red-500";
    }

    const remainingHeader = response.headers.get("X-RateLimit-Remaining");
    if (remainingHeader) {
      persistGithubRateLimit(response);
      if (ratelimitVal) ratelimitVal.textContent = remainingHeader;
    }
  } catch {
    if (pingVal) {
      pingVal.textContent = clientT("common", "pingTimeout");
      pingVal.className = "font-bold text-red-500";
    }
  }

  window.setTimeout(triggerPing, 10_000);
}

export function toggleSysMonitor(): void {
  const { panel } = getElements();
  if (!panel) return;

  const willOpen = panel.classList.contains("hidden");
  panel.classList.toggle("hidden", !willOpen);

  if (willOpen) {
    startSysUpdates();
    triggerPing();
  } else {
    stopSysUpdates();
  }
}

function bindSysMonitorClicks(): void {
  if (clickBound) return;
  clickBound = true;

  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    if (!target?.closest) return;

    if (
      target.closest("#footer-sys-mon-btn") ||
      target.closest("#close-sys-monitor")
    ) {
      event.preventDefault();
      toggleSysMonitor();
    }
  });
}

let sysMonitorInitialized = false;

export function initSysMonitor(): void {
  if (sysMonitorInitialized) return;
  sysMonitorInitialized = true;
  bindSysMonitorClicks();
}
