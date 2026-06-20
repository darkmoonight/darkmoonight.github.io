import { escapeHtml } from "./html";

export function parseReleaseMarkdown(text: string): string {
  if (!text) return "";
  return escapeHtml(text)
    .replace(/\r?\n/g, "<br/>")
    .replace(
      /### (.*?)(<br\/>|$)/g,
      '<h5 class="text-text-primary font-bold text-xs mt-3 mb-1 font-mono">$1</h5>',
    )
    .replace(
      /## (.*?)(<br\/>|$)/g,
      '<h4 class="text-text-primary font-bold text-sm mt-4 mb-2">$1</h4>',
    )
    .replace(
      /# (.*?)(<br\/>|$)/g,
      '<h3 class="text-accent font-bold text-base mt-4 mb-2">$1</h3>',
    )
    .replace(
      /\*\*(.*?)\*\*/g,
      '<strong class="text-text-primary font-bold">$1</strong>',
    )
    .replace(
      /`(.*?)`/g,
      '<code class="px-1.5 py-0.5 rounded bg-bg-panel border border-border-color font-mono text-[11px] text-accent-secondary">$1</code>',
    )
    .replace(
      /(^|<br\/>)([-*])\s(.*?)(?=<br\/>|$)/g,
      '$1<li class="list-none flex items-start gap-1.5 ml-2 text-xs font-mono py-0.5"><span class="text-accent-secondary">▸</span> <span>$3</span></li>',
    );
}
