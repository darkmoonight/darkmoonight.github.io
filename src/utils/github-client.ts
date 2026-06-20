import {
  CLIENT_CACHE_TTL_MS,
  CLIENT_CACHE_VERSION,
  GITHUB_ORG,
  NEWS_REPO_NAMES,
  PROJECT_IDS,
  repoApiName,
} from "../constants/github";
import {
  PROJECT_DETAIL_RELEASE_COUNT,
  PROJECT_DETAIL_RELEASES_PER_PAGE,
} from "../constants/project-detail";
import { DOM_IDS } from "../constants/dom-ids";
import { STORAGE_KEYS } from "../constants/storage";
import { formatLastPush } from "./format-last-push";
import { formatHeroProjectsList, type HeroProjectEntry } from "./hero-projects";
import {
  buildGithubApiUrl,
  githubApiHeaders,
  persistGithubRateLimit,
} from "./github-http";
import { aggregateOrgTechStack } from "./github-languages";
import {
  fetchOrgProfileRaw,
  mapOrgProfile,
  type MappedOrgProfile,
} from "./github-org";
import { buildRepoLiveMeta, type ProjectLiveMeta } from "./github-repo-meta";
import {
  NEWS_FEED_LIMIT,
  parsePublicReleases,
  sortAndLimitReleases,
  type ReleaseNewsItem,
} from "./github-releases";
import { fetchAllRepoReleases, fetchRepoMetaBundle } from "./github-repo-fetch";
import { clientT } from "./i18n";
import {
  buildProjectLanguagesDomHtml,
  GITHUB_LANGUAGES_VARIANT_ATTR,
  githubLanguagesSelector,
} from "./project-languages";

/** Browser-side GitHub live refresh (localStorage cache, DOM patches). SSR uses github-api.ts. */

let refreshInFlight: Promise<void> | null = null;
let clientRateLimitBlocked = false;

export const GITHUB_NEWS_UPDATED_EVENT = "github-news-updated";

export type GitHubOrgLive = MappedOrgProfile;

export type RepoStats = Record<string, { stars: number; forks: number }>;

function migrateClientCache(): void {
  try {
    if (
      localStorage.getItem(STORAGE_KEYS.githubClientCacheV) ===
      CLIENT_CACHE_VERSION
    )
      return;
    localStorage.removeItem(STORAGE_KEYS.githubReleasesNews);
    localStorage.removeItem(STORAGE_KEYS.githubReleasesNewsTime);
    localStorage.removeItem(STORAGE_KEYS.githubReposStats);
    localStorage.removeItem(STORAGE_KEYS.githubReposStatsTime);
    localStorage.removeItem(STORAGE_KEYS.githubProjectsMeta);
    localStorage.removeItem(STORAGE_KEYS.githubProjectsMetaTime);
    localStorage.removeItem(STORAGE_KEYS.githubOrgProfile);
    localStorage.removeItem(STORAGE_KEYS.githubOrgProfileTime);
    localStorage.setItem(STORAGE_KEYS.githubClientCacheV, CLIENT_CACHE_VERSION);
  } catch {}
}

function readClientRateLimitRemaining(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.githubApiRemaining);
    if (raw == null) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function blockClientGithubRequests(): void {
  // After 403/429, stop hammering the API until the page reloads.
  clientRateLimitBlocked = true;
  try {
    localStorage.setItem(STORAGE_KEYS.githubApiRemaining, "0");
  } catch {}
}

function githubLiveFetch(path: string): Promise<Response> {
  if (clientRateLimitBlocked || readClientRateLimitRemaining() === 0) {
    clientRateLimitBlocked = true;
    return Promise.resolve(
      new Response(null, { status: 403, statusText: "Rate limit exceeded" }),
    );
  }

  return fetch(buildGithubApiUrl(path), {
    cache: "no-store",
    headers: githubApiHeaders(),
  }).then((res) => {
    persistGithubRateLimit(res);
    if (res.status === 403 || res.status === 429) {
      blockClientGithubRequests();
    }
    return res;
  });
}

function isClientCacheFresh(timeKey: string): boolean {
  try {
    const timeRaw = localStorage.getItem(timeKey);
    if (!timeRaw) return false;
    const age = Date.now() - Number(timeRaw);
    return Number.isFinite(age) && age >= 0 && age <= CLIENT_CACHE_TTL_MS;
  } catch {
    return false;
  }
}

