import { loadEnv } from "vite";

let loaded = false;

export function loadGitHubEnv(): void {
  if (loaded || typeof process === "undefined") return;
  loaded = true;

  const mode =
    process.env.NODE_ENV === "production" ? "production" : "development";
  const root = process.cwd();
  const env = loadEnv(mode, root, "");

  if (!process.env.GITHUB_TOKEN && env.GITHUB_TOKEN) {
    process.env.GITHUB_TOKEN = env.GITHUB_TOKEN;
  }
  if (!process.env.GITHUB_TOKEN && env.GH_TOKEN) {
    process.env.GITHUB_TOKEN = env.GH_TOKEN;
  }
}

export function getGitHubToken(): string | undefined {
  loadGitHubEnv();
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
}

export function hasGitHubToken(): boolean {
  return Boolean(getGitHubToken());
}
