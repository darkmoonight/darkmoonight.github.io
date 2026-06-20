/** Shared overlay open/close helpers with scroll lock for stacked modals. */

import { DOM_IDS, OVERLAY_MODALS } from "../constants/dom-ids";
import { getFocusableElements } from "./dom";

export interface OverlayPair {
  backdropId: string;
  panelId: string;
}

const PANEL_CLOSED = ["scale-95", "opacity-0", "pointer-events-none"];
const BACKDROP_CLOSED = ["opacity-0", "pointer-events-none"];

export function getOverlayElements({ backdropId, panelId }: OverlayPair) {
  return {
    backdrop: document.getElementById(backdropId),
    panel: document.getElementById(panelId),
  };
}

export function isOverlayOpen(backdropId: string): boolean {
  const backdrop = document.getElementById(backdropId);
  return Boolean(
    backdrop &&
    !backdrop.classList.contains("hidden") &&
    !backdrop.classList.contains("opacity-0"),
  );
}

export function lockBodyScroll(): void {
  document.body.style.overflow = "hidden";
}

export function unlockBodyScrollIfIdle(): void {
  const anyOpen = OVERLAY_MODALS.some((pair) => isOverlayOpen(pair.backdropId));
  if (anyOpen) return;

  const mobileNav = document.getElementById(DOM_IDS.mobileNavDrawer);
  if (mobileNav?.classList.contains("is-open")) return;

  document.body.style.overflow = "";
}

export interface OpenOverlayOptions {
  pair: OverlayPair;
  onOpened?: (panel: HTMLElement) => void;
}

export function openOverlay({ pair, onOpened }: OpenOverlayOptions): boolean {
  const { backdrop, panel } = getOverlayElements(pair);
  if (!backdrop || !panel) return false;

  backdrop.classList.remove("hidden");
  backdrop.setAttribute("aria-hidden", "false");

  requestAnimationFrame(() => {
    backdrop.classList.remove(...BACKDROP_CLOSED);
    panel.classList.remove(...PANEL_CLOSED);
    onOpened?.(panel);
  });

  lockBodyScroll();
  return true;
}

export interface CloseOverlayOptions {
  pair: OverlayPair;
  transitionMs?: number;
  unlockScroll?: boolean;
  onClosed?: () => void;
}

export function closeOverlay({
  pair,
  transitionMs = 200,
  unlockScroll = true,
  onClosed,
}: CloseOverlayOptions): void {
  const { backdrop, panel } = getOverlayElements(pair);
  if (!backdrop || !panel) return;

  backdrop.classList.add(...BACKDROP_CLOSED);
  panel.classList.add(...PANEL_CLOSED);
  backdrop.setAttribute("aria-hidden", "true");

  if (unlockScroll) {
    unlockBodyScrollIfIdle();
  }

  window.setTimeout(() => {
    if (backdrop.classList.contains("opacity-0")) {
      backdrop.classList.add("hidden");
    }
    onClosed?.();
  }, transitionMs);
}

export function forceCloseAllOverlays(): void {
  for (const pair of OVERLAY_MODALS) {
    const { backdrop, panel } = getOverlayElements(pair);
    if (!backdrop || !panel) continue;

    backdrop.classList.add("hidden", ...BACKDROP_CLOSED);
    panel.classList.add(...PANEL_CLOSED);
    backdrop.setAttribute("aria-hidden", "true");
  }
}

export function focusFirstInPanel(panel: HTMLElement): void {
  getFocusableElements(panel)[0]?.focus();
}
