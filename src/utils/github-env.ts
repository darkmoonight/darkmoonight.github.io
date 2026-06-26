import { loadEnv } from "vite";

/** Env var for authenticated REST API during build (see .env.example). */
export const REPO_API_TOKEN_ENV = "REPO_API_TOKEN";

const LEGACY_TOKEN_ENV = ["GITHUB_TOKEN", "GH_TOKEN"] as const;

let loaded = false;

function resolveTokenFromRecord(
  record: NodeJS.ProcessEnv | Record<string, string | undefined>,
): string | undefined {
  const primary = record[REPO_API_TOKEN_ENV];
  if (primary) return primary;
  for (const key of LEGACY_TOKEN_ENV) {
    const value = record[key];
    if (value) return value;
  }
  return undefined;
}

export function loadGitHubEnv(): void {
  if (loaded || typeof process === "undefined") return;
  loaded = true;

  const mode =
    process.env.NODE_ENV === "production" ? "production" : "development";
  const root = process.cwd();
  const env = loadEnv(mode, root, "");

  const fromFile = resolveTokenFromRecord(env);
  if (fromFile && !process.env[REPO_API_TOKEN_ENV]) {
    process.env[REPO_API_TOKEN_ENV] = fromFile;
  }
}

export function getGitHubToken(): string | undefined {
  loadGitHubEnv();
  return resolveTokenFromRecord(process.env);
}

export function hasGitHubToken(): boolean {
  return Boolean(getGitHubToken());
}
