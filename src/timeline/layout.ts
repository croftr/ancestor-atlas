import { type Category, type Entity } from "../types";

/** Lane order on the timeline: events first, as markers over the rest. */
export const LANE_ORDER: Category[] = ["event", "species", "culture", "civilization"];

/**
 * Pure helpers for the timeline page: the zoomable linear time window, axis ticks, duration text
 * and the row list (lanes, umbrella groups, children). Years are astronomical (1 CE = 1).
 */

/** Visible time window, in astronomical years, start < end. */
export interface Window {
  start: number;
  end: number;
}

/** The axis stops at 1 CE, like the data. */
export const AXIS_END = 1;
/** Narrowest window (years); below this there is nothing in the data to see. */
export const MIN_SPAN = 40;

/** Furthest-back start the window may reach: the oldest entity plus a small margin. */
export function axisStart(entities: Entity[]): number {
  const oldest = Math.min(...entities.map((e) => e.start_year));
  return Math.floor(oldest - (AXIS_END - oldest) * 0.02);
}

/** Keep the window inside [min, AXIS_END] and at least MIN_SPAN wide, preserving its span where possible. */
export function clampWindow(w: Window, min: number): Window {
  const full = AXIS_END - min;
  const span = Math.min(full, Math.max(MIN_SPAN, w.end - w.start));
  let start = w.start;
  if (w.end - w.start < MIN_SPAN) start = (w.start + w.end) / 2 - span / 2;
  start = Math.max(min, Math.min(AXIS_END - span, start));
  return { start, end: start + span };
}

/** Zoom by `factor` (< 1 zooms in) keeping the year at fraction `at` (0–1 across the track) fixed. */
export function zoomWindow(w: Window, factor: number, at: number, min: number): Window {
  const span = w.end - w.start;
  const pivot = w.start + span * at;
  const next = span * factor;
  return clampWindow({ start: pivot - next * at, end: pivot - next * at + next }, min);
}

/** Shift the window by `years` (positive moves later in time). */
export const panWindow = (w: Window, years: number, min: number): Window =>
  clampWindow({ start: w.start + years, end: w.end + years }, min);

/** Window that shows [start, end] with a margin on each side. */
export function fitWindow(start: number, end: number, min: number, margin = 0.06): Window {
  const span = Math.max(end - start, MIN_SPAN * 0.5);
  return clampWindow({ start: start - span * margin, end: end + span * margin }, min);
}

// ---- Eras ---------------------------------------------------------------------------------------

export interface Era {
  label: string;
  start: number;
  end: number;
}

/** Fallback for "first-civilization" before the data has loaded. */
const FIRST_CIVILIZATION_FALLBACK = 1 - 3_500;

/**
 * Contiguous eras from their start years (oldest first). A `null` start means the axis start;
 * "first-civilization" means `firstCivilization` (the earliest civilization's start year).
 */
export function resolveEras(
  defs: { label: string; start: number | null | "first-civilization" }[],
  min: number,
  firstCivilization?: number,
): Era[] {
  const startOf = (d: (typeof defs)[number]) =>
    d.start === null ? min : d.start === "first-civilization" ? (firstCivilization ?? FIRST_CIVILIZATION_FALLBACK) : d.start;
  return defs.map((d, i) => ({
    label: d.label,
    start: startOf(d),
    end: i + 1 < defs.length ? startOf(defs[i + 1]) : AXIS_END,
  }));
}

/** Index of the era containing the middle of the window. */
export function eraIndexOf(eras: Era[], w: Window): number {
  const mid = (w.start + w.end) / 2;
  const i = eras.findIndex((e) => mid < e.end);
  return i < 0 ? eras.length - 1 : i;
}

/** The window shows exactly this era (to within a year). */
export const isEraWindow = (era: Era, w: Window) =>
  Math.abs(era.start - w.start) < 1 && Math.abs(era.end - w.end) < 1;

/**
 * Era the Earlier (-1) / Later (1) button goes to: the neighbour of the era the window is in.
 * From a zoomed-in view at either end it first snaps to that end's era. Null when there is
 * nowhere further to go.
 */
