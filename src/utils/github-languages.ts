const TOP_LANG_COUNT = 4;

/** Top N languages plus an Other bucket; drift is folded into Other or the largest slice. */
export function computeLanguagePercents(
  bytes: Record<string, number>,
): Record<string, number> {
  const sorted = Object.entries(bytes)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  const total = sorted.reduce((sum, [, count]) => sum + count, 0);
  if (!total) return {};

  const top = sorted.slice(0, TOP_LANG_COUNT);
  const rest = sorted.slice(TOP_LANG_COUNT);
  const result: Record<string, number> = {};
  let assigned = 0;

  top.forEach(([lang, count], index) => {
    const isLastTop = index === top.length - 1;
    const pct =
      isLastTop && rest.length === 0
        ? Math.round((100 - assigned) * 10) / 10
        : Math.round((count / total) * 1000) / 10;
    result[lang] = pct;
    assigned += pct;
  });

  if (rest.length) {
    const restBytes = rest.reduce((sum, [, count]) => sum + count, 0);
    result.Other = Math.round((restBytes / total) * 1000) / 10;
    assigned += result.Other;
  }

  const drift = Math.round((100 - assigned) * 10) / 10;
  if (drift !== 0 && top.length) {
    const adjustKey = rest.length ? "Other" : top[0][0];
    result[adjustKey] = Math.round((result[adjustKey] + drift) * 10) / 10;
  }

  return result;
}

export function aggregateOrgTechStack(
  repos: Array<{ stars: number; languages: Record<string, number> }>,
  limit = 4,
): string[] {
  const totals: Record<string, number> = {};

  for (const repo of repos) {
    if (!repo.languages || Object.keys(repo.languages).length === 0) continue;
    const weight = repo.stars > 0 ? repo.stars : 1;
    for (const [lang, pct] of Object.entries(repo.languages)) {
      if (lang === "Other") continue;
      totals[lang] = (totals[lang] || 0) + pct * weight;
    }
  }

  const ranked = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);

  if (ranked.length) return ranked;
  return ["Flutter", "Dart", "Astro", "Tailwind CSS"];
}
