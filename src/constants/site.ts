import { GITHUB_ORG } from "./github";

export { GITHUB_ORG };

export const SITE_HOST = `${GITHUB_ORG}.github.io`;
export const SITE_URL = `https://${SITE_HOST}`;
export const GITHUB_PROFILE_URL = `https://github.com/${GITHUB_ORG}`;
export const GITHUB_PROFILE_HOST = `github.com/${GITHUB_ORG}`;
export const SPONSORS_URL = `https://github.com/sponsors/${GITHUB_ORG}`;
export const CONTACT_EMAIL = "darkmoonight2022@gmail.com";
export const DEFAULT_BRANCH = "main";
export const WEB3FORMS_SUBMIT_URL = "https://api.web3forms.com/submit";

export const SOCIAL_LINKS = {
  telegram: "https://t.me/+bXvLJdzO2pZiZGVi",
  discord: "https://discord.gg/JMMa9aHh8f",
  github: GITHUB_PROFILE_URL,
  email: `mailto:${CONTACT_EMAIL}`,
} as const;

export function githubBranchRef(branch = DEFAULT_BRANCH): string {
  return `${GITHUB_ORG}:${branch}`;
}
