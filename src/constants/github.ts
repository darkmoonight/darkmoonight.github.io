export const GITHUB_ORG = "darkmoonight";

export const PROJECT_IDS = ["zest", "rain", "ikms"] as const;

export type ProjectId = (typeof PROJECT_IDS)[number];

export const GITHUB_API_BASE = "https://api.github.com";

const REPO_DISPLAY_NAMES: Record<ProjectId, string> = {
  zest: "Zest",
  rain: "Rain",
  ikms: "IKMS",
};

export function repoApiName(id: string): string {
  return REPO_DISPLAY_NAMES[id as ProjectId] ?? id;
}

export const NEWS_REPO_NAMES = PROJECT_IDS.map((id) => REPO_DISPLAY_NAMES[id]);

const REPO_NAME_TO_PROJECT_ID: Record<string, ProjectId> = {
  zest: "zest",
  rain: "rain",
  ikms: "ikms",
};

export function projectIdForRepoName(repoName: string): ProjectId | null {
  return REPO_NAME_TO_PROJECT_ID[repoName.toLowerCase()] ?? null;
}

export const CLIENT_CACHE_TTL_MS = 10 * 60 * 1000;

export const CLIENT_CACHE_VERSION = "6";
