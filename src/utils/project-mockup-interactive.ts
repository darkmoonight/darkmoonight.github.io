/** Client-side interactions for Zest, Rain, and IKMS phone mockups on project detail. */

import { clientT } from "./i18n";
import type { IkmsClass } from "./project-mockup";

function readIkmsSchedule(): Record<string, IkmsClass[]> {
  const el = document.getElementById("project-mockup-data");
  try {
    return JSON.parse(el?.getAttribute("data-ikms") || "{}");
  } catch {
    return {};
  }
}

function initZestMockup(signal: AbortSignal) {
  const tasks = document.querySelectorAll<HTMLElement>(".zest-task");
  const ring = document.querySelector<SVGCircleElement>(
    "#zest-progress-ring circle:nth-child(2)",
  );
  const progressText = document.querySelector("#zest-progress-text");
  const progressSub = document.querySelector("#zest-progress-sub");
  const statOpen = document.querySelector("#zest-stat-open");
  const categories = document.querySelectorAll<HTMLElement>(".zest-category");

  const taskStates = Array.from(tasks).map((task) =>
    task.classList.contains("is-done"),
  );

  const setTaskDone = (task: HTMLElement, done: boolean) => {
    task.classList.toggle("is-done", done);
    const chk = task.querySelector(".zest-task-chk");
    if (chk) chk.textContent = done ? "☑" : "☐";
  };

  const updateProgress = () => {
    const done = taskStates.filter(Boolean).length;
    const open = taskStates.length - done;
    const pct = Math.round((done / taskStates.length) * 100);
    if (progressText) progressText.textContent = `${pct}%`;
    if (progressSub) {
      progressSub.textContent = clientT("projectDetail", "mockup.tasksProgress")
        .replace("{done}", String(done))
        .replace("{total}", String(taskStates.length));
    }
    if (statOpen) statOpen.textContent = String(open);
    if (ring) ring.style.strokeDashoffset = String(100 - pct);
  };

  tasks.forEach((task, idx) => {
    task.addEventListener(
      "click",
      () => {
        taskStates[idx] = !taskStates[idx];
        setTaskDone(task, taskStates[idx]);
        updateProgress();
        task.classList.add("is-pressed");
        window.setTimeout(() => task.classList.remove("is-pressed"), 180);
      },
      { signal },
    );
  });

  categories.forEach((chip) => {
    chip.addEventListener(
      "click",
      () => {
        categories.forEach((c) => c.classList.remove("is-active"));
        chip.classList.add("is-active");
      },
      { signal },
    );
  });
}

function initRainMockup(signal: AbortSignal) {
  const cards = document.querySelectorAll<HTMLElement>(".rain-hour-card");
  const mainTemp = document.querySelector("#rain-main-temp");
  const mainStatus = document.querySelector("#rain-main-status");
  const mainIcon = document.querySelector("#rain-main-icon");
  const feelsLike = document.querySelector("#rain-feels-like");
  const todayRange = document.querySelector("#rain-today-range");
  const locationBtn = document.querySelector(".rain-location");

  const statIds = [
    ["humid", "rain-stat-humid"],
    ["wind", "rain-stat-wind"],
    ["barom", "rain-stat-barom"],
    ["uv", "rain-stat-uv"],
    ["vis", "rain-stat-vis"],
    ["precip", "rain-stat-precip"],
  ] as const;

  const selectCard = (card: HTMLElement) => {
    const temp = card.getAttribute("data-temp") || "18°C";
    const status = card.getAttribute("data-status") || "";
    const icon = card.getAttribute("data-icon") || "🌦️";
    const feels = card.getAttribute("data-feels") || "17°";
    const high = card.getAttribute("data-high") || "21°";
    const low = card.getAttribute("data-low") || "14°";

    if (mainTemp) mainTemp.textContent = temp;
    if (mainStatus) mainStatus.textContent = status;
    if (feelsLike) {
      feelsLike.textContent = clientT(
        "projectDetail",
        "mockup.feelsLike",
      ).replace("{temp}", feels);
    }
    if (todayRange) {
      todayRange.textContent = clientT("projectDetail", "mockup.todayRange")
        .replace("{high}", high)
        .replace("{low}", low);
    }
    if (mainIcon) {
      mainIcon.textContent = icon;
      mainIcon.classList.add("is-updated");
      window.setTimeout(() => mainIcon.classList.remove("is-updated"), 400);
    }

    statIds.forEach(([attr, id]) => {
      const el = document.getElementById(id);
      const val = card.getAttribute(`data-${attr}`);
      if (el && val) el.textContent = val;
    });

    cards.forEach((c) => c.classList.toggle("is-active", c === card));
  };

  cards.forEach((card) => {
    card.addEventListener("click", () => selectCard(card), { signal });
  });

  locationBtn?.addEventListener(
    "click",
    () => {
      locationBtn.classList.add("is-pressed");
      window.setTimeout(() => locationBtn.classList.remove("is-pressed"), 200);
      const active =
        document.querySelector<HTMLElement>(".rain-hour-card.is-active") ||
        cards[0];
      if (active) selectCard(active);
    },
    { signal },
  );
}

