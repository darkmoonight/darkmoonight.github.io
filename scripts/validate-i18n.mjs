#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC = join(ROOT, "src");
const TRANSLATIONS_PATH = join(SRC, "data/translations.json");
const MOCKUPS_PATH = join(SRC, "data/project-mockups.json");
const SECTIONS_PATH = join(SRC, "constants/sections.ts");
const SITE_I18N_PATH = join(SRC, "components/SiteI18n.astro");

/** Keys intentionally identical in en/ru (terminal aesthetic, brands, commands). */
const IDENTICAL_WHITELIST = new Set([
  "meta.siteTitle",
  "about.title",
  "about.panelTitle",
  "about.terminalTag",
  "about.cmdNeofetch",
  "about.cmdReadme",
  "about.cmdMission",
  "about.cmdStack",
  "about.cmdTeam",
  "about.cmdJoin",
  "about.cmdMetadata",
  "about.neofetchHost",
  "projects.title",
  "news.title",
  "donations.title",
  "contacts.title",
  "contacts.terminalTag",
  "contacts.subjectAuto",
  "contacts.confirmYes",
  "contacts.confirmNo",
  "contacts.debugOk",
  "error404.stderrLabel",
  "common.esc",
  "common.snackbarSystem",
  "common.snackbarSuccess",
  "common.snackbarError",
  "common.snackbarWarning",
  "nav.home",
  "nav.about",
  "nav.projects",
  "nav.news",
  "nav.contacts",
  "terminal.trainBanner",
  "terminal.matrixHelp",
  "donations.prompt",
  "donations.oneTimeFn",
  "donations.sponsorFn",
  "projectDetail.viewReleases",
  "projectDetail.viewAllNews",
  "projectDetail.branch",
  "projectDetail.mockup.navHome",
  "projectDetail.mockup.navStats",
  "projectDetail.apkVariantArm64",
  "projectDetail.apkVariantArmeabi",
  "common.enter",
  "common.relPrefix",
  "header.langPrefix",
  "hero.terminalTitle",
  "hero.encoding",
  "hero.prompt",
  "terminal.neofetchOs",
  "terminal.neofetchKernel",
  "terminal.neofetchShell",
  "terminal.neofetchUser",
  "terminal.neofetchDivider",
  "terminal.neofetchOsValue",
  "terminal.neofetchKernelValue",
  "terminal.neofetchShellValue",
  "terminal.neofetchThemeDark",
  "terminal.neofetchThemeLight",
  "terminal.neofetchStackFallback",
  "terminal.neofetchPromptFallback",
  "projects.explorerLabel",
  "projects.explorerRoot",
  "projects.previewReadme",
  "projects.listCmd",
  "projects.grepCmd",
  "projects.viewCode",
  "news.gitLog",
  "news.gitFlags",
  "news.prFolder",
  "news.closeEsc",
  "footer.encoding",
  "footer.editor",
  "footer.license",
  "footer.established",
  "footer.sysBtn",
  "footer.cursorPos",
  "footer.spaces",
  "footer.crlf",
  "layout.arcadeTitle",
  "projectDetail.issues",
  "projectDetail.pullRequests",
  "projectDetail.readmePath",
  "projectDetail.buildStep",
  "projectDetail.mockup.settingsThemeVal",
]);

/** Sections kept in translations but omitted from SiteI18n while disabled. */
const DORMANT_SECTIONS = new Set(["donations"]);

const SECTIONS_IN_SITE_I18N = new Set([
  "footer",
  "theme",
  "layout",
  "terminal",
  "contacts",
  "about",
  "projectDetail",
  "common",
  "news",
  "header",
  "github",
]);

function walkDir(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === ".cache") continue;
      walkDir(full, files);
    } else if (/\.(astro|ts|tsx|js|mjs)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

function collectTranslationKeys(node, prefix = "") {
  const leaves = [];

  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && "en" in value && "ru" in value) {
      leaves.push({ path, en: value.en, ru: value.ru });
    } else if (value && typeof value === "object") {
      leaves.push(...collectTranslationKeys(value, path));
    } else if (typeof value === "string") {
      leaves.push({ path, en: value, ru: value, stringOnly: true });
    }
  }

  return leaves;
}

function collectMockupKeys() {
  const keys = new Set();
  const mockups = JSON.parse(readFileSync(MOCKUPS_PATH, "utf8"));

  function walk(node) {
    if (!node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      if (key.endsWith("Key") && typeof value === "string") {
        keys.add(`projectDetail.mockup.${value}`);
      } else if (key === "statKeys" && Array.isArray(value)) {
        for (const statKey of value) {
          if (typeof statKey === "string") {
            keys.add(`projectDetail.mockup.${statKey}`);
          }
        }
      } else if (key === "statsCourses" && Array.isArray(value)) {
        for (const courseKey of value) {
          if (typeof courseKey === "string") {
            keys.add(`projectDetail.mockup.${courseKey}`);
          }
        }
      } else if (value && typeof value === "object") {
        walk(value);
      }
    }
  }

  walk(mockups);
  return keys;
}

