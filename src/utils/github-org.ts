import { GITHUB_ORG } from "../constants/github";
import {
  CONTACT_EMAIL,
  DEFAULT_BRANCH,
  GITHUB_PROFILE_URL,
  SITE_HOST,
} from "../constants/site";
import { blogHost, establishedYear, normalizeBlogUrl } from "./github-format";

export interface GitHubOrgProfile {
  login: string;
  name: string | null;
  description: string | null;
  bio?: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  html_url: string;
  avatar_url: string;
  public_repos: number;
  followers: number;
  created_at: string;
  twitter_username: string | null;
}

export interface MappedOrgProfile {
  organization: string;
  description: string;
  location: string;
  type: string;
  website: string;
  repository: string;
  email: string;
  followers: number;
  public_repos: number;
  established: number;
  default_branch: string;
  host: string;
  created_at: string;
}

export type GithubFetchFn = (
  path: string,
  init?: RequestInit,
) => Promise<Response>;

/** Try `/orgs/{org}` first, then fall back to `/users/{org}` for personal accounts. */
export async function fetchOrgProfileRaw(
  fetchFn: GithubFetchFn,
): Promise<GitHubOrgProfile | null> {
  const orgRes = await fetchFn(`/orgs/${GITHUB_ORG}`);
  if (orgRes.ok) {
    const org = (await orgRes.json()) as GitHubOrgProfile;
    if (org?.login) return org;
  }

  const userRes = await fetchFn(`/users/${GITHUB_ORG}`);
  if (userRes.ok) {
    const user = (await userRes.json()) as GitHubOrgProfile;
    if (user?.login) return user;
  }

  return null;
}

export function mapOrgProfile(
  profile: GitHubOrgProfile,
  options: {
    translatedType: string;
    translatedLocation: string;
    defaultBranch?: string;
  },
): MappedOrgProfile {
  return {
    organization: profile.name || profile.login || "DARK NIGHT",
    description: profile.description || profile.bio || options.translatedType,
    type: options.translatedType,
    location: profile.location || options.translatedLocation,
    website: normalizeBlogUrl(profile.blog, `https://${SITE_HOST}`),
    repository: profile.html_url || GITHUB_PROFILE_URL,
    email: profile.email || CONTACT_EMAIL,
    followers: profile.followers,
    public_repos: profile.public_repos,
    established: establishedYear(profile.created_at),
    default_branch: options.defaultBranch ?? DEFAULT_BRANCH,
    host: blogHost(profile.blog, SITE_HOST),
    created_at: profile.created_at,
  };
}
