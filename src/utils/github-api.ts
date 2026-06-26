import {
  GITHUB_ORG,
  NEWS_REPO_NAMES,
  PROJECT_IDS,
  projectIdForRepoName,
  repoApiName,
  type ProjectId,
} from "../constants/github";
import { getGitHubToken, hasGitHubToken, loadGitHubEnv } from "./github-env";
import { buildGithubApiUrl, githubApiHeaders } from "./github-http";
import { fetchOrgProfileRaw, type GitHubOrgProfile } from "./github-org";
import {
  buildRepoSnapshotMeta,
  type GitHubRepoSnapshot,
} from "./github-repo-meta";
import {
  NEWS_FEED_LIMIT,
  PROJECT_RELEASES_LIMIT,
  parsePublicReleases,
  sortAndLimitReleases,
  type ReleaseNewsItem,
} from "./github-releases";
import { fetchAllRepoReleases, fetchRepoMetaBundle } from "./github-repo-fetch";

/** Authenticated GitHub REST client for build-time snapshot sync. */

let rateLimitExhausted = false;
let rateLimitHintLogged = false;

export type { GitHubOrgProfile } from "./github-org";
export type { GitHubRepoSnapshot } from "./github-repo-meta";

function serverFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(buildGithubApiUrl(path), {
    ...init,
    headers: {
      ...githubApiHeaders({
        userAgent: "darkmoonight-site-build",
        token: getGitHubToken(),
      }),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
}

function logRateLimitHint(res: Response, path: string): void {
  if (rateLimitHintLogged) return;
  rateLimitHintLogged = true;

  const remaining = res.headers.get("x-ratelimit-remaining");
  const reset = res.headers.get("x-ratelimit-reset");
  const resetAt = reset
    ? new Date(Number(reset) * 1000).toISOString()
    : "unknown";

  if (!hasGitHubToken()) {
    console.warn(
      `[github-api] HTTP ${res.status} on ${path} — unauthenticated limit (~60 req/h per IP). ` +
        `Add REPO_API_TOKEN to .env (see .env.example). Limit resets about ${resetAt}.`,
    );
  } else {
    console.warn(
      `[github-api] HTTP ${res.status} on ${path} — check token scopes or quota. Resets about ${resetAt}.`,
    );
  }
  if (remaining !== null) {
    console.warn(`[github-api] X-RateLimit-Remaining: ${remaining}`);
  }
}

export async function githubApiGet<T>(path: string): Promise<T | null> {
  if (rateLimitExhausted) return null;

  loadGitHubEnv();

  try {
    const res = await serverFetch(path);
    if (!res.ok) {
      if (res.status === 403 || res.status === 429) {
        const remaining = res.headers.get("x-ratelimit-remaining");
        if (remaining === "0" || !hasGitHubToken()) {
          rateLimitExhausted = true;
        }
        logRateLimitHint(res, path);
      } else {
        console.warn(`[github-api] ${path} → HTTP ${res.status}`);
      }
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[github-api] ${path}`, err);
    return null;
  }
}

export function resetGitHubApiSession(): void {
  rateLimitExhausted = false;
  rateLimitHintLogged = false;
}

export async function fetchOrgProfile(): Promise<GitHubOrgProfile | null> {
  return fetchOrgProfileRaw(serverFetch);
}

export async function fetchProjectRepo(
  id: ProjectId,
): Promise<GitHubRepoSnapshot | null> {
  const name = repoApiName(id);
  const bundle = await fetchRepoMetaBundle(name, githubApiGet, serverFetch);
  if (!bundle) return null;
  return buildRepoSnapshotMeta(
    bundle.repo,
    bundle.langBytes,
    bundle.openCounts,
  );
}

export async function fetchLatestReleaseTag(
  repoName: string,
): Promise<string | null> {
  const release = await githubApiGet<{ tag_name?: string }>(
    `/repos/${GITHUB_ORG}/${repoName}/releases/latest`,
  );
  if (release?.tag_name) return release.tag_name;
  const recent = await fetchRepoReleases(repoName, 1);
  return recent[0]?.tag ?? null;
}

export interface GitHubReleasesBundle {
  news: ReleaseNewsItem[];
  latestTags: Partial<Record<ProjectId, string>>;
  projectReleases: Partial<Record<ProjectId, ReleaseNewsItem[]>>;
}

export async function fetchGitHubReleasesBundle(
  newsLimit = NEWS_FEED_LIMIT,
): Promise<GitHubReleasesBundle> {
  const latestTags: Partial<Record<ProjectId, string>> = {};
  const projectReleases: Partial<Record<ProjectId, ReleaseNewsItem[]>> = {};

  for (const repoName of NEWS_REPO_NAMES) {
    const id = projectIdForRepoName(repoName);
    if (id) {
      const tag = await fetchLatestReleaseTag(repoName);
      if (tag) latestTags[id] = tag;
    }
  }

  const allReleases = await fetchAllRepoReleases(NEWS_REPO_NAMES, (repoName) =>
    fetchRepoReleases(repoName, 10),
  );

  for (const repoName of NEWS_REPO_NAMES) {
    const id = projectIdForRepoName(repoName);
    if (id) {
      projectReleases[id] = sortAndLimitReleases(
        allReleases.filter((release) => release.repo === repoName),
        PROJECT_RELEASES_LIMIT,
      );
    }
  }

  return {
    news: sortAndLimitReleases(allReleases, newsLimit),
    latestTags,
    projectReleases,
  };
}

export function applyLatestTagsToRepos(
  repos: Partial<Record<ProjectId, GitHubRepoSnapshot>>,
  latestTags: Partial<Record<ProjectId, string>>,
): void {
  for (const id of PROJECT_IDS) {
    const tag = latestTags[id];
    if (tag && repos[id]) repos[id].latestTag = tag;
  }
}

export async function fetchAllProjectRepos(): Promise<
  Partial<Record<ProjectId, GitHubRepoSnapshot>>
> {
  const repos: Partial<Record<ProjectId, GitHubRepoSnapshot>> = {};
  for (const id of PROJECT_IDS) {
    const snapshot = await fetchProjectRepo(id);
    if (snapshot) repos[id] = snapshot;
  }
  return repos;
}

export async function fetchRepoReleases(
  repoName: string,
  perPage = 8,
): Promise<ReleaseNewsItem[]> {
  const data = await githubApiGet<Record<string, unknown>[]>(
    `/repos/${GITHUB_ORG}/${repoName}/releases?per_page=${perPage}`,
  );
  if (!Array.isArray(data)) return [];
  return parsePublicReleases(repoName, data);
}