export function stepEra(eras: Era[], w: Window, dir: 1 | -1): Era | null {
  const k = eraIndexOf(eras, w);
  const target = Math.min(eras.length - 1, Math.max(0, k + dir));
  return isEraWindow(eras[target], w) ? null : eras[target];
}

/** Overlaps the window by more than a touch (an entity ending exactly at an era boundary is not in the next era). */
export const overlaps = (e: { start_year: number; end_year: number }, w: Window) =>
  // Something that only begins at 1 CE, where the axis ends, still shows in the last era.
  (e.start_year < w.end || (w.end >= AXIS_END && e.start_year >= AXIS_END)) && e.end_year > w.start;

// ---- Axis ticks ---------------------------------------------------------------------------------

/** Round tick step (1, 2 or 5 × 10^n years) giving about `count` ticks over `span`. */
export function tickStep(span: number, count: number): number {
  const raw = span / Math.max(1, count);
  const pow = 10 ** Math.floor(Math.log10(raw));
  const m = raw / pow;
  return (m > 5 ? 10 : m > 2 ? 5 : m > 1 ? 2 : 1) * pow;
}

/**
 * Tick years inside the window, placed at round numbers of years *before* 1 CE (so labels read
 * "3,000 BCE", not "2,999 BCE").
 */
export function ticks(w: Window, count: number): number[] {
  const step = tickStep(w.end - w.start, count);
  // In "years before 1 CE" (b = 1 - year) the window runs from bHigh down to bLow.
  const bHigh = 1 - w.start;
  const bLow = 1 - w.end;
  const out: number[] = [];
  for (let b = Math.floor(bHigh / step) * step; b >= bLow - 1e-9; b -= step) {
    if (b <= bHigh + 1e-9) out.push(1 - b);
  }
  return out;
}

const trim = (x: number) => +x.toFixed(2);

/** Short axis label in plain words, as on the time slider: "2.5M yrs ago", "300k yrs ago", "3,000 BCE". */
export function tickLabel(year: number, step: number): string {
  const b = 1 - year;
  if (b <= 0) return `${year} CE`;
  if (b >= 1_000_000 && step >= 10_000) return `${trim(b / 1e6)}M yrs ago`;
  if (b >= 100_000 && step >= 1_000) return `${trim(b / 1e3)}k yrs ago`;
  return `${Math.round(b).toLocaleString("en-US")} BCE`;
}

/**
 * Duration rounded to what the dates can support: whole years under a century, then tens of
 * years, then thousands from 10,000 years. Drawn bars and the tooltip use the same rounding.
 */
export function roundDuration(years: number): number {
  const y = Math.max(0, Math.round(years));
  if (y >= 1_000_000) return Math.round(y / 10_000) * 10_000;
  if (y >= 10_000) return Math.round(y / 1_000) * 1_000;
  if (y >= 100) return Math.round(y / 10) * 10;
  return y;
}

/** How long something lasted, in plain words: "1.91 million years", "430,000 years", "165 years". */
export function formatDuration(years: number): string {
  const y = roundDuration(years);
  if (y >= 1_000_000) return `${trim(y / 1e6)} million years`;
  if (y === 0) return "under a year";
  return `${y.toLocaleString("en-US")} year${y === 1 ? "" : "s"}`;
}

/** Compact duration for drawing on a bar: "1.91M yrs", "430k yrs", "1,150 yrs". */
export function shortDuration(years: number): string {
  const y = roundDuration(years);
  if (y >= 1_000_000) return `${trim(y / 1e6)}M yrs`;
  if (y >= 10_000) return `${Math.round(y / 1000)}k yrs`;
  return `${y.toLocaleString("en-US")} yr${y === 1 ? "" : "s"}`;
}

// ---- Rows ---------------------------------------------------------------------------------------

export type Row =
  | {
      kind: "lane";
      category: Category;
      /** Entities in the lane (groups count once, children not separately). */
      total: number;
      inView: number;
      start: number;
      end: number;
      collapsed: boolean;
      /** Too narrow to read at this zoom: its rows are left out and the lane offers to zoom in. */
      squashed: boolean;
    }
  | {
      kind: "entity";
      entity: Entity;
      /** 1 for a child shown under its expanded group. */
      depth: 0 | 1;
      /** Group rows: number of children and whether they are shown. */
      children?: number;
      expanded?: boolean;
    };

