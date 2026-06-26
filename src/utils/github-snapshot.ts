import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  CONTACT_EMAIL,
  SITE_HOST,
  GITHUB_PROFILE_URL,
} from "../constants/site";
import projectsData from "../data/projects.json";
import {
  applyLatestTagsToRepos,
  fetchAllProjectRepos,
  fetchGitHubReleasesBundle,
  fetchOrgProfile,
  resetGitHubApiSession,
  type GitHubOrgProfile,
  type GitHubRepoSnapshot,
} from "./github-api";
import { mapOrgProfile } from "./github-org";
import { hasGitHubToken, loadGitHubEnv } from "./github-env";
import { PROJECT_IDS, repoApiName, type ProjectId } from "../constants/github";
import { aggregateOrgTechStack } from "./github-languages";
import {
  PROJECT_RELEASES_LIMIT,
  type ReleaseNewsItem,
} from "./github-releases";
import { tLang } from "./i18n";

const CACHE_PATH = join(process.cwd(), ".cache/github-snapshot.json");
const BUILD_CACHE_TTL_MS = 60 * 60 * 1000;

/** Build-time cache written by the GitHub integration; client refresh updates DOM live. */
export interface GitHubSnapshot {
  fetchedAt: string;
  profile: GitHubOrgProfile | null;
  repos: Partial<Record<ProjectId, GitHubRepoSnapshot>>;
  releases: ReleaseNewsItem[];
  projectReleases: Partial<Record<ProjectId, ReleaseNewsItem[]>>;
}

type ProjectRow = (typeof projectsData)[number];

function fallbackProfile(): GitHubOrgProfile {
  return {
    login: "darkmoonight",
    name: "DARK NIGHT",
    description: tLang("en", "about.orgFallbackDescription"),
    blog: `https://${SITE_HOST}/`,
    location: "Russian Federation",
    email: "darkmoonight2022@gmail.com",
    html_url: GITHUB_PROFILE_URL,
    avatar_url: "",
    public_repos: 6,
    followers: 99,
    created_at: "2021-11-19T00:00:00Z",
    twitter_username: null,
  };
}

function fallbackRepos(): GitHubSnapshot["repos"] {
  const repos: GitHubSnapshot["repos"] = {};
  for (const project of projectsData) {
    const id = project.id as ProjectId;
    if (!PROJECT_IDS.includes(id)) continue;
    repos[id] = {
      stars: project.stars,
      forks: project.forks,
      license: project.license,
      language: "Dart",
      sizeLabel: project.size,
      default_branch: "main",
      html_url: project.github,
      pushed_at: new Date().toISOString(),
      open_issues: 0,
      open_pull_requests: 0,
      latestTag: project.version,
      languages: { ...project.languages },
    };
  }
  return repos;
}

function parseCacheFile(raw: string): GitHubSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as GitHubSnapshot;
    if (!Array.isArray(parsed.releases)) return null;
    if (!parsed.projectReleases) parsed.projectReleases = {};
    return parsed;
  } catch {
    return null;
  }
}

