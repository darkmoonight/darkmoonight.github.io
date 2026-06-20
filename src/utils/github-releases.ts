/** Normalize GitHub /releases payloads into localized ReleaseNewsItem rows. */

import { PROJECT_DETAIL_RELEASE_COUNT } from "../constants/project-detail";
import { GITHUB_ORG } from "../constants/github";
import {
  parseReleaseApkVariants,
  pickDefaultApkVariant,
  type ReleaseApkVariant,
} from "./release-apk-variants";
import { tLang } from "./i18n";

export type { ReleaseApkVariant } from "./release-apk-variants";

export const NEWS_FEED_LIMIT = 15;
export const NEWS_VISIBLE_ROWS = 5;
export const PROJECT_RELEASES_LIMIT = PROJECT_DETAIL_RELEASE_COUNT;

export interface ReleaseNewsItem {
  hash: string;
  tag: string;
  date: string;
  author: string;
  prNumber: number;
  repo: string;
  apkUrl: string;
  apkSizeLabel: string;
  apkFileName: string;
  apkVariants: ReleaseApkVariant[];
  defaultApkId: string;
  en: { title: string; summary: string };
  ru: { title: string; summary: string };
}

export type ReleaseApkAsset = {
  name: string;
  browser_download_url: string;
  size?: number;
};

function isPublicRelease(release: Record<string, unknown>): boolean {
  if (release.draft === true) return false;
  if (release.prerelease === true) return false;
  return Boolean(release.published_at);
}

function parseRelease(
  repo: string,
  release: Record<string, unknown>,
): ReleaseNewsItem | null {
  if (!isPublicRelease(release)) return null;
  const assets = release.assets as ReleaseApkAsset[] | undefined;
  const apkVariants = parseReleaseApkVariants(assets);
  const defaultApk = pickDefaultApkVariant(apkVariants);
  let apkUrl = defaultApk?.url ?? "";
  if (!apkUrl) apkUrl = String(release.html_url || "");
  const apkSizeLabel = defaultApk?.sizeLabel ?? "";
  const apkFileName = defaultApk?.fileName ?? "";
  const defaultApkId = defaultApk?.id ?? "";

  const published = release.published_at || release.created_at;
  const releaseDate = published
    ? new Date(String(published)).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  const author = release.author as { login?: string } | undefined;
  const tag = String(release.tag_name || "");
  const name = String(release.name || "");
  const body = String(release.body || "");

  const title = formatReleaseTitle(repo, tag, name);

  return {
    hash: release.target_commitish
      ? String(release.target_commitish).substring(0, 7)
      : tag,
    tag,
    date: releaseDate,
    author: author?.login || GITHUB_ORG,
    prNumber: Number(release.id) || 0,
    repo,
    apkUrl,
    apkSizeLabel,
    apkFileName,
    apkVariants,
    defaultApkId,
    en: {
      title,
      summary: body || tLang("en", "github.noDetails"),
    },
    ru: {
      title,
      summary: body || tLang("ru", "github.noDetails"),
    },
  };
}

function formatReleaseTitle(repo: string, tag: string, name: string): string {
  // Prefer "repo · name" unless GitHub title repeats repo/tag or ends with ": tag".
  const tagNorm = tag.trim();
  const defaultTitle = `${repo} ${tagNorm}`;

  let releaseName = name.trim();
  if (!releaseName) return defaultTitle;

  const colonSuffix = releaseName.match(/:(?:\s*)(\S+)\s*$/);
  if (colonSuffix && colonSuffix[1].toLowerCase() === tagNorm.toLowerCase()) {
    releaseName = releaseName.slice(0, releaseName.lastIndexOf(":")).trim();
  }

  if (!releaseName) return defaultTitle;
  if (releaseName.toLowerCase() === tagNorm.toLowerCase()) return defaultTitle;
  if (releaseName.toLowerCase() === defaultTitle.toLowerCase())
    return defaultTitle;

  const repoPrefix = `${repo} `;
  if (releaseName.startsWith(repoPrefix)) return releaseName;

  return `${repo} · ${releaseName}`;
}

export function parsePublicReleases(
  repo: string,
  data: Record<string, unknown>[],
): ReleaseNewsItem[] {
  return data
    .filter(isPublicRelease)
    .map((release) => parseRelease(repo, release))
    .filter((item): item is ReleaseNewsItem => item !== null);
}

export function sortAndLimitReleases(
  items: ReleaseNewsItem[],
  limit = 5,
): ReleaseNewsItem[] {
  return [...items]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}
