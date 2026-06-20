export interface HeroProjectEntry {
  id: string;
  name: string;
  version: string;
  stars: number;
  github: string;
  tagline: string;
}

export function formatHeroProjectsList(entries: HeroProjectEntry[]): string {
  return entries
    .map(
      (entry) =>
        `  * ${entry.name} ${entry.version} — ★${entry.stars} — ${entry.tagline} (${entry.github})`,
    )
    .join("\n");
}

export function buildHeroProjectEntries(
  projects: Array<{
    id: string;
    name: string;
    version: string;
    stars: number;
    github: string;
  }>,
  taglineById: Record<string, string>,
): HeroProjectEntry[] {
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    version: p.version,
    stars: p.stars,
    github: p.github,
    tagline: taglineById[p.id] ?? "",
  }));
}