function readCache(ignoreTtl = false): GitHubSnapshot | null {
  if (!existsSync(CACHE_PATH)) return null;
  try {
    const parsed = parseCacheFile(readFileSync(CACHE_PATH, "utf8"));
    if (!parsed) return null;
    if (ignoreTtl) return parsed;
    const age = Date.now() - new Date(parsed.fetchedAt).getTime();
    if (age > BUILD_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function apiFetchSucceeded(
  profile: GitHubOrgProfile | null,
  repos: Partial<Record<ProjectId, GitHubRepoSnapshot>>,
  releases: ReleaseNewsItem[],
): boolean {
  return (
    Boolean(profile) || Object.keys(repos).length > 0 || releases.length > 0
  );
}

function writeCache(snapshot: GitHubSnapshot): void {
  mkdirSync(dirname(CACHE_PATH), { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(snapshot, null, 2));
}

export async function buildGitHubSnapshot(): Promise<GitHubSnapshot> {
  loadGitHubEnv();
  resetGitHubApiSession();

  if (!hasGitHubToken()) {
    console.warn(
      "[github-api] REPO_API_TOKEN is not set — using anonymous API (easy to hit HTTP 403). Copy .env.example → .env",
    );
  }

  const profile = await fetchOrgProfile();
  const {
    news: releases,
    latestTags,
    projectReleases,
  } = await fetchGitHubReleasesBundle();
  const repos = await fetchAllProjectRepos();
  applyLatestTagsToRepos(repos, latestTags);

  if (!apiFetchSucceeded(profile, repos, releases)) {
    const stale = readCache(true);
    if (stale) {
      console.warn(
        "[github-api] All requests failed — keeping existing .cache/github-snapshot.json",
      );
      return stale;
    }
  }

  const snapshot: GitHubSnapshot = {
    fetchedAt: new Date().toISOString(),
    profile: profile ?? fallbackProfile(),
    repos: Object.keys(repos).length ? repos : fallbackRepos(),
    releases,
    projectReleases,
  };

  writeCache(snapshot);
  return snapshot;
}

export async function syncGitHubCache(force = false): Promise<GitHubSnapshot> {
  loadGitHubEnv();
  if (!force) {
    const cached = readCache();
    if (cached) return cached;
  }
  return buildGitHubSnapshot();
}

export function loadGithubSnapshot(): GitHubSnapshot {
  const cached = readCache();
  if (cached) return cached;
  const stale = readCache(true);
  if (stale) return stale;
  return {
    fetchedAt: new Date(0).toISOString(),
    profile: fallbackProfile(),
    repos: fallbackRepos(),
    releases: [],
    projectReleases: {},
  };
}

export function getNewsReleases(
  snapshot: GitHubSnapshot = loadGithubSnapshot(),
): ReleaseNewsItem[] {
  return snapshot.releases ?? [];
}

export function getProjectReleases(
  projectId: ProjectId,
  snapshot: GitHubSnapshot = loadGithubSnapshot(),
  limit = PROJECT_RELEASES_LIMIT,
): ReleaseNewsItem[] {
  const repoName = repoApiName(projectId);
  const perProject = snapshot.projectReleases?.[projectId];
  if (perProject?.length) return perProject.slice(0, limit);
  return getNewsReleases(snapshot)
    .filter((r) => r.repo === repoName)
    .slice(0, limit);
}

export function getOrgTechStack(
  snapshot: GitHubSnapshot = loadGithubSnapshot(),
  limit = 4,
): string[] {
  const repos = PROJECT_IDS.map((id) => snapshot.repos[id]).filter(
    Boolean,
  ) as Array<{
    stars: number;
    languages: Record<string, number>;
  }>;
  return aggregateOrgTechStack(
    repos.map((r) => ({ stars: r.stars, languages: r.languages || {} })),
    limit,
  );
}

export function enrichProject(
  project: ProjectRow,
  snapshot: GitHubSnapshot,
): ProjectRow {
  const repo = snapshot.repos[project.id as ProjectId];
  if (!repo) return project;
  return {
    ...project,
    stars: repo.stars,
    forks: repo.forks,
    license: repo.license,
    size: repo.sizeLabel,
    version: repo.latestTag || project.version,
    github: repo.html_url,
    languages:
      repo.languages && Object.keys(repo.languages).length > 0
        ? (repo.languages as ProjectRow["languages"])
        : project.languages,
  };
}

export function enrichProjects(
  projects: ProjectRow[],
  snapshot: GitHubSnapshot = loadGithubSnapshot(),
): ProjectRow[] {
  return projects.map((p) => enrichProject(p, snapshot));
}

export interface AboutGithubMeta {
  organization: string;
  established: number;
  location: string;
  type: string;
  description: string;
  website: string;
  repository: string;
  email: string | null;
  followers: number;
  public_repos: number;
  created_at: string;
  default_branch: string;
  host: string;
  primaryStack: string[];
}

export function aboutMetaFromSnapshot(
  snapshot: GitHubSnapshot,
  translatedType: string,
  translatedLocation: string,
): AboutGithubMeta {
  const profile = snapshot.profile ?? fallbackProfile();
  const primaryRepo = snapshot.repos.zest;
  const mapped = mapOrgProfile(profile, {
    translatedType,
    translatedLocation,
    defaultBranch: primaryRepo?.default_branch || "main",
  });

  return {
    ...mapped,
    email: profile.email || CONTACT_EMAIL,
    primaryStack: getOrgTechStack(snapshot),
  };
}
