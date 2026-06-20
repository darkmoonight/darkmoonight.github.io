/** Project detail APK picker: floating menu, variant storage, download URL sync. */

import {
  APK_DROPDOWN,
  APK_FLOAT_MENU,
  APK_PICKER_DOM_IDS,
} from "../constants/apk-picker";
import { STORAGE_KEYS } from "../constants/storage";
import type { ReleaseNewsItem } from "./github-releases";
import { escapeAttr } from "./html";
import type { ApkPickerLabels } from "./apk-picker-labels";
import {
  pickDefaultApkVariant,
  type ReleaseApkVariant,
} from "./release-apk-variants";

export type { ApkPickerLabels } from "./apk-picker-labels";

function legacyApkVariant(
  release: ReleaseNewsItem,
): ReleaseApkVariant | undefined {
  if (!release.apkUrl) return undefined;
  return {
    id: release.defaultApkId || "default",
    fileName: release.apkFileName,
    url: release.apkUrl,
    sizeLabel: release.apkSizeLabel,
    labelKey: "other",
    sortRank: 0,
  };
}

export function getReleaseApkVariant(
  release: ReleaseNewsItem,
  variantId?: string,
): ReleaseApkVariant | undefined {
  const variants = release.apkVariants ?? [];
  if (!variants.length) return legacyApkVariant(release);
  if (variantId) {
    return (
      variants.find((v) => v.id === variantId) ??
      pickDefaultApkVariant(variants)
    );
  }
  return (
    variants.find((v) => v.id === release.defaultApkId) ??
    pickDefaultApkVariant(variants)
  );
}

function variantLabel(
  variant: ReleaseApkVariant,
  labels: ApkPickerLabels,
): string {
  return labels.variantLabels[variant.labelKey] ?? variant.fileName;
}

function triggerSummary(
  variant: ReleaseApkVariant,
  labels: ApkPickerLabels,
): string {
  const name = variantLabel(variant, labels);
  return variant.sizeLabel ? `${name} · ${variant.sizeLabel}` : name;
}

function buildOptionHtml(
  variant: ReleaseApkVariant,
  labels: ApkPickerLabels,
  selected: boolean,
): string {
  const label = variantLabel(variant, labels);
  const sizeHtml = variant.sizeLabel
    ? `<span class="project-detail-apk-dropdown__option-size">${escapeAttr(variant.sizeLabel)}</span>`
    : "";
  return `<li
  role="option"
  tabindex="-1"
  class="project-detail-apk-dropdown__option${selected ? " is-selected" : ""}"
  data-apk-id="${escapeAttr(variant.id)}"
  data-apk-url="${escapeAttr(variant.url)}"
  data-apk-size="${escapeAttr(variant.sizeLabel)}"
  data-apk-file="${escapeAttr(variant.fileName)}"
  data-apk-trigger="${escapeAttr(triggerSummary(variant, labels))}"
  aria-selected="${selected ? "true" : "false"}"
>
  <span class="project-detail-apk-dropdown__option-label">${escapeAttr(label)}</span>
  <span class="project-detail-apk-dropdown__option-meta">
    <span class="project-detail-apk-dropdown__option-file">${escapeAttr(variant.fileName)}</span>
    ${sizeHtml}
  </span>
</li>`;
}

export function buildApkPickerHtml(
  variants: ReleaseApkVariant[],
  labels: ApkPickerLabels,
  defaultId: string,
): string {
  if (variants.length <= 1) return "";

  const active =
    variants.find((v) => v.id === defaultId) ?? pickDefaultApkVariant(variants);
  const options = variants
    .map((v) => buildOptionHtml(v, labels, v.id === defaultId))
    .join("");

  return `<div class="project-detail-apk-dropdown">
  <button
    type="button"
    class="project-detail-apk-dropdown__trigger md3-btn-outlined"
    id="${APK_PICKER_DOM_IDS.trigger}"
    aria-haspopup="listbox"
    aria-expanded="false"
    aria-controls="${APK_PICKER_DOM_IDS.listbox}"
  >
    <span class="project-detail-apk-dropdown__trigger-text">${escapeAttr(active ? triggerSummary(active, labels) : "")}</span>
    <span class="project-detail-apk-dropdown__chevron" aria-hidden="true">▾</span>
  </button>
  <ul
    id="${APK_PICKER_DOM_IDS.listbox}"
    class="project-detail-apk-dropdown__menu hidden"
    role="listbox"
    aria-label="${escapeAttr(labels.groupAria)}"
  >${options}</ul>
</div>`;
}

export function readVariantFromOption(
  option: HTMLElement,
): ReleaseApkVariant | null {
  const { apkUrl, apkId, apkFile, apkSize } = option.dataset;
  if (!apkUrl) return null;
  return {
    id: apkId ?? "",
    fileName: apkFile ?? "",
    url: apkUrl,
    sizeLabel: apkSize ?? "",
    labelKey: "other",
    sortRank: 99,
  };
}

