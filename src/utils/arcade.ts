import { DOM_IDS } from "../constants/dom-ids";
import { STORAGE_KEYS } from "../constants/storage";
import { addBugsSquashed } from "./bugs-storage";
import { clientT } from "./i18n";
import { notifyTerminal } from "./terminal-notify";

const KONAMI_CODE = [
  "arrowup",
  "arrowup",
  "arrowdown",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "arrowleft",
  "arrowright",
  "b",
  "a",
] as const;

type Point = { x: number; y: number };

function playArcadeIntro(): void {
  try {
    const audioCtx = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();
    const now = audioCtx.currentTime;

    const playTone = (freq: number, start: number, dur: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.06, start);
      gain.gain.setValueAtTime(0.06, start + dur - 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.start(start);
      osc.stop(start + dur);
    };

    playTone(261.63, now, 0.08);
    playTone(329.63, now + 0.08, 0.08);
    playTone(392.0, now + 0.16, 0.08);
    playTone(523.25, now + 0.24, 0.16);
  } catch (e) {
    console.warn("Audio intro fail:", e);
  }
}

function initSnakeGame(modalEl: HTMLElement): void {
  const canvas = modalEl.querySelector(
    "#arcade-canvas",
  ) as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const gameCanvas = canvas;
  const gameCtx = ctx;

  const grid = 15;
  const tileCount = canvas.width / grid;

  let snake: Point[] = [
    { x: 8, y: 8 },
    { x: 7, y: 8 },
    { x: 6, y: 8 },
  ];
  let dx = 1;
  let dy = 0;

  let food = { x: 12, y: 5 };
  let score = 0;
  let highscore = Number(
    localStorage.getItem(STORAGE_KEYS.arcadeHighscore) || "0",
  );

  const scoreEl = modalEl.querySelector("#arcade-score");
  const highscoreEl = modalEl.querySelector("#arcade-highscore");
  const gameOverEl = modalEl.querySelector("#arcade-game-over");
  const restartBtn = modalEl.querySelector("#restart-arcade");

  if (highscoreEl) highscoreEl.textContent = String(highscore);

  function spawnFood(): void {
    food.x = Math.floor(Math.random() * tileCount);
    food.y = Math.floor(Math.random() * tileCount);
    for (const cell of snake) {
      if (cell.x === food.x && cell.y === food.y) {
        spawnFood();
        break;
      }
    }
  }

  let gameInterval: ReturnType<typeof setInterval> | null = null;

  function playBeepSound(type: "eat" | "dead"): void {
    try {
      const audioCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === "eat") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.setValueAtTime(850, audioCtx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          audioCtx.currentTime + 0.12,
        );
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      } else {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(60, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          audioCtx.currentTime + 0.3,
        );
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch {}
  }

  function collision(cell: Point): boolean {
    for (let i = 1; i < snake.length; i++) {
      if (snake[i].x === cell.x && snake[i].y === cell.y) return true;
    }
    return false;
  }

  function gameOver(): void {
    if (gameInterval) clearInterval(gameInterval);
    playBeepSound("dead");
    gameOverEl?.classList.add("is-open");
  }

  function draw(): void {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    if (
      head.x < 0 ||
      head.x >= tileCount ||
      head.y < 0 ||
      head.y >= tileCount ||
      collision(head)
    ) {
      gameOver();
      return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score++;
      if (scoreEl) scoreEl.textContent = String(score);
      playBeepSound("eat");

      if (score % 5 === 0) {
        addBugsSquashed(1);
        notifyTerminal(clientT("layout", "arcadeWin"), "success");
      }

      if (score > highscore) {
        highscore = score;
        localStorage.setItem(STORAGE_KEYS.arcadeHighscore, String(highscore));
        if (highscoreEl) highscoreEl.textContent = String(highscore);
      }

      spawnFood();
    } else {
      snake.pop();
    }

    gameCtx.fillStyle = "#020205";
    gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

    gameCtx.strokeStyle = "rgba(16, 185, 129, 0.03)";
    for (let i = 0; i < tileCount; i++) {
      gameCtx.beginPath();
      gameCtx.moveTo(i * grid, 0);
      gameCtx.lineTo(i * grid, gameCanvas.height);
      gameCtx.stroke();

      gameCtx.beginPath();
      gameCtx.moveTo(0, i * grid);
      gameCtx.lineTo(gameCanvas.width, i * grid);
      gameCtx.stroke();
    }

    gameCtx.fillStyle = "#e11d48";
    gameCtx.fillRect(food.x * grid + 2, food.y * grid + 2, grid - 4, grid - 4);
    gameCtx.fillStyle = "#ffffff";
    gameCtx.fillRect(food.x * grid + 5, food.y * grid + 1, 2, 1);
    gameCtx.fillRect(food.x * grid + 8, food.y * grid + 1, 2, 1);

    snake.forEach((cell, idx) => {
      gameCtx.fillStyle = idx === 0 ? "#10b981" : "rgba(16, 185, 129, 0.75)";
      gameCtx.fillRect(
        cell.x * grid + 1,
        cell.y * grid + 1,
        grid - 2,
        grid - 2,
      );
      if (idx === 0) {
        gameCtx.fillStyle = "#000000";
        gameCtx.fillRect(cell.x * grid + 4, cell.y * grid + 4, 2, 2);
        gameCtx.fillRect(cell.x * grid + 10, cell.y * grid + 4, 2, 2);
      }
    });
  }

  function startLoop(): void {
    gameOverEl?.classList.remove("is-open");
    snake = [
      { x: 8, y: 8 },
      { x: 7, y: 8 },
      { x: 6, y: 8 },
    ];
    dx = 1;
    dy = 0;
    score = 0;
    if (scoreEl) scoreEl.textContent = "0";
    spawnFood();
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(draw, 100);
  }

  function handleControls(e: KeyboardEvent): void {
    const key = e.key;
    if (key === "ArrowUp" && dy === 0) {
      dx = 0;
      dy = -1;
      e.preventDefault();
    } else if (key === "ArrowDown" && dy === 0) {
      dx = 0;
      dy = 1;
      e.preventDefault();
    } else if (key === "ArrowLeft" && dx === 0) {
      dx = -1;
      dy = 0;
      e.preventDefault();
    } else if (key === "ArrowRight" && dx === 0) {
      dx = 1;
      dy = 0;
      e.preventDefault();
    } else if (
      (key === "r" || key === "R" || key === "к" || key === "К") &&
      gameOverEl?.classList.contains("is-open")
    ) {
      startLoop();
      e.preventDefault();
    }
  }

  window.addEventListener("keydown", handleControls);
  restartBtn?.addEventListener("click", startLoop);
  startLoop();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.removedNodes) {
        if ((node as HTMLElement).id === DOM_IDS.retroArcadeModal) {
          if (gameInterval) clearInterval(gameInterval);
          window.removeEventListener("keydown", handleControls);
          observer.disconnect();
        }
      }
    }
  });
  observer.observe(document.body, { childList: true });
}

