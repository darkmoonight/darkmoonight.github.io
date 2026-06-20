import mockups from "../data/project-mockups.json";
import type { Language } from "./i18n";

const MOCKUP_PREFIX = "projectDetail.mockup";

type LocaleText = { en: string; ru: string };
type Translator = (key: string) => string;

export type IkmsClass = {
  sub: string;
  room: string;
  prof: string;
  time: string;
  color: string;
};

export type MockupKv = { label: string; value: string };
export type MockupMetric = { label: string; value: string; id?: string };

export type ZestCategory = {
  label: string;
  icon?: string;
  count: number;
  tone: string;
};

export type ZestTask = {
  title: string;
  due: string;
  priority: string;
  priorityTone?: "success" | "warn";
  done: boolean;
};

export type RainHour = {
  time: string;
  temp: string;
  tempShort: string;
  feels: string;
  high: string;
  low: string;
  status: string;
  icon: string;
  humid: string;
  wind: string;
  barom: string;
  uv: string;
  vis: string;
  precip: string;
  active?: boolean;
};

export type RainOutlookRow = {
  day: string;
  icon: string;
  temps: string;
  precip: string;
};

function mt(t: Translator, key: string): string {
  return t(`${MOCKUP_PREFIX}.${key}`);
}

function pickLocale(lang: Language, text: LocaleText): string {
  return text[lang] ?? text.en;
}

function resolveKvList(
  t: Translator,
  rows: { labelKey: string; valueKey: string }[],
): MockupKv[] {
  return rows.map((row) => ({
    label: mt(t, row.labelKey),
    value: mt(t, row.valueKey),
  }));
}

function resolveMetrics(
  t: Translator,
  rows: {
    labelKey: string;
    valueKey?: string;
    value?: string;
    valueId?: string;
  }[],
): MockupMetric[] {
  return rows.map((row) => ({
    label: mt(t, row.labelKey),
    value: row.valueKey ? mt(t, row.valueKey) : (row.value ?? ""),
    id: row.valueId,
  }));
}

export function getIkmsSchedule(lang: Language): Record<string, IkmsClass[]> {
  const schedule = mockups.ikms.schedule;
  return Object.fromEntries(
    Object.entries(schedule).map(([day, locales]) => [day, locales[lang]]),
  );
}

export function hasProjectMockup(projectId: string): boolean {
  return projectId in mockups;
}

export function getZestMockup(lang: Language, t: Translator) {
  const data = mockups.zest;
  return {
    categories: data.categories.map((cat) => ({
      label:
        "labelKey" in cat
          ? mt(t, (cat as { labelKey: string }).labelKey)
          : pickLocale(lang, cat.label as LocaleText),
      icon: "icon" in cat ? cat.icon : undefined,
      count: cat.count,
      tone: cat.tone,
    })) satisfies ZestCategory[],
    tasks: data.tasks.map((task) => ({
      title: pickLocale(lang, task.title),
      due: mt(t, task.dueKey),
      priority: mt(t, task.priorityKey),
      priorityTone: task.priorityTone as ZestTask["priorityTone"],
      done: task.done,
    })) satisfies ZestTask[],
    heatmap: data.heatmap,
    metrics: resolveMetrics(t, data.metrics),
    settings: resolveKvList(t, data.settings),
  };
}

export function getRainMockup(t: Translator) {
  const data = mockups.rain;
  const hours: RainHour[] = data.hours.map((hour) => ({
    time: hour.time,
    temp: hour.temp,
    tempShort: hour.tempShort,
    feels: hour.feels,
    high: hour.high,
    low: hour.low,
    status: mt(t, hour.statusKey),
    icon: hour.icon,
    humid: hour.humid,
    wind: hour.wind,
    barom: hour.barom,
    uv: hour.uv,
    vis: hour.vis,
    precip: hour.precip,
    active: hour.active,
  }));

  const defaultHour = hours.find((h) => h.active) ?? hours[0];

  const statLabels = Object.fromEntries(
    data.statKeys.map((key) => [key, mt(t, key)]),
  ) as Record<string, string>;

  const outlook: RainOutlookRow[] = data.outlook.map((row) => ({
    day: mt(t, row.dayKey),
    icon: row.icon,
    temps: `${row.high}° / ${row.low}°`,
    precip: row.precip,
  }));

  return {
    hours,
    defaultHour,
    statLabels,
    outlook,
    settings: resolveKvList(t, data.settings),
    feelsLike: mt(t, "feelsLike").replace("{temp}", defaultHour.feels),
    todayRange: mt(t, "todayRange")
      .replace("{high}", defaultHour.high)
      .replace("{low}", defaultHour.low),
  };
}

export function getIkmsMockup(lang: Language, t: Translator) {
  const data = mockups.ikms;
  const schedule = getIkmsSchedule(lang);
  const monClasses = schedule.mon ?? [];

  return {
    schedule,
    days: data.days.map((day) => ({
      id: day.id,
      label: mt(t, day.labelKey),
    })),
    initialClasses: monClasses,
    initialClassCount: monClasses.length,
    nextClass: monClasses[0],
    weekBars: data.weekBars.map((bar) => ({
      label: mt(t, bar.labelKey),
      value: mt(t, bar.valueKey),
      fill: bar.fill,
    })),
    statsCourses: data.statsCourses.map((key) => mt(t, key)).join(" · "),
    settings: resolveKvList(t, data.settings),
  };
}
