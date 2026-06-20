import { escapeHtml } from "./html";
import type { ReleaseNewsItem } from "./github-releases";

export function buildNewsCommitRowHtml(
  news: ReleaseNewsItem,
  title: string,
  tagLabel: string,
  index: number,
): string {
  const timelineBranch =
    index > 0
      ? '<div class="news-commit-row__branch" aria-hidden="true"></div>'
      : "";

  return `
    <div class="news-commit-row__rail">
      <div class="news-commit-row__line" aria-hidden="true"></div>
      ${timelineBranch}
      <div class="news-commit-row__node" aria-hidden="true">
        <div class="news-commit-row__node-core"></div>
      </div>
    </div>
    <div class="news-commit-row__body">
      <div class="news-commit-row__main">
        <div class="news-commit-row__meta">
          <span class="news-commit-row__hash">${escapeHtml(news.hash)}</span>
          <span class="news-commit-row__sep" aria-hidden="true">|</span>
          <span class="news-commit-row__tag">${escapeHtml(tagLabel)}</span>
          <span class="news-commit-row__author">@${escapeHtml(news.author)}</span>
        </div>
        <h3 class="news-commit-row__title">${escapeHtml(title)}</h3>
      </div>
      <time class="news-commit-row__date">${escapeHtml(news.date)}</time>
    </div>
  `;
}
