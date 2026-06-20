import { GITHUB_ORG } from "../constants/github";

export interface RepoOpenCounts {
  open_issues: number;
  open_pull_requests: number;
}

function repoOpenIssuesSearchQuery(repoName: string, org = GITHUB_ORG): string {
  return `repo:${org}/${repoName} is:issue is:open`;
}

function repoOpenPullRequestsSearchQuery(
  repoName: string,
  org = GITHUB_ORG,
): string {
  return `repo:${org}/${repoName} is:pr is:open`;
}

async function readSearchTotalCount(
  request: (path: string) => Promise<Response>,
  query: string,
): Promise<number | null> {
  const res = await request(
    `/search/issues?q=${encodeURIComponent(query)}&per_page=1`,
  );
  if (!res.ok) return null;

  try {
    const data = (await res.json()) as { total_count?: number };
    return typeof data.total_count === "number" ? data.total_count : null;
  } catch {
    return null;
  }
}

/** Issues-only and open PR counts (matches GitHub UI tabs, not open_issues_count). */
export async function fetchRepoOpenCountsViaSearch(
  request: (path: string) => Promise<Response>,
  repoName: string,
  options: { org?: string; combinedOpenCount?: number } = {},
): Promise<RepoOpenCounts> {
  const org = options.org ?? GITHUB_ORG;
  const [issues, prs] = await Promise.all([
    readSearchTotalCount(request, repoOpenIssuesSearchQuery(repoName, org)),
    readSearchTotalCount(
      request,
      repoOpenPullRequestsSearchQuery(repoName, org),
    ),
  ]);

  if (issues != null && prs != null) {
    return { open_issues: issues, open_pull_requests: prs };
  }

  if (prs != null && options.combinedOpenCount != null) {
    return {
      open_issues: Math.max(0, options.combinedOpenCount - prs),
      open_pull_requests: prs,
    };
  }

  if (issues != null) {
    return { open_issues: issues, open_pull_requests: 0 };
  }

  return {
    open_issues: options.combinedOpenCount ?? 0,
    open_pull_requests: 0,
  };
}
