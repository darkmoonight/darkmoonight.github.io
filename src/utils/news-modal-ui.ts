import { clientT } from "./i18n";
import { parseReleaseMarkdown } from "./release-markdown";
import type { ModalReleaseBullet } from "./release-summary";

export interface NewsModalElements {
  filename: HTMLElement | null;
  title: HTMLElement | null;
  branch: HTMLElement | null;
  sourceBranch: HTMLElement | null;
  summary: HTMLElement | null;
  summaryBlock: HTMLElement | null;
  highlightsBlock: HTMLElement | null;
  highlightsList: HTMLElement | null;
  metaAuthor: HTMLElement | null;
  metaDate: HTMLElement | null;
}

function renderModalBullet(
  li: HTMLLIElement,
  bullet: ModalReleaseBullet,
): void {
  const mark = document.createElement("span");
  mark.className = "news-modal-bullet__mark";
  mark.setAttribute("aria-hidden", "true");
  mark.textContent = "✓";

  const text = document.createElement("span");
  text.className = "news-modal-bullet__text";

  if (bullet.type === "changelog") {
    const label = document.createElement("span");
    label.textContent = `${clientT("news", "fullChangelog")}: `;
    const link = document.createElement("a");
    link.href = bullet.href;
    link.textContent = bullet.compare;
    link.className = "news-modal-changelog-link";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    text.append(label, link);
  } else {
    if (bullet.nested) text.classList.add("news-modal-bullet__text--nested");
    text.textContent = bullet.text;
  }

  li.append(mark, text);
}

export function renderNewsModalHighlights(
  list: HTMLElement | null,
  bullets: ModalReleaseBullet[],
): void {
  if (!list) return;
  list.innerHTML = "";
  bullets.forEach((bullet) => {
    const li = document.createElement("li");
    li.className = "news-modal-bullet";
    renderModalBullet(li, bullet);
    list.appendChild(li);
  });
}

export function applyNewsModalSections(
  summaryBlock: HTMLElement | null,
  highlightsBlock: HTMLElement | null,
  intro: string,
  bulletCount: number,
): void {
  const hasIntro = Boolean(intro);
  const hasBullets = bulletCount > 0;

  summaryBlock?.classList.toggle("hidden", !hasIntro);
  highlightsBlock?.classList.toggle("hidden", !hasBullets);
  highlightsBlock?.classList.toggle(
    "news-modal-highlights--bordered",
    hasIntro && hasBullets,
  );
}

export function fillNewsModalContent(
  elements: NewsModalElements,
  payload: {
    prNumber: number;
    hash: string;
    title: string;
    branch: string;
    author: string;
    date: string;
    intro: string;
    bullets: ModalReleaseBullet[];
    summaryIsMarkdown: boolean;
  },
): void {
  const {
    filename,
    title,
    branch,
    sourceBranch,
    summary,
    metaAuthor,
    metaDate,
  } = elements;

  renderNewsModalHighlights(elements.highlightsList, payload.bullets);
  applyNewsModalSections(
    elements.summaryBlock,
    elements.highlightsBlock,
    payload.intro,
    payload.bullets.length,
  );

  if (filename) filename.textContent = `PR_${payload.prNumber}.md`;
  if (title) title.textContent = payload.title;
  if (branch) branch.textContent = payload.branch;
  if (sourceBranch) sourceBranch.textContent = `patch-${payload.hash}`;

  if (summary) {
    if (payload.intro) {
      summary.innerHTML = payload.summaryIsMarkdown
        ? parseReleaseMarkdown(payload.intro)
        : payload.intro;
    } else {
      summary.textContent = "";
    }
  }

  if (metaAuthor) metaAuthor.textContent = `by @${payload.author}`;
  if (metaDate) metaDate.textContent = payload.date;
}
