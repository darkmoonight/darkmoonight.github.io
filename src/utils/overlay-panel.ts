/** Focus-trap wrapper around overlay-modal open/close for dialog panels. */

import { createFocusTrap } from "./focus-trap";
import {
  closeOverlay,
  focusFirstInPanel,
  openOverlay,
  type OverlayPair,
} from "./overlay-modal";

export interface BindOverlayPanelOptions {
  scrim: HTMLElement;
  panel: HTMLElement;
  trigger?: HTMLElement | null;
  closeSelectors: string[];
  onOpen?: () => void;
  onClose?: () => void;
  signal: AbortSignal;
  transitionMs?: number;
}

export function bindOverlayPanel({
  scrim,
  panel,
  closeSelectors,
  onOpen,
  onClose,
  signal,
  transitionMs = 300,
}: BindOverlayPanelOptions) {
  const pair: OverlayPair = {
    backdropId: scrim.id,
    panelId: panel.id,
  };

  let savedTrigger: HTMLElement | null = null;
  let removeFocusTrap: (() => void) | null = null;

  function close() {
    removeFocusTrap?.();
    removeFocusTrap = null;

    closeOverlay({
      pair,
      transitionMs,
      onClosed: () => {
        savedTrigger?.focus();
        savedTrigger = null;
        onClose?.();
      },
    });
  }

  function open(fromTrigger?: HTMLElement | null) {
    savedTrigger =
      fromTrigger ?? (document.activeElement as HTMLElement | null);

    openOverlay({
      pair,
      onOpened: (openedPanel) => {
        onOpen?.();
        focusFirstInPanel(openedPanel);
        removeFocusTrap?.();
        removeFocusTrap = createFocusTrap(openedPanel, { onEscape: close });
      },
    });
  }

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest) return;

      for (const selector of closeSelectors) {
        if (target.closest(selector)) {
          event.preventDefault();
          event.stopImmediatePropagation();
          close();
          return;
        }
      }

      if (target === scrim) {
        close();
      }
    },
    { signal },
  );

  return { open, close };
}
