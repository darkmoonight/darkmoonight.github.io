import { PROJECT_DETAIL_OLDER_RELEASES } from "../constants/project-detail";
import { localizedField, type Language } from "./i18n";
import type { ReleaseNewsItem } from "./github-releases";
import { escapeAttr, escapeHtml } from "./html";
import { stripTrailingSlash } from "./github-format";
import {
  PROJECT_DETAIL_RELEASE_SUMMARY,
  summarizeReleaseNotes,
} from "./release-summary";

export interface ProjectDetailReleaseLabels {
  latestRelease: string;
  releaseNotes: string;
  noDetails: string;
}

export function releaseNotesUrl(
  release: ReleaseNewsItem,
  githubBase: string,
): string {
  const base = stripTrailingSlash(githubBase);
  return `${base}/releases/tag/${encodeURIComponent(release.tag)}`;
}

export function splitDetailReleases(releases: ReleaseNewsItem[]) {
  return {
    latest: releases[0] ?? null,
    older: releases.slice(1, 1 + PROJECT_DETAIL_OLDER_RELEASES),
  };
}

export function buildReleaseBulletsHtml(
  summary: string,
  noDetailsLabel: string,
): string {
  const highlights = summary
    ? summarizeReleaseNotes(summary, PROJECT_DETAIL_RELEASE_SUMMARY)
    : [];
  if (!highlights.length) {
    return `<p class="project-detail-releases-empty text-text-muted font-mono">${escapeHtml(noDetailsLabel)}</p>`;
  }
  const items = highlights.map((line) => `<li>${line}</li>`).join("");
  return `<div class="project-detail-release-notes"><ul class="project-detail-release-bullets project-detail-release-bullets--detail">${items}</ul></div>`;
}

export function buildLatestReleaseBlockHtml(
  latest: ReleaseNewsItem,
  lang: Language,
  labels: ProjectDetailReleaseLabels,
  githubBase: string,
): string {
  const info = localizedField(lang, latest);
  const href = escapeAttr(releaseNotesUrl(latest, githubBase));
  const head = `
    <a href="${href}" target="_blank" rel="noopener noreferrer" class="project-detail-releases-latest-head">
      <span class="term-section-label project-detail-releases-label normal-case shrink-0">${escapeHtml(labels.latestRelease)}</span>
      <span class="project-detail-releases-meta-inline">
        <span class="md3-chip project-detail-releases-chip">${escapeHtml(latest.tag)}</span>
        ${latest.apkSizeLabel ? `<span class="md3-chip project-detail-releases-chip project-detail-releases-chip--size">${escapeHtml(latest.apkSizeLabel)}</span>` : ""}
        <span class="text-text-muted project-detail-releases-meta">${escapeHtml(latest.date)}</span>
      </span>
      <span class="project-detail-releases-latest-head__link">${escapeHtml(labels.releaseNotes)}</span>
    </a>`;
  return `${head}${buildReleaseBulletsHtml(info.summary || "", labels.noDetails)}`;
}

export function buildOlderReleasesListHtml(
  older: ReleaseNewsItem[],
  githubBase: string,
): string {
  if (!older.length) return "";
  const base = stripTrailingSlash(githubBase);
  return older
    .map((release) => {
      const href = escapeAttr(releaseNotesUrl(release, base));
      return `<li>
        <a href="${href}" target="_blank" rel="noopener noreferrer" class="project-detail-releases-history-item">
          <span class="project-detail-releases-history-item__tag">${escapeHtml(release.tag)}</span>
          ${release.apkSizeLabel ? `<span class="project-detail-releases-history-item__size">${escapeHtml(release.apkSizeLabel)}</span>` : ""}
          <span class="project-detail-releases-history-item__date">${escapeHtml(release.date)}</span>
        </a>
      </li>`;
    })
    .join("");
}

export function buildProjectDetailReleaseLabels(
  t: (key: string) => string,
): ProjectDetailReleaseLabels {
  return {
    latestRelease: t("projectDetail.latestRelease"),
    releaseNotes: t("projectDetail.releaseNotes"),
    noDetails: t("github.noDetails"),
  };
}
