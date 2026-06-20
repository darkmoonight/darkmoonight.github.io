import { escapeHtml } from "./html";

export const GITHUB_LANGUAGES_LIST_ATTR = "data-github-languages-list";

const LANGUAGE_COLORS: Record<string, string> = {
  Astro: "#ff5a03",
  "C++": "#f34b7d",
  CMake: "#064f8c",
  CSS: "#663399",
  Dart: "#00b4ab",
  HTML: "#e34c26",
  Java: "#b07219",
  JavaScript: "#f1e05a",
  Kotlin: "#a97bff",
  Other: "#8b949e",
  Python: "#3572a5",
  Rust: "#dea584",
  Shell: "#89e051",
  Swift: "#f05138",
  TypeScript: "#3178c6",
};

export type LanguageBreakdownEntry = {
  name: string;
  pct: number;
  color: string;
};

function getLanguageColor(name: string): string {
  return LANGUAGE_COLORS[name] ?? LANGUAGE_COLORS.Other;
}

export function sortLanguageBreakdown(
  languages: Record<string, number>,
): LanguageBreakdownEntry[] {
  return Object.entries(languages)
    .filter(([, pct]) => pct > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, pct]) => ({
      name,
      pct,
      color: getLanguageColor(name),
    }));
}

export function formatLanguagePercent(pct: number): string {
  const rounded = Math.round(pct * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

function languageAriaLabel(entries: LanguageBreakdownEntry[]): string {
  return entries
    .map((e) => `${e.name} ${formatLanguagePercent(e.pct)}`)
    .join(", ");
}

function buildProjectLanguagesTagsHtml(
  languages: Record<string, number>,
): string {
  const entries = sortLanguageBreakdown(languages);
  if (!entries.length) return "";

  return entries
    .map((entry) => {
      const pct = formatLanguagePercent(entry.pct);
      return `<span class="md3-chip project-languages-tag">${escapeHtml(entry.name)} ${pct}</span>`;
    })
    .join("");
}

function buildProjectLanguagesInnerHtml(
  languages: Record<string, number>,
): string {
  const entries = sortLanguageBreakdown(languages);
  if (!entries.length) return "";

  const barSegments = entries
    .map((entry) => {
      const label = `${entry.name} ${formatLanguagePercent(entry.pct)}`;
      return `<span class="project-languages__segment" style="--lang-color:${entry.color};--lang-width:${entry.pct}%" title="${escapeHtml(label)}" aria-hidden="true"></span>`;
    })
    .join("");

  const legendItems = entries
    .map((entry) => {
      const pct = formatLanguagePercent(entry.pct);
      return `<li class="project-languages__item">
        <span class="project-languages__dot" style="background:${entry.color}" aria-hidden="true"></span>
        <span class="project-languages__name">${escapeHtml(entry.name)}</span>
        <span class="project-languages__pct">${pct}</span>
      </li>`;
    })
    .join("");

  return `<div class="project-languages__bar" role="img" aria-label="${escapeHtml(languageAriaLabel(entries))}">${barSegments}</div><ul class="project-languages__legend">${legendItems}</ul>`;
}

export const GITHUB_LANGUAGES_VARIANT_ATTR = "data-github-languages-variant";

export function githubLanguagesSelector(projectId: string): string {
  return `[${GITHUB_LANGUAGES_LIST_ATTR}="${projectId}"]`;
}

export function buildProjectLanguagesDomHtml(
  languages: Record<string, number>,
  variant: "bar" | "tags",
): string {
  return variant === "tags"
    ? buildProjectLanguagesTagsHtml(languages)
    : buildProjectLanguagesInnerHtml(languages);
}