function bindIkmsClassRows(container: ParentNode, signal: AbortSignal) {
  container.querySelectorAll<HTMLElement>(".ikms-class-row").forEach((row) => {
    row.addEventListener(
      "click",
      () => {
        container
          .querySelectorAll(".ikms-class-row")
          .forEach((el) => el.classList.remove("is-selected"));
        row.classList.add("is-selected");
      },
      { signal },
    );
  });
}

function updateIkmsDaySummary(classes: IkmsClass[]) {
  const countEl = document.getElementById("ikms-classes-today");
  const nextTitle = document.getElementById("ikms-next-title");
  const nextMeta = document.getElementById("ikms-next-meta");

  if (countEl) {
    countEl.textContent = clientT(
      "projectDetail",
      "mockup.classesToday",
    ).replace("{n}", String(classes.length));
  }

  const first = classes[0];
  if (first && nextTitle) nextTitle.textContent = first.sub;
  if (first && nextMeta)
    nextMeta.textContent = `${first.room} • ${first.prof} · ${first.time}`;
}

function initIkmsMockup(signal: AbortSignal) {
  const dayTabs = document.querySelectorAll<HTMLElement>(".ikms-day-tab");
  const classList = document.querySelector("#ikms-class-list");
  const schedule = readIkmsSchedule();

  if (classList) bindIkmsClassRows(classList, signal);

  const renderDay = (day: string, activeTab: HTMLElement) => {
    dayTabs.forEach((t) => t.classList.toggle("is-active", t === activeTab));
    const classes = schedule[day] || [];
    if (!classList) return;

    classList.innerHTML = "";
    classes.forEach((c, i) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = `ikms-class-row phone-app-card border-l-4 ${c.color}`;
      row.style.animationDelay = `${i * 60}ms`;
      row.innerHTML = `
        <div class="ikms-class-row__main">
          <div class="ikms-class-row__title">${c.sub}</div>
          <div class="ikms-class-row__meta">${c.room} • ${c.prof}</div>
        </div>
        <span class="ikms-class-row__time">${c.time}</span>
      `;
      classList.appendChild(row);
    });
    bindIkmsClassRows(classList, signal);
    updateIkmsDaySummary(classes);
    classList.classList.add("is-switching");
    window.setTimeout(() => classList.classList.remove("is-switching"), 320);
  };

  dayTabs.forEach((tab) => {
    tab.addEventListener(
      "click",
      () => renderDay(tab.getAttribute("data-day") || "mon", tab),
      { signal },
    );
  });
}

function initPhoneNav(signal: AbortSignal) {
  const screen = document.querySelector(".phone-app-screen");
  const nav = screen?.querySelector(".phone-app-nav");
  if (!screen || !nav) return;

  const buttons = nav.querySelectorAll<HTMLButtonElement>(".phone-app-nav-btn");
  const panels = screen.querySelectorAll<HTMLElement>("[data-phone-nav-panel]");

  buttons.forEach((btn) => {
    btn.addEventListener(
      "click",
      () => {
        const panelId = btn.getAttribute("data-nav") || "home";
        buttons.forEach((b) => b.classList.toggle("is-active", b === btn));
        panels.forEach((p) => {
          p.classList.toggle(
            "is-active",
            p.getAttribute("data-phone-nav-panel") === panelId,
          );
        });
      },
      { signal },
    );
  });
}

export function initProjectMockups(signal: AbortSignal) {
  if (document.querySelector(".zest-task")) initZestMockup(signal);
  if (document.querySelector(".rain-hour-card")) initRainMockup(signal);
  if (document.querySelector(".ikms-day-tab")) initIkmsMockup(signal);
  initPhoneNav(signal);
}
