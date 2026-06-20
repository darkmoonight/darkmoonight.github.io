import { DOM_IDS } from "../constants/dom-ids";
import { forceCloseAllOverlays, unlockBodyScrollIfIdle } from "./overlay-modal";
import { wakeUpScreensaver } from "./screensaver";

export function resetBlockingUiState(): void {
  wakeUpScreensaver();
  unlockBodyScrollIfIdle();
  document.body.classList.remove("rm-rf-active");
  document.getElementById(DOM_IDS.rmRfGlitchOverlay)?.remove();
  forceCloseAllOverlays();
  document.getElementById(DOM_IDS.retroArcadeModal)?.remove();
}

export function bindPageBlockingUiReset(): void {
  document.addEventListener("astro:before-swap", resetBlockingUiState);
  document.addEventListener("astro:page-load", resetBlockingUiState);
}
