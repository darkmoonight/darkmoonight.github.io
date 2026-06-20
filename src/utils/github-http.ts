import { GITHUB_API_BASE } from "../constants/github";
import { STORAGE_KEYS } from "../constants/storage";

/** Build a full GitHub REST URL from a path like `/repos/org/name`. */
export function buildGithubApiUrl(path: string): string {
  return `${GITHUB_API_BASE}${path}`;
}

/** Shared GitHub API headers; server passes a token, browser omits auth. */
export function githubApiHeaders(options?: {
  token?: string | null;
  userAgent?: string;
}): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (options?.userAgent) headers["User-Agent"] = options.userAgent;
  if (options?.token) headers.Authorization = `Bearer ${options.token}`;
  return headers;
}

/** Persist anonymous rate-limit quota for the sys-monitor easter egg. */
export function persistGithubRateLimit(response: Response): void {
  const remaining = response.headers.get("X-RateLimit-Remaining");
  const reset = response.headers.get("X-RateLimit-Reset");
  try {
    if (remaining != null) {
      localStorage.setItem(STORAGE_KEYS.githubApiRemaining, remaining);
    }
    if (reset != null) {
      localStorage.setItem(STORAGE_KEYS.githubApiReset, reset);
    }
  } catch {}
}
