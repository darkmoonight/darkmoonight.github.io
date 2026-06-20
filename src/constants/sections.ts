export const HOME_SECTION_IDS = [
  "hero",
  "about",
  "projects",
  "news",
  // "donations",
  "contacts",
] as const;

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

export const NAV_I18N_KEYS: Record<
  HomeSectionId,
  { file: string; desc: string }
> = {
  hero: { file: "nav.home", desc: "nav.homeDesc" },
  about: { file: "nav.about", desc: "nav.aboutDesc" },
  projects: { file: "nav.projects", desc: "nav.projectsDesc" },
  news: { file: "nav.news", desc: "nav.newsDesc" },
  // donations: { file: "nav.donations", desc: "nav.donationsDesc" },
  contacts: { file: "nav.contacts", desc: "nav.contactsDesc" },
};

export function sectionHash(id: HomeSectionId): string {
  return `#${id}`;
}
