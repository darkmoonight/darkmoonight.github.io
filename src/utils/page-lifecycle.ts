export function onPageInit(
  guard: () => boolean,
  bind: (signal: AbortSignal) => void,
): void {
  // Re-bind interactive handlers after Astro view transitions; abort prior listeners.
  let controller: AbortController | null = null;

  const init = () => {
    controller?.abort();
    if (!guard()) return;
    controller = new AbortController();
    bind(controller.signal);
  };

  init();
  document.addEventListener("astro:page-load", init);
}
