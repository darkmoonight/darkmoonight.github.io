// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { githubBuildCache } from './src/integrations/github-build-cache.ts';

/** Production URL: https://darkmoonight.github.io/ (repo darkmoonight/darkmoonight.github.io). */
export const PAGES_SITE = 'https://darkmoonight.github.io';

const [ghOwner, ghRepo] = (process.env.GITHUB_REPOSITORY ?? '').split('/');
const isUserOrgPagesRepo = ghRepo === `${ghOwner}.github.io`;

const siteBase =
  process.env.ASTRO_BASE ??
  (ghRepo && !isUserOrgPagesRepo ? `/${ghRepo}/` : '/');
const siteUrl =
  process.env.ASTRO_SITE ??
  (ghOwner ? `https://${ghOwner}.github.io` : PAGES_SITE);

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  base: siteBase,
  integrations: [githubBuildCache()],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ru'],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
