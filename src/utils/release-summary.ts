/** Compact GitHub release bodies into bullets for project detail and the news modal. */

import { escapeAttr, escapeHtml } from "./html";

export interface ReleaseSummaryOptions {
  maxBullets?: number;
  maxChars?: number;
  maxLineLen?: number;
  linkify?: boolean;
}

export const PROJECT_DETAIL_RELEASE_SUMMARY: ReleaseSummaryOptions = {
  maxBullets: 4,
  maxLineLen: 0,
  maxChars: 480,
  linkify: true,
};

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function shortenReleaseLinkLabel(url: string): string {
  const pull = url.match(/github\.com\/[^/]+\/[^/]+\/pull\/(\d+)/i);
  if (pull) return `PR #${pull[1]}`;

  const tag = url.match(/\/releases\/tag\/([^/?#]+)/i);
  if (tag) return tag[1];

  const compare = url.match(/\/compare\/([^/?#]+)/i);
  if (compare) {
    const label = compare[1];
    return label.length > 30 ? `${label.slice(0, 28)}…` : label;
  }

  try {
    const path = new URL(url).pathname.replace(/^\/+/, "");
    return path.length > 40 ? `${path.slice(0, 38)}…` : path;
  } catch {
    return url.length > 42 ? `${url.slice(0, 40)}…` : url;
  }
}

function releaseAnchor(url: string, label: string): string {
  if (!isSafeUrl(url)) return escapeHtml(label);
  const display =
    label.trim() === url.trim() || label.startsWith("http")
      ? shortenReleaseLinkLabel(url)
      : label;
  return `<a href="${escapeAttr(url)}" class="project-detail-release-link" target="_blank" rel="noopener noreferrer">${escapeHtml(display)}</a>`;
}

function wrapReleaseBulletHtml(html: string): string {
  return `<span class="project-detail-release-bullets__body">${html}</span>`;
}

function formatReleaseLineHtml(rawLine: string): string {
  const trimmed = rawLine.replace(/<!--[\s\S]*?-->/g, "").trim();
  if (!trimmed) return "";

  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
  let html = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRe.exec(trimmed)) !== null) {
    html += formatReleasePlainSegment(trimmed.slice(lastIndex, match.index));
    html += releaseAnchor(match[2].trim(), match[1]);
    lastIndex = match.index + match[0].length;
  }

  html += formatReleasePlainSegment(trimmed.slice(lastIndex));
  return html.trim();
}

function formatReleasePlainSegment(text: string): string {
  if (!text) return "";

  const urlRe = /https?:\/\/[^\s<>"')]+/g;
  let html = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = urlRe.exec(text)) !== null) {
    html += formatReleaseTextEmphasis(text.slice(lastIndex, match.index));
    html += releaseAnchor(match[0], match[0]);
    lastIndex = match.index + match[0].length;
  }

  html += formatReleaseTextEmphasis(text.slice(lastIndex));
  return html;
}

function formatReleaseTextEmphasis(text: string): string {
  if (!text) return "";
  let html = escapeHtml(text);
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  return html;
}

function stripInlineMarkdown(text: string): string {
  let out = text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  out = out.replace(/^([^:]{1,80}):\s*\1\s*$/iu, "$1");
  return out;
}

const RELEASE_CHANGELOG_LINE = /full\s+changelog/i;
/** GitHub auto-generated "Full changelog" intro lines — skip as bullets, link separately. */
const RELEASE_BOILERPLATE_INTRO =
  /^full\s+changelog(?::\s*full\s+changelog)?\.?$/i;
const RELEASE_EMPTY_CHANGELOG_BULLET = /^full\s+changelog:?\s*$/i;

export type ModalReleaseBullet =
  | { type: "item"; text: string; nested?: boolean }
  | { type: "changelog"; compare: string; href: string };

function extractChangelogInfo(
  raw: string,
): { compare: string; href: string } | null {
  for (const line of raw.split(/\r?\n/)) {
    if (!RELEASE_CHANGELOG_LINE.test(line)) continue;
    const url = line.match(/https?:\/\/[^\s<>"')]+/i)?.[0];
    if (url && isSafeUrl(url)) {
      return { compare: shortenReleaseLinkLabel(url), href: url };
    }
  }
  return null;
}

function isWhatsChangedHeading(title: string): boolean {
  return /^what'?s changed$/i.test(title.trim());
}

type WalkedReleaseLine = {
  text: string;
  nested: boolean;
};

/** Walk release markdown lines; shared rules for detail bullets and modal items. */
function walkReleaseLines(
  raw: string,
  {
    maxItems,
    includeHeadings,
    includePlainLines,
  }: {
    maxItems: number;
    includeHeadings: boolean;
    includePlainLines: boolean;
  },
): WalkedReleaseLine[] {
  const items: WalkedReleaseLine[] = [];

  for (const line of raw.split(/\r?\n/)) {
    if (items.length >= maxItems) break;

    const nested = line.match(/^(\s{2,})[-*+]\s+(.+)$/);
    if (nested) {
      items.push({ text: nested[2], nested: true });
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed || RELEASE_CHANGELOG_LINE.test(trimmed)) continue;

    const heading = trimmed.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      const title = heading[1].trim();
      if (isWhatsChangedHeading(title)) continue;
      if (includeHeadings) items.push({ text: title, nested: false });
      continue;
    }

    const top =
      trimmed.match(/^[-*+]\s+(.+)$/) || trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (top) {
      items.push({ text: top[1], nested: false });
      continue;
    }

    if (includePlainLines) {
      items.push({ text: trimmed, nested: false });
    }
  }

  return items;
}

function buildModalReleaseBullets(
  raw: string,
  maxBullets: number,
): ModalReleaseBullet[] {
  const items: ModalReleaseBullet[] = [];

  for (const line of walkReleaseLines(raw, {
    maxItems: maxBullets,
    includeHeadings: false,
    includePlainLines: false,
  })) {
    const cleaned = cleanModalBulletText(stripInlineMarkdown(line.text));
    if (!isMeaningfulBullet(cleaned)) continue;
    items.push({
      type: "item",
      text: truncateLine(cleaned, 160),
      nested: line.nested,
    });
  }

  const changelog = extractChangelogInfo(raw);
  if (changelog) {
    items.push({ type: "changelog", ...changelog });
  }

  return items;
}

function cleanModalBulletText(text: string): string {
  return text
    .replace(/\s+by\s+@[\w-]+(?:\s+in\s+#\d+)?.*$/i, "")
    .replace(/\s+in\s+#\d+\s*$/i, "")
    .trim();
}

function isMeaningfulBullet(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (RELEASE_EMPTY_CHANGELOG_BULLET.test(t)) return false;
  if (RELEASE_BOILERPLATE_INTRO.test(t)) return false;
  return true;
}

function truncateLine(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

export function summarizeReleaseNotes(
  raw: string,
  {
    maxBullets = 4,
    maxChars = 280,
    maxLineLen = 88,
    linkify = false,
  }: ReleaseSummaryOptions = {},
): string[] {
  // Compact release body into bullet highlights for project detail and news modal.
  const text = raw?.trim();
  if (!text) return [];

  const pushItem = (items: string[], rawLine: string) => {
    if (linkify) {
      const html = formatReleaseLineHtml(rawLine);
      if (html) items.push(wrapReleaseBulletHtml(html));
      return;
    }
    if (RELEASE_CHANGELOG_LINE.test(rawLine)) return;

    const cleaned = stripInlineMarkdown(rawLine);
    if (!isMeaningfulBullet(cleaned)) return;
    const item = maxLineLen > 0 ? truncateLine(cleaned, maxLineLen) : cleaned;
    if (item) items.push(item);
  };

  const bullets: string[] = [];
  const walked = walkReleaseLines(text, {
    maxItems: maxBullets,
    includeHeadings: true,
    includePlainLines: true,
  });

  for (const line of walked) {
    pushItem(bullets, line.text);
    if (bullets.length >= maxBullets) return bullets;
  }

  if (bullets.length) return bullets;

  const plain = stripInlineMarkdown(
    text
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^[-*+]\s+/gm, "")
      .replace(/\r?\n+/g, " "),
  );

  if (!plain) return [];
  const chunk =
    plain.length <= maxChars ? plain : `${plain.slice(0, maxChars).trim()}…`;
  return [maxLineLen > 0 ? truncateLine(chunk, maxLineLen) : chunk];
}

const RELEASE_STRUCTURE_LINE = /^(#{1,6}\s+|[-*+]\s+|\d+[.)]\s+)/;

export function splitReleaseNotesForModal(
  raw: string,
  maxBullets = 8,
): { intro: string; bullets: ModalReleaseBullet[] } {
  // Split release notes into intro paragraph + structured bullets for the news modal.
  const text = raw?.trim();
  if (!text) return { intro: "", bullets: [] };

  const bullets = buildModalReleaseBullets(text, maxBullets);

  const introParts: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || RELEASE_STRUCTURE_LINE.test(trimmed)) continue;
    if (RELEASE_CHANGELOG_LINE.test(trimmed)) continue;
    const cleaned = stripInlineMarkdown(trimmed);
    if (cleaned && !RELEASE_BOILERPLATE_INTRO.test(cleaned))
      introParts.push(cleaned);
  }

  const intro = introParts.join(" ").trim();
  return {
    intro: RELEASE_BOILERPLATE_INTRO.test(intro) ? "" : intro,
    bullets,
  };
}
