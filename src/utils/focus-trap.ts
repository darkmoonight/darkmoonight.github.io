import { getFocusableElements } from "./dom";

export interface FocusTrapOptions {
  onEscape?: () => void;
}

export function createFocusTrap(
  container: HTMLElement,
  options: FocusTrapOptions = {},
): () => void {
  const handler = (event: KeyboardEvent) => {
    if (options.onEscape && event.key === "Escape") {
      options.onEscape();
      return;
    }

    if (event.key !== "Tab") return;

    const focusables = getFocusableElements(container);
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}
