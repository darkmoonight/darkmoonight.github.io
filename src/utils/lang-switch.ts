import { STORAGE_KEYS } from "../constants/storage";

export function saveScrollForLangSwitch(): void {
  try {
    sessionStorage.setItem(
      STORAGE_KEYS.langSwitchScrollY,
      String(window.scrollY),
    );
  } catch {}
}

export function restoreScrollAfterLangSwitch(): void {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.langSwitchScrollY);
    if (raw == null) return;
    sessionStorage.removeItem(STORAGE_KEYS.langSwitchScrollY);

    const y = Number(raw);
    if (!Number.isFinite(y) || y < 0) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: y, left: 0, behavior: "instant" });
      });
    });
  } catch {}
}

function langSwitchDestination(href: string): string {
  const hash = window.location.hash;
  if (!hash || href.includes("#")) return href;
  return `${href}${hash}`;
}

export function navigateLangSwitch(href: string): void {
  saveScrollForLangSwitch();
  const dest = langSwitchDestination(href);

  import("astro:transitions/client")
    .then(({ navigate }) => navigate(dest))
    .catch(() => {
      window.location.href = dest;
    });
}

export function bindLangSwitchLinks(signal: AbortSignal): void {
  document.addEventListener(
    "click",
    (event) => {
      const link = (event.target as HTMLElement | null)?.closest?.(
        "a[data-lang-switch]",
      ) as HTMLAnchorElement | null;
      if (!link) return;

      event.preventDefault();
      navigateLangSwitch(link.href);
    },
    { signal, capture: true },
  );
}
