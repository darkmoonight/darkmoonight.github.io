import { formatRepoSize } from "./github-format";
import { computeLanguagePercents } from "./github-languages";
import type { RepoOpenCounts } from "./github-issue-counts";

export interface GitHubRepoPayload {
  name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  license: { spdx_id: string | null } | null;
  language: string | null;
  size: number;
  default_branch: string;
  pushed_at: string;
  open_issues_count: number;
}

export interface GitHubRepoSnapshot {
  stars: number;
  forks: number;
  license: string;
  language: string | null;
  sizeLabel: string;
  default_branch: string;
  html_url: string;
  pushed_at: string;
  open_issues: number;
  open_pull_requests: number;
  latestTag: string | null;
  languages: Record<string, number>;
}

export interface ProjectLiveMeta {
  stars: number;
  forks: number;
  version: string | null;
  size: string | null;
  license: string | null;
  languages: Record<string, number>;
  pushedAt: string | null;
  openIssues: number | null;
  openPullRequests: number | null;
}

/** Normalize a repo API payload into the build-time snapshot shape. */
export function buildRepoSnapshotMeta(
  repo: GitHubRepoPayload,
  langBytes: Record<string, number> | null,
  openCounts: RepoOpenCounts,
  latestTag: string | null = null,
): GitHubRepoSnapshot {
  return {
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    license: repo.license?.spdx_id || "MIT",
    language: repo.language,
    sizeLabel: formatRepoSize(repo.size),
    default_branch: repo.default_branch,
    html_url: repo.html_url,
    pushed_at: repo.pushed_at,
    open_issues: openCounts.open_issues,
    open_pull_requests: openCounts.open_pull_requests,
    latestTag,
    languages: langBytes ? computeLanguagePercents(langBytes) : {},
  };
}

/** Normalize a repo API payload into the client-side live meta shape. */
export function buildRepoLiveMeta(
  repo: GitHubRepoPayload,
  langBytes: Record<string, number> | null,
  openCounts: RepoOpenCounts,
  latestTag: string | null,
): ProjectLiveMeta {
  const snapshot = buildRepoSnapshotMeta(
    repo,
    langBytes,
    openCounts,
    latestTag,
  );
  return {
    stars: snapshot.stars,
    forks: snapshot.forks,
    version: latestTag,
    size: snapshot.sizeLabel,
    license: snapshot.license,
    languages: snapshot.languages,
    pushedAt: repo.pushed_at || null,
    openIssues: openCounts.open_issues,
    openPullRequests: openCounts.open_pull_requests,
  };
}
