import type { AstroIntegration } from "astro";

import { syncGitHubCache } from "../utils/github-snapshot";

function shouldForceGitHubSync(): boolean {
  return process.env.FORCE_GITHUB_SYNC === "1" || process.env.CI === "true";
}

export function githubBuildCache(): AstroIntegration {
  return {
    name: "github-build-cache",
    hooks: {
      "astro:build:start": async () => {
        await syncGitHubCache(shouldForceGitHubSync());
      },
      "astro:server:start": async () => {
        await syncGitHubCache(shouldForceGitHubSync());
      },
    },
  };
}
