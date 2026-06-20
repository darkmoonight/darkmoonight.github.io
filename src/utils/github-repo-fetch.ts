import { GITHUB_ORG } from "../constants/github";
import {
  fetchRepoOpenCountsViaSearch,
  type RepoOpenCounts,
} from "./github-issue-counts";
import type { GitHubRepoPayload } from "./github-repo-meta";
import type { ReleaseNewsItem } from "./github-releases";

/** Shared repo metadata and releases fetch loops for build-time and client live refresh. */

export type RepoApiRequest = (path: string) => Promise<Response>;

export type RepoJsonGet = <T>(path: string) => Promise<T | null>;

export interface RepoMetaBundle {
  repo: GitHubRepoPayload;
  langBytes: Record<string, number> | null;
  openCounts: RepoOpenCounts;
}

export async function fetchRepoMetaBundle(
  repoName: string,
  getJson: RepoJsonGet,
  apiRequest: RepoApiRequest,
): Promise<RepoMetaBundle | null> {
  const [repo, langBytes] = await Promise.all([
    getJson<GitHubRepoPayload>(`/repos/${GITHUB_ORG}/${repoName}`),
    getJson<Record<string, number>>(
      `/repos/${GITHUB_ORG}/${repoName}/languages`,
    ),
  ]);
  if (!repo) return null;

  const openCounts = await fetchRepoOpenCountsViaSearch(apiRequest, repoName, {
    combinedOpenCount: repo.open_issues_count ?? 0,
  });

  return { repo, langBytes, openCounts };
}

export async function fetchAllRepoReleases(
  repoNames: readonly string[],
  loadReleases: (repoName: string) => Promise<ReleaseNewsItem[]>,
): Promise<ReleaseNewsItem[]> {
  const allReleases: ReleaseNewsItem[] = [];
  for (const repoName of repoNames) {
    allReleases.push(...(await loadReleases(repoName)));
  }
  return allReleases;
}
