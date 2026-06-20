import translations from "../data/translations.json";

/** Server and client i18n helpers for en/ru routing and the SiteI18n DOM payload. */

export type Language = "en" | "ru";
export const DEFAULT_LANGUAGE: Language = "en";
export const LANGUAGES: Language[] = ["en", "ru"];
export const LANGUAGE_STORAGE_KEY = "dn_lang";

type TranslationLeaf = { en: string; ru: string };
type TranslationNode = {
  [key: string]: TranslationLeaf | TranslationNode | string;
};

export function isLocaleSegment(segment: string): segment is Language {
  return segment === "en" || segment === "ru";
}

export function getLangFromUrl(url: URL): Language {
  const [, segment] = url.pathname.split("/");
  if (segment === "ru") return "ru";
  if (segment === "en") return "en";
  return DEFAULT_LANGUAGE;
}

export function stripLocalePrefix(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  const stripped = clean.replace(/^\/(en|ru)(?=\/|$)/, "");
  return stripped || "/";
}

export function useTranslations(lang: Language) {
  return function t(key: string): string {
    const keys = key.split(".");
    let value: unknown = translations;

    for (const k of keys) {
      if (value && typeof value === "object" && k in (value as object)) {
        value = (value as TranslationNode)[k];
      } else {
        return key;
      }
    }

    if (value && typeof value === "object" && value !== null) {
      const leaf = value as TranslationLeaf;
      if (lang in leaf) return leaf[lang];
      if (DEFAULT_LANGUAGE in leaf) return leaf[DEFAULT_LANGUAGE];
    }

    return typeof value === "string" ? value : key;
  };
}

export function tLang(lang: Language, key: string): string {
  return useTranslations(lang)(key);
}

export function useLocalizedPath(lang: Language) {
  return function getLocalizedPath(path: string): string {
    const base = stripLocalePrefix(path);
    if (base === "/") return `/${lang}/`;
    return `/${lang}${base}`;
  };
}

export function getLangSwitchUrl(
  pathname: string,
  targetLang: Language,
): string {
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length > 0 && isLocaleSegment(parts[0])) {
    parts[0] = targetLang;
  } else {
    parts.unshift(targetLang);
  }

  const joined = `/${parts.join("/")}`;
  return parts.length === 1 ? `${joined}/` : joined;
}

export function isHomePath(pathname: string): boolean {
  return pathname === "/" || /^\/(en|ru)\/?$/.test(pathname);
}

export function localizedField<T extends Record<"en" | "ru", unknown>>(
  lang: Language,
  item: T,
): T["en"] {
  return (lang === "ru" ? item.ru : item.en) as T["en"];
}

export function pickSection(
  lang: Language,
  sectionKey: string,
): Record<string, string> {
  // Flatten nested translation leaves into dotted keys for client scripts.
  const section = (translations as TranslationNode)[sectionKey];
  if (!section || typeof section !== "object") return {};

  const out: Record<string, string> = {};

  function walk(node: TranslationNode, prefix: string) {
    for (const [key, val] of Object.entries(node)) {
      if (val && typeof val === "object" && "en" in val && "ru" in val) {
        const leaf = val as TranslationLeaf;
        out[prefix + key] = leaf[lang] ?? leaf[DEFAULT_LANGUAGE];
      } else if (val && typeof val === "object") {
        walk(val as TranslationNode, prefix + key + ".");
      } else if (typeof val === "string") {
        out[prefix + key] = val;
      }
    }
  }

  walk(section as TranslationNode, "");
  return out;
}

export function readClientI18n(): Record<string, Record<string, string>> {
  // Client scripts read the hidden #site-i18n payload injected by SiteI18n.astro.
  try {
    const el = document.getElementById("site-i18n");
    const raw = el?.getAttribute("data-json") || el?.textContent;
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function clientT(section: string, key: string, fallback = ""): string {
  // Prefer SiteI18n payload; Hero terminal uses pickSection("terminal") via tr() instead.
  return readClientI18n()[section]?.[key] ?? fallback;
}

export function getLangFromDocument(): Language {
  return document.documentElement.lang === "ru" ? "ru" : "en";
}

export type ClientT = (
  section: string,
  key: string,
  fallback?: string,
) => string;

export function clientDottedT(clientTFn: ClientT, dottedKey: string): string {
  const dot = dottedKey.indexOf(".");
  if (dot === -1) return clientTFn("projectDetail", dottedKey);
  return clientTFn(dottedKey.slice(0, dot), dottedKey.slice(dot + 1));
}

export function buildClientI18nPayload(
  lang: Language,
  sections: string[],
): Record<string, Record<string, string>> {
  return Object.fromEntries(
    sections.map((section) => [section, pickSection(lang, section)]),
  );
}
