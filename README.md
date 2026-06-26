# DARK NIGHT

Bilingual team portfolio with an IDE/terminal UI. [Astro 6](https://astro.build) + [Tailwind CSS 4](https://tailwindcss.com).

## Development

**Node.js** ≥ 22.12.0

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # dist/
npm run preview
npm run ci        # typecheck, i18n, lint, format
```

Other scripts: `build:pages`, `validate:i18n`, `lint:fix`, `format`. Husky runs `ci` on commit.

## Configuration

Copy `.env.example` → `.env`.

| Variable | Purpose |
|----------|---------|
| `REPO_API_TOKEN` | REST API access for builds and live stats (recommended) |
| `PUBLIC_WEB3FORMS_ACCESS_KEY` | Contact form ([Web3Forms](https://web3forms.com)); omitted in dev = mock submit |
| `FORCE_GITHUB_SYNC` | `1` — bypass snapshot cache TTL |
| `ASTRO_SITE` / `ASTRO_BASE` | Site URL and path prefix (CI sets these for Pages) |

Build-time GitHub data is cached in `.cache/github-snapshot.json`; the client can refresh stars, languages, and releases in the browser.

## Structure

```
src/
├── components/     sections, layout, phone mockups
├── constants/      site, GitHub, DOM ids
├── data/           projects, translations, mockups, team
├── integrations/   build hooks (GitHub cache)
├── pages/          routes (/en, /ru, project detail)
├── styles/
└── utils/
```

Content lives in `src/data/` (`projects.json`, `translations.json`, `project-mockups.json`). Branding and org settings: `src/constants/site.ts`, `src/constants/github.ts`.

## i18n

Routes: `/en/` and `/ru/` (`/` → `/en/`). UI strings: `src/data/translations.json`. Check keys with `npm run validate:i18n`.

## Deploy

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds on push to `main`/`master` (and daily cron) and publishes to **GitHub Pages** via Actions.

1. **Settings → Pages → Source:** GitHub Actions
2. Optional repo secrets: `PUBLIC_WEB3FORMS_ACCESS_KEY`
3. CI maps the built-in Actions token into `REPO_API_TOKEN` automatically

Local Pages smoke: `npm run build:pages`.

## License

Open source — [darkmoonight](https://github.com/darkmoonight).