export interface RowOptions {
  window: Window;
  collapsedLanes: ReadonlySet<Category>;
  /** Lanes whose whole extent is too narrow to read at this zoom. */
  squashedLanes?: ReadonlySet<Category>;
  expandedGroups: ReadonlySet<string>;
}

const byStart = (a: Entity, b: Entity) => a.start_year - b.start_year || a.end_year - b.end_year;

/**
 * Lanes in category order; inside each, top-level entities (umbrella groups and entities without
 * a parent) sorted by start. Only entities overlapping the window are listed: the view is meant
 * for one stretch of time at once. An expanded group lists its children (also only those in view).
 */
export function buildRows(entities: Entity[], opts: RowOptions): Row[] {
  const children = new Map<string, Entity[]>();
  for (const e of entities) {
    if (e.parent_id) (children.get(e.parent_id) ?? children.set(e.parent_id, []).get(e.parent_id)!).push(e);
  }
  const ids = new Set(entities.map((e) => e.id));
  const rows: Row[] = [];
  for (const category of LANE_ORDER) {
    // A child whose parent is missing from the registry is shown at the top level.
    const top = entities
      .filter((e) => e.category === category && !(e.parent_id && ids.has(e.parent_id)))
      .sort(byStart);
    if (top.length === 0) continue;
    const visible = top.filter((e) => overlaps(e, opts.window));
    const collapsed = opts.collapsedLanes.has(category);
    const squashed = !collapsed && visible.length > 0 && !!opts.squashedLanes?.has(category);
    rows.push({
      kind: "lane",
      category,
      total: top.length,
      inView: visible.length,
      start: Math.min(...top.map((e) => e.start_year)),
      end: Math.max(...top.map((e) => e.end_year)),
      collapsed,
      squashed,
    });
    if (collapsed || squashed) continue;
    for (const e of visible) {
      const kids = (children.get(e.id) ?? []).sort(byStart);
      const expanded = kids.length > 0 && opts.expandedGroups.has(e.id);
      rows.push({ kind: "entity", entity: e, depth: 0, ...(kids.length > 0 && { children: kids.length, expanded }) });
      if (expanded) {
        for (const k of kids) if (overlaps(k, opts.window)) rows.push({ kind: "entity", entity: k, depth: 1 });
      }
    }
  }
  return rows;
}

/** Overall [start, end] of each lane's top-level entities. */
export function laneExtents(entities: Entity[]): Map<Category, [number, number]> {
  const m = new Map<Category, [number, number]>();
  for (const e of entities) {
    const x = m.get(e.category);
    m.set(e.category, x ? [Math.min(x[0], e.start_year), Math.max(x[1], e.end_year)] : [e.start_year, e.end_year]);
  }
  return m;
}

/**
 * Entities shown as still going on past the data's range: H. sapiens (species are only tracked
 * to 10,000 BCE) and anything that runs to the axis end at 1 CE.
 */
const STILL_LIVING = new Set(["homo-sapiens"]);
export function continuation(e: Entity): string | null {
  if (STILL_LIVING.has(e.id)) return "Still living; the atlas follows species only to 10,000 BCE";
  if (e.end_year >= AXIS_END) return "Continues past 1 CE, where the atlas ends";
  return null;
}

/** Entities whose span contains `year` (for the hover read-out); groups are not counted. */
export const aliveAt = (entities: Entity[], year: number) =>
  entities.filter((e) => !e.group && e.category !== "event" && e.start_year <= year && year <= e.end_year);

/** First sentence of a description, for tight spaces (tooltips, lists). */
export const firstSentence = (text: string) => text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text;

/** The eras for this data: the axis start and the first civilization come from the entities. */
export function erasFor(
  entities: Entity[],
  defs: { label: string; start: number | null | "first-civilization" }[],
): Era[] {
  const civs = entities.filter((e) => e.category === "civilization");
  const first = civs.length ? Math.min(...civs.map((e) => e.start_year)) : undefined;
  return resolveEras(defs, entities.length ? axisStart(entities) : -7_500_000, first);
}
