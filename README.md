# DARK NIGHT — team website

Static, bilingual portfolio site for the **DARK NIGHT** team. The UI mimics an IDE/terminal workspace. Built with [Astro 6](https://astro.build) and [Tailwind CSS 4](https://tailwindcss.com).

## Features

- **Localized routes** — English (`/en/`) and Russian (`/ru/`)
- **Home sections** — hero terminal, about, projects explorer, GitHub news feed, contact form (donations UI is dormant)
- **Project pages** — static detail routes with optional phone mockups and live GitHub stats
- **GitHub integration** — build-time snapshot cache plus client-side refresh for stars, languages, and releases
- **Theme & UX** — dark/light mode, command palette (`Ctrl+P`), mobile navigation, accessibility-minded overlays

## Requirements

- **Node.js** ≥ 22.12.0
- **npm** (or compatible package manager)

## Quick start

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # output → dist/
npm run preview  # serve the production build
```

## Scripts

| Script | Description |
|--------|-------------|
| `dev` | Development server |
| `build` | Production build |
| `build:pages` | Production build with GitHub Pages `site` / `base` |
| `preview` | Preview `dist/` |
| `typecheck` | `astro check` + `tsc --noEmit` |
| `validate:i18n` | Scan for missing/orphan translation keys |
| `lint` / `lint:fix` | ESLint (`src/`) |
| `format` / `format:check` | Prettier (`src/`) |
| `ci` | typecheck → validate:i18n → lint → format check |

Pre-commit hooks (Husky) run `npm run ci`.

## Environment variables

Copy `.env.example` to `.env`:

| Variable | Required | Purpose |
|----------|----------|---------|
| `GITHUB_TOKEN` | Recommended | Higher GitHub API rate limits during build and optional live sync |
| `PUBLIC_WEB3FORMS_ACCESS_KEY` | Optional | [Web3Forms](https://web3forms.com) access key for the contact form; without it, submit is mocked in dev |
| `FORCE_GITHUB_SYNC` | Optional | Set to `1` to ignore `.cache/github-snapshot.json` TTL and refetch from the API (local builds). CI sets `CI=true` and the deploy workflow sets `FORCE_GITHUB_SYNC=1` automatically |

## Internationalization

| Locale | Example URL |
|--------|-------------|
| `en` | `/en/`, `/en/projects/zest` |
| `ru` | `/ru/`, `/ru/projects/zest` |

- `/` redirects to `/en/`
- Legacy `/projects/:id` redirects to `/en/projects/:id`
- UI strings live in `src/data/translations.json`
- Language preference is stored in `localStorage` (`dn_lang`)

## Project layout

```
src/
├── components/       # UI (sections, layout chrome, phone mockups)
├── constants/        # Site, GitHub, and DOM identifiers
├── data/             # projects, translations, mockups, team
├── integrations/     # Astro build hooks (GitHub cache)
├── layouts/
├── pages/            # Routes and locale redirects
├── styles/           # global.css, mobile.css
└── utils/            # i18n, GitHub API/client, overlays, helpers
```

Key data files:

- `src/data/projects.json` — project copy, features, install steps
- `src/data/translations.json` — shared UI strings
- `src/constants/github.ts` — org name, project IDs, API helpers

## Customization

### Add a project

1. Add an entry to `src/data/projects.json` and register the id in `src/constants/github.ts` if it should appear in GitHub-driven UI.
2. Static routes are generated via `getStaticPaths` in `src/pages/[lang]/projects/[id].astro`.
3. For a phone mockup, extend `src/data/project-mockups.json` and wire the app component in `ProjectDetail.astro`.

### Change branding or links

Edit `src/constants/site.ts` and `src/constants/github.ts`.

### GitHub at build time

The `githubBuildCache` integration writes `.cache/github-snapshot.json` during `astro build`. With a token, fetches are more reliable; without one, the build falls back to cached or minimal data.

## Deploy to GitHub Pages

CI is defined in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). On every push to `main`, the site is built and published via [GitHub Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#publishing-with-a-custom-github-actions-workflow).

### One-time repository setup

1. Open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. (Recommended) Add repository secret **`GITHUB_TOKEN`** is provided automatically in Actions — for higher API limits during build, the workflow uses the built-in `secrets.GITHUB_TOKEN` (same as `GITHUB_TOKEN` env in the workflow). For stricter rate limits or private metadata, you can add a [Personal Access Token](https://github.com/settings/tokens) as secret `GH_PAGES_TOKEN` and map it in the workflow if needed; the default org token is usually enough for public repos.
4. Optional: add **`PUBLIC_WEB3FORMS_ACCESS_KEY`** as a repository secret or variable if the contact form should work in production.

### URL and `base` path

`astro.config.mjs` sets `site` and `base` automatically in CI from `GITHUB_REPOSITORY`:

| Repository | Published URL | `base` |
|------------|---------------|--------|
| `darkmoonight/darkmoonight.github.io` | `https://darkmoonight.github.io/` | `/` |
| `darkmoonight/darkmoonight` | `https://darkmoonight.github.io/darkmoonight/` | `/darkmoonight/` |

Local builds use `https://darkmoonight.github.io` and `base: /`. Override with `ASTRO_SITE` and `ASTRO_BASE` when needed.

### Manual deploy

```bash
npm run build
# upload contents of dist/ to your Pages branch, or rely on the Actions workflow
```

After the first successful workflow run, the site URL appears under **Settings → Pages** and in the `github-pages` environment.

## Tooling

- **ESLint** — `eslint.config.js` with `eslint-plugin-astro` (flat config)
- **Prettier** — Astro-aware formatting
- **VS Code / Cursor** — see `.vscode/settings.json` for ESLint + Tailwind IntelliSense

Recommended extensions: Astro, ESLint (see `.vscode/extensions.json`).

## License

Team projects are open source. Website source: [darkmoonight](https://github.com/darkmoonight).