function collectDynamicClientKeys(sourceFiles) {
  const keys = new Set();
  const trPattern = /\btr\s*\(\s*["'`]([^"'`]+)["'`]/g;
  const themePattern = /getThemeT\s*\(\s*[^?]*["'`]([^"'`]+)["'`]/g;
  const snackbarPattern = /common\.(close|snackbar[A-Z][a-zA-Z]*)/g;

  for (const file of sourceFiles) {
    const content = readFileSync(file, "utf8");
    let match;
    while ((match = trPattern.exec(content))) {
      keys.add(`terminal.${match[1]}`);
    }
    while ((match = themePattern.exec(content))) {
      keys.add(`theme.${match[1]}`);
    }
    while ((match = snackbarPattern.exec(content))) {
      keys.add(`common.${match[1]}`);
    }
  }

  return keys;
}

function collectNavKeys() {
  const keys = new Set();
  const content = readFileSync(SECTIONS_PATH, "utf8");
  const pattern = /["'`](nav\.[^"'`]+)["'`]/g;
  let match;
  while ((match = pattern.exec(content))) {
    if (!match[1].includes("donations")) keys.add(match[1]);
  }
  return keys;
}

function collectUsedKeys(sourceFiles, allPaths) {
  const used = new Set();
  const sectionRefs = new Set();

  const tPattern = /\bt\s*\(\s*["'`]([^"'`]+)["'`]/g;
  const tEnPattern = /\btEn\s*\(\s*["'`]([^"'`]+)["'`]/g;
  const tLangPattern = /\btLang\s*\(\s*["'`](?:en|ru)["'`]\s*,\s*["'`]([^"'`]+)["'`]/g;
  const clientTPattern =
    /clientT\s*\(\s*["'`]([^"'`]+)["'`]\s*,\s*["'`]([^"'`]+)["'`]/g;
  const pickSectionPattern =
    /pickSection\s*\(\s*[^,]+,\s*["'`]([^"'`]+)["'`]/g;
  const projectDetailKeyPattern = /projectDetail\.([a-zA-Z0-9_.]+)/g;
  const buildClientSectionsPattern =
    /buildClientI18nPayload\s*\(\s*[^,]+,\s*\[([\s\S]*?)\]\s*\)/g;

  for (const file of sourceFiles) {
    const content = readFileSync(file, "utf8");
    for (const pattern of [tPattern, tEnPattern, tLangPattern]) {
      let match;
      while ((match = pattern.exec(content))) used.add(match[1]);
    }
    let match;
    while ((match = clientTPattern.exec(content))) {
      used.add(`${match[1]}.${match[2]}`);
    }
    while ((match = pickSectionPattern.exec(content))) {
      sectionRefs.add(match[1]);
    }
  }

  const siteI18nContent = readFileSync(SITE_I18N_PATH, "utf8");
  let siteMatch;
  while ((siteMatch = buildClientSectionsPattern.exec(siteI18nContent))) {
    const sectionList = siteMatch[1];
    for (const section of sectionList.match(/["'`]([^"'`]+)["'`]/g) ?? []) {
      sectionRefs.add(section.replace(/["'`]/g, ""));
    }
  }

  for (const file of sourceFiles) {
    const content = readFileSync(file, "utf8");
    let match;
    while ((match = projectDetailKeyPattern.exec(content))) {
      const key = `projectDetail.${match[1]}`;
      if (allPaths.has(key)) used.add(key);
    }
  }

  return { used, sectionRefs };
}

function isDormantKey(path) {
  if (DORMANT_SECTIONS.has(path.split(".")[0])) return true;
  if (path.startsWith("nav.donations")) return true;
  return false;
}

function main() {
  const translations = JSON.parse(readFileSync(TRANSLATIONS_PATH, "utf8"));
  const leaves = collectTranslationKeys(translations);
  const allPaths = new Set(leaves.map((leaf) => leaf.path));

  let errors = 0;
  let warnings = 0;

  for (const leaf of leaves) {
    if (leaf.stringOnly) continue;
    if (!leaf.en || !leaf.ru) {
      console.error(`[i18n] Missing locale for ${leaf.path}`);
      errors++;
    } else if (leaf.en === leaf.ru && !IDENTICAL_WHITELIST.has(leaf.path)) {
      console.warn(`[i18n] Identical en/ru (review): ${leaf.path}`);
      warnings++;
    }
  }

  const sourceFiles = walkDir(SRC);
  const { used, sectionRefs } = collectUsedKeys(sourceFiles, allPaths);

  const implied = new Set(used);
  for (const key of collectNavKeys()) implied.add(key);
  for (const key of collectMockupKeys()) implied.add(key);
  for (const key of collectDynamicClientKeys(sourceFiles)) implied.add(key);

  for (const key of used) {
    if (key.includes("${")) continue;
    if (!allPaths.has(key)) {
      console.error(`[i18n] Missing translation key: ${key}`);
      errors++;
    }
  }

  for (const section of sectionRefs) {
    if (!(section in translations)) {
      console.error(`[i18n] Missing translation section: ${section}`);
      errors++;
    }
  }

  for (const section of SECTIONS_IN_SITE_I18N) {
    if (!(section in translations)) {
      console.error(
        `[i18n] SiteI18n section missing in translations.json: ${section}`,
      );
      errors++;
    }
  }

  for (const leaf of leaves) {
    if (leaf.stringOnly) continue;
    if (implied.has(leaf.path) || isDormantKey(leaf.path)) continue;
    console.warn(`[i18n] Orphan key (review): ${leaf.path}`);
    warnings++;
  }

  console.log(
    `[i18n] ${leaves.length} keys, ${used.size} referenced dotted keys, ${warnings} warnings`,
  );

  if (errors > 0) {
    process.exit(1);
  }
}

main();