function getDropdownParts(root: HTMLElement) {
  const trigger = root.querySelector<HTMLButtonElement>(APK_DROPDOWN.trigger);
  const menu = root.querySelector<HTMLElement>(APK_DROPDOWN.menu);
  if (!trigger || !menu) return null;
  return { trigger, menu };
}

const FLOAT_STYLE_PROPS = [
  "position",
  "top",
  "bottom",
  "left",
  "right",
  "width",
  "maxHeight",
  "zIndex",
] as const;

function positionApkMenuFloat(
  menu: HTMLElement,
  trigger: HTMLButtonElement,
): void {
  // Fixed positioning keeps the menu in view when the detail page scrolls.
  const { gapPx, maxHeightPx, minHeightPx, minWidthPx, flipBelowPx, zIndex } =
    APK_FLOAT_MENU;
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - gapPx;
  const spaceAbove = rect.top - gapPx;
  const openUp = spaceBelow < flipBelowPx && spaceAbove > spaceBelow;
  const maxHeight = Math.min(
    maxHeightPx,
    Math.max(minHeightPx, openUp ? spaceAbove : spaceBelow),
  );

  menu.classList.add("is-floating");
  menu.style.position = "fixed";
  menu.style.left = `${rect.left}px`;
  menu.style.width = `${Math.max(rect.width, minWidthPx)}px`;
  menu.style.right = "auto";
  menu.style.maxHeight = `${maxHeight}px`;
  menu.style.zIndex = String(zIndex);

  if (openUp) {
    menu.style.top = "auto";
    menu.style.bottom = `${window.innerHeight - rect.top + gapPx}px`;
  } else {
    menu.style.top = `${rect.bottom + gapPx}px`;
    menu.style.bottom = "auto";
  }
}

function resetApkMenuFloat(menu: HTMLElement): void {
  menu.classList.remove("is-floating");
  for (const prop of FLOAT_STYLE_PROPS) {
    menu.style.removeProperty(prop);
  }
}

function setDropdownOpen(root: HTMLElement, open: boolean): void {
  const parts = getDropdownParts(root);
  if (!parts) return;
  const { trigger, menu } = parts;
  trigger.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) {
    menu.classList.remove("hidden");
    positionApkMenuFloat(menu, trigger);
  } else {
    menu.classList.add("hidden");
    resetApkMenuFloat(menu);
  }
}

function applyOptionSelection(root: HTMLElement, option: HTMLElement): void {
  root.querySelectorAll<HTMLElement>(APK_DROPDOWN.option).forEach((el) => {
    const active = el === option;
    el.classList.toggle("is-selected", active);
    el.setAttribute("aria-selected", active ? "true" : "false");
  });
  const triggerText = root.querySelector<HTMLElement>(APK_DROPDOWN.triggerText);
  if (triggerText && option.dataset.apkTrigger) {
    triggerText.textContent = option.dataset.apkTrigger;
  }
}

export function bindApkVariantPicker(
  root: HTMLElement | null,
  onSelect: (variant: ReleaseApkVariant) => void,
  signal?: AbortSignal,
): void {
  if (!root) return;
  const dropdown = root.querySelector<HTMLElement>(APK_DROPDOWN.root);
  if (!dropdown) return;
  const parts = getDropdownParts(dropdown);
  if (!parts) return;
  const { trigger, menu } = parts;

  trigger.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDropdownOpen(dropdown, menu.classList.contains("hidden"));
    },
    { signal },
  );

  dropdown.addEventListener(
    "click",
    (e) => {
      const option = (e.target as HTMLElement).closest<HTMLElement>(
        APK_DROPDOWN.option,
      );
      if (!option || !dropdown.contains(option)) return;
      e.preventDefault();
      e.stopPropagation();
      const variant = readVariantFromOption(option);
      if (!variant) return;
      applyOptionSelection(dropdown, option);
      setDropdownOpen(dropdown, false);
      onSelect(variant);
    },
    { signal },
  );

  document.addEventListener(
    "click",
    (e) => {
      if (!dropdown.contains(e.target as Node))
        setDropdownOpen(dropdown, false);
    },
    { signal },
  );

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") setDropdownOpen(dropdown, false);
    },
    { signal },
  );

  let repositionRaf = 0;
  const repositionIfOpen = () => {
    if (menu.classList.contains("hidden")) return;
    cancelAnimationFrame(repositionRaf);
    repositionRaf = requestAnimationFrame(() =>
      positionApkMenuFloat(menu, trigger),
    );
  };

  window.addEventListener("resize", repositionIfOpen, { signal });
  window.addEventListener("scroll", repositionIfOpen, {
    capture: true,
    signal,
  });
}

export function apkVariantStorageKey(projectId: string): string {
  return `${STORAGE_KEYS.apkVariantPrefix}${projectId}`;
}

export function readStoredApkVariantId(projectId: string): string | null {
  try {
    return localStorage.getItem(apkVariantStorageKey(projectId));
  } catch {
    return null;
  }
}

export function storeApkVariantId(projectId: string, variantId: string): void {
  try {
    localStorage.setItem(apkVariantStorageKey(projectId), variantId);
  } catch {
    return;
  }
}