function triggerArcadeMode(): void {
  if (document.getElementById(DOM_IDS.retroArcadeModal)) return;

  playArcadeIntro();
  notifyTerminal(clientT("layout", "konamiStart"), "success");

  const arcadeModal = document.createElement("div");
  arcadeModal.id = DOM_IDS.retroArcadeModal;
  arcadeModal.className =
    "md3-modal-scrim fixed inset-0 z-[999999] flex items-center justify-center p-4 scanlines";

  arcadeModal.innerHTML = `
    <div class="relative w-full max-w-sm md3-panel overflow-hidden text-center font-mono text-text-primary z-50" style="border-color: color-mix(in srgb, var(--accent) 50%, var(--md3-outline)); box-shadow: var(--md3-elevation-3);">
      <button type="button" id="close-arcade" class="absolute top-2 right-2 md3-btn-outlined text-red-500 border-red-500/40 hover:bg-red-500 hover:text-white text-xs py-1 px-2">X</button>
      <div class="md3-panel-bar justify-center">
        <h3 class="text-sm font-bold text-accent tracking-wider">${clientT("layout", "arcadeTitle")}</h3>
      </div>
      <div class="md3-panel-body">
        <p class="text-[10px] text-text-secondary mb-4 leading-normal">${clientT("layout", "arcadeHelp")}</p>
        <div class="relative mx-auto border-2 border-border-color/80 w-60 h-60" style="background: var(--term-screen-bg);">
          <canvas id="arcade-canvas" width="240" height="240"></canvas>
          <div id="arcade-game-over" class="arcade-game-over absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-3">
            <span class="text-red-500 font-bold text-sm tracking-widest animate-pulse">${clientT("layout", "gameOver")}</span>
            <button type="button" id="restart-arcade" class="md3-btn-tonal text-[10px] py-1 px-3 normal-case">${clientT("layout", "restart")}</button>
          </div>
        </div>
        <div class="mt-4 flex justify-between items-center text-xs border-t border-border-color/40 pt-3">
          <div>${clientT("layout", "score")} <span id="arcade-score" class="font-bold text-accent-success">0</span></div>
          <div>${clientT("layout", "highScore")} <span id="arcade-highscore" class="font-bold text-accent-secondary">0</span></div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(arcadeModal);
  document.body.style.overflow = "hidden";

  arcadeModal.querySelector("#close-arcade")?.addEventListener("click", () => {
    arcadeModal.remove();
    document.body.style.overflow = "";
  });

  initSnakeGame(arcadeModal);
}

export function initKonamiArcade(): void {
  let konamiIndex = 0;

  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (key === KONAMI_CODE[konamiIndex]) {
      konamiIndex++;
      if (konamiIndex === KONAMI_CODE.length) {
        konamiIndex = 0;
        triggerArcadeMode();
      }
    } else {
      konamiIndex = key === KONAMI_CODE[0] ? 1 : 0;
    }
  });
}