/** Read a JSON localStorage entry; skips expired items unless allowStale. */
function readJsonCache<T>(
  dataKey: string,
  timeKey: string,
  allowStale = false,
): T | null {
  try {
    const raw = localStorage.getItem(dataKey);
    if (!raw) return null;
    if (!allowStale && !isClientCacheFresh(timeKey)) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJsonCache(
  dataKey: string,
  timeKey: string,
  value: unknown,
): void {
  localStorage.setItem(dataKey, JSON.stringify(value));
  localStorage.setItem(timeKey, String(Date.now()));
}

function repoStatsFromMeta(meta: Record<string, ProjectLiveMeta>): RepoStats {
  return Object.fromEntries(
    Object.entries(meta).map(([id, data]) => [
      id,
      { stars: data.stars, forks: data.forks },
    ]),
  );
}

function setRepoStatDom(
  repoId: string,
  stats: { stars: number; forks: number },
): void {
  document.querySelectorAll(`[data-github-stars="${repoId}"]`).forEach((el) => {
    el.textContent = String(stats.stars);
  });
  document.querySelectorAll(`[data-github-forks="${repoId}"]`).forEach((el) => {
    el.textContent = String(stats.forks);
  });
}

export function applyStatsToDom(stats: RepoStats): void {
  Object.entries(stats).forEach(([repo, data]) => {
    setRepoStatDom(repo, data);
  });
}

function applyLanguagesToDom(
  projectId: string,
  languages: Record<string, number>,
): void {
  document
    .querySelectorAll(githubLanguagesSelector(projectId))
    .forEach((container) => {
      const variant =
        container.getAttribute(GITHUB_LANGUAGES_VARIANT_ATTR) === "tags"
          ? "tags"
          : "bar";
      container.innerHTML = buildProjectLanguagesDomHtml(languages, variant);
    });

  const langKeys = Object.keys(languages).join(" ").toLowerCase();
  document
    .querySelectorAll(`[data-project-tab="${projectId}"]`)
    .forEach((tab) => {
      tab.setAttribute("data-langs", langKeys);
    });
}

function applyProjectMetaToDom(meta: Record<string, ProjectLiveMeta>): void {
  Object.entries(meta).forEach(([id, data]) => {
    setRepoStatDom(id, { stars: data.stars, forks: data.forks });
    if (data.version) {
      document
        .querySelectorAll(`[data-github-version="${id}"]`)
        .forEach((el) => {
          el.textContent = data.version!;
        });
      document
        .querySelectorAll(`[data-project-version-badge="${id}"]`)
        .forEach((el) => {
          el.textContent = data.version!;
        });
    }
    if (data.size) {
      document.querySelectorAll(`[data-github-size="${id}"]`).forEach((el) => {
        el.textContent = data.size!;
      });
    }
    if (data.license) {
      document
        .querySelectorAll(`[data-github-license="${id}"]`)
        .forEach((el) => {
          el.textContent = data.license!;
        });
    }
    if (data.languages && Object.keys(data.languages).length > 0) {
      applyLanguagesToDom(id, data.languages);
    }
    if (data.pushedAt) {
      const locale = document.documentElement.lang || "en";
      document
        .querySelectorAll(`[data-github-pushed="${id}"]`)
        .forEach((el) => {
          el.textContent = formatLastPush(data.pushedAt, locale);
        });
    }
    if (data.openIssues != null) {
      document
        .querySelectorAll(`[data-github-issues="${id}"]`)
        .forEach((el) => {
          el.textContent = String(data.openIssues);
        });
    }
    if (data.openPullRequests != null) {
      document.querySelectorAll(`[data-github-prs="${id}"]`).forEach((el) => {
        el.textContent = String(data.openPullRequests);
      });
    }
  });

  syncHeroProjectsFromMeta(meta);
  syncOrgTechStackFromMeta(meta);
}

function syncHeroProjectsFromMeta(meta: Record<string, ProjectLiveMeta>): void {
  const el = document.getElementById("terminal-data");
  if (!el) return;

  const raw = el.getAttribute("data-project-entries");
  if (!raw) return;

  try {
    const entries = JSON.parse(raw) as HeroProjectEntry[];
    for (const entry of entries) {
      const live = meta[entry.id];
      if (!live) continue;
      entry.stars = live.stars;
      if (live.version) entry.version = live.version;
    }
    el.setAttribute("data-projects", formatHeroProjectsList(entries));
  } catch {}
}

function syncOrgTechStackFromMeta(meta: Record<string, ProjectLiveMeta>): void {
  const repos = Object.values(meta).filter(
    (m) => Object.keys(m.languages || {}).length > 0,
  );
  if (!repos.length) return;

  const stack = aggregateOrgTechStack(
    repos.map((m) => ({ stars: m.stars, languages: m.languages })),
    4,
  ).join(", ");

  document.querySelectorAll('[data-github-org="stack"]').forEach((el) => {
    el.textContent = stack;
  });
}

export function readCachedStats(): RepoStats | null {
  const meta = readJsonCache<Record<string, ProjectLiveMeta>>(
    STORAGE_KEYS.githubProjectsMeta,
    STORAGE_KEYS.githubProjectsMetaTime,
  );
  if (meta) return repoStatsFromMeta(meta);
  return readJsonCache<RepoStats>(
    STORAGE_KEYS.githubReposStats,
    STORAGE_KEYS.githubReposStatsTime,
  );
}

function readCachedReleases(): ReleaseNewsItem[] | null {
  return readJsonCache<ReleaseNewsItem[]>(
    STORAGE_KEYS.githubReleasesNews,
    STORAGE_KEYS.githubReleasesNewsTime,
  );
}

async function fetchGitHubReleases(): Promise<ReleaseNewsItem[] | null> {
  let hasUpdates = false;

  const allReleases = await fetchAllRepoReleases(
    NEWS_REPO_NAMES,
    async (repo) => {
      try {
        const res = await githubLiveFetch(
          `/repos/${GITHUB_ORG}/${repo}/releases?per_page=10`,
        );
        persistGithubRateLimit(res);
        if (!res.ok) return [];
        const data = await res.json();
        if (!Array.isArray(data)) return [];
        hasUpdates = true;
        return parsePublicReleases(repo, data);
      } catch (err) {
        console.error(`Failed to fetch releases for ${repo}:`, err);
        return [];
      }
    },
  );

  if (!hasUpdates) return null;

  const latest = sortAndLimitReleases(allReleases, NEWS_FEED_LIMIT);
  writeJsonCache(
    STORAGE_KEYS.githubReleasesNews,
    STORAGE_KEYS.githubReleasesNewsTime,
    latest,
  );
  return latest;
}

function readCachedProjectsMeta(): Record<string, ProjectLiveMeta> | null {
  return readJsonCache<Record<string, ProjectLiveMeta>>(
    STORAGE_KEYS.githubProjectsMeta,
    STORAGE_KEYS.githubProjectsMetaTime,
  );
}

async function liveJsonGet<T>(path: string): Promise<T | null> {
  const res = await githubLiveFetch(path);
  persistGithubRateLimit(res);
  if (!res.ok) return null;
  return (await res.json()) as T;
}

async function liveApiRequest(path: string): Promise<Response> {
  const res = await githubLiveFetch(path);
  persistGithubRateLimit(res);
  return res;
}

async function fetchGitHubProjectsLive(): Promise<Record<
  string,
  ProjectLiveMeta
> | null> {
  const meta: Record<string, ProjectLiveMeta> = {};
  let hasUpdates = false;

  for (const id of PROJECT_IDS) {
    const name = repoApiName(id);
    try {
      const bundle = await fetchRepoMetaBundle(
        name,
        liveJsonGet,
        liveApiRequest,
      );
      if (!bundle) continue;

      let version: string | null = null;
      const release = await liveJsonGet<{ tag_name?: string }>(
        `/repos/${GITHUB_ORG}/${name}/releases/latest`,
      );
      version = release?.tag_name || null;

      meta[id] = buildRepoLiveMeta(
        bundle.repo,
        bundle.langBytes,
        bundle.openCounts,
        version,
      );
      hasUpdates = true;
    } catch (err) {
      console.error(`Failed to fetch project meta for ${id}:`, err);
    }
  }

  if (hasUpdates) {
    writeJsonCache(
      STORAGE_KEYS.githubProjectsMeta,
      STORAGE_KEYS.githubProjectsMetaTime,
      meta,
    );
    writeJsonCache(
      STORAGE_KEYS.githubReposStats,
      STORAGE_KEYS.githubReposStatsTime,
      repoStatsFromMeta(meta),
    );
    applyProjectMetaToDom(meta);
    return meta;
  }

  return readCachedProjectsMeta();
}

export async function fetchProjectReleasesLive(
  projectId: string,
  limit = PROJECT_DETAIL_RELEASE_COUNT,
): Promise<ReleaseNewsItem[] | null> {
  try {
    const res = await githubLiveFetch(
      `/repos/${GITHUB_ORG}/${repoApiName(projectId)}/releases?per_page=${PROJECT_DETAIL_RELEASES_PER_PAGE}`,
    );
    persistGithubRateLimit(res);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    return sortAndLimitReleases(
      parsePublicReleases(repoApiName(projectId), data),
      limit,
    );
  } catch (err) {
    console.error(`Failed to fetch releases for ${projectId}:`, err);
    return null;
  }
}

export function getCachedReleaseForProject(
  projectId: string,
): ReleaseNewsItem | undefined {
  const releases = readCachedReleases();
  if (!releases) return undefined;
  const repoName = repoApiName(projectId);
  return releases.find((r) => r.repo.toLowerCase() === repoName.toLowerCase());
}

function readCachedOrg(allowStale = false): GitHubOrgLive | null {
  return readJsonCache<GitHubOrgLive>(
    STORAGE_KEYS.githubOrgProfile,
    STORAGE_KEYS.githubOrgProfileTime,
    allowStale,
  );
}

function storeCachedOrg(data: GitHubOrgLive): void {
  writeJsonCache(
    STORAGE_KEYS.githubOrgProfile,
    STORAGE_KEYS.githubOrgProfileTime,
    data,
  );
}

function applyGitHubOrgToDom(meta: GitHubOrgLive): void {
  const set = (field: keyof GitHubOrgLive, value: string | number) => {
    document.querySelectorAll(`[data-github-org="${field}"]`).forEach((el) => {
      el.textContent = String(value);
    });
  };

  set("organization", meta.organization);
  set("description", meta.description);
  set("type", meta.type);
  set("location", meta.location);
  set("website", meta.website);
  set("repository", meta.repository);
  set("email", meta.email);
  set("followers", meta.followers);
  set("public_repos", meta.public_repos);
  set("established", meta.established);
  set("default_branch", meta.default_branch);
  set("host", meta.host);

  const repoCountEl = document.getElementById("projects-repo-count");
  if (repoCountEl && meta.public_repos > 0) {
    const label = repoCountEl.getAttribute("data-repo-count-label") || "{n}";
    repoCountEl.textContent = label.replace("{n}", String(meta.public_repos));
  }
}

async function fetchGitHubOrgLive(): Promise<GitHubOrgLive | null> {
  try {
    const profile = await fetchOrgProfileRaw((path) =>
      githubLiveFetch(path).then((res) => {
        persistGithubRateLimit(res);
        return res;
      }),
    );

    if (!profile) return readCachedOrg(true);

    const meta = mapOrgProfile(profile, {
      translatedType: clientT("about", "orgType"),
      translatedLocation: clientT("about", "orgLocation"),
    });

    storeCachedOrg(meta);
    applyGitHubOrgToDom(meta);
    return meta;
  } catch (err) {
    console.error("Failed to fetch GitHub org profile:", err);
    return readCachedOrg(true);
  }
}

async function refreshGitHubNews(): Promise<ReleaseNewsItem[] | null> {
  const releases = await fetchGitHubReleases();
  if (releases?.length) {
    document.dispatchEvent(
      new CustomEvent(GITHUB_NEWS_UPDATED_EVENT, { detail: releases }),
    );
  }
  return releases;
}

export function refreshGitHubLiveData(): Promise<void> {
  if (refreshInFlight) return refreshInFlight;

  migrateClientCache();

  refreshInFlight = (async () => {
    const tasks: Promise<unknown>[] = [
      fetchGitHubProjectsLive(),
      fetchGitHubOrgLive(),
    ];
    if (document.getElementById(DOM_IDS.newsCommitsList)) {
      tasks.push(refreshGitHubNews());
    }
    await Promise.all(tasks);
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}
