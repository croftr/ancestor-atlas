import type { Data } from "../map/data";
import type { Entity } from "../types";

/** A picture for an entity, as on the info card: its own, else its group's, else a shared stand-in. */
export interface Picture {
  url: string;
  credit?: string;
  /** Said under a picture that is not the entity's own ("Shows Ancient Egypt as a whole"). */
  note?: string;
}

export function pictureOf(entity: Entity, data: Data): Picture | undefined {
  if (entity.image_url) return { url: entity.image_url, credit: entity.image_credit };
  const parent = entity.parent_id ? data.entityById.get(entity.parent_id) : undefined;
  if (parent?.image_url) return { url: parent.image_url, credit: parent.image_credit, note: `Shows ${parent.name} as a whole` };
  const fb = entity.fallback_image;
  if (fb) return { url: fb.url, credit: fb.credit, note: `Shows ${fb.label}` };
  return undefined;
}

/** "early farming communities in general" -> "Early farming communities". */
export const stageTitle = (label: string) => {
  const t = label.replace(/\s+in general$/i, "");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** Events that name this entity (or its group) among their related entities, in date order. */
export const eventsAbout = (entity: Entity, data: Data): Entity[] =>
  data.entities
    .filter((e) => e.category === "event" && (e.related_ids ?? []).some((r) => r === entity.id || r === entity.parent_id))
    .sort((a, b) => (a.year ?? a.start_year) - (b.year ?? b.start_year));

/** Placeholder descriptions carried over from the territory data say nothing; leave them out of lists. */
export const summaryOf = (e: Entity, firstSentence: (t: string) => string) =>
  !e.description || /^aspect of history\.?$/i.test(e.description.trim()) ? "" : firstSentence(e.description);

/** Position of a span on a linear axis, as CSS percentages. */
export function barStyle(e: { start_year: number; end_year: number }, axis: [number, number]) {
  const span = Math.max(1, axis[1] - axis[0]);
  const left = ((e.start_year - axis[0]) / span) * 100;
  const width = Math.max(((e.end_year - e.start_year) / span) * 100, 0.8);
  return { left: `${Math.max(0, left)}%`, width: `${Math.min(width, 100 - Math.max(0, left))}%` };
}

/** Years marked on the Species page's time scale (those inside the species' span). */
const SCALE_YEARS = [-7_000_000, -5_000_000, -3_000_000, -2_000_000, -1_000_000, -500_000, -200_000, -100_000, -50_000];

/** "7M", "500k" (the scale's caption says "years ago"). */
export const scaleLabel = (year: number) => (-year >= 1_000_000 ? `${-year / 1_000_000}M` : `${-year / 1000}k`);

/**
 * Scale marks for a page scale (`at` gives a year's place in %), oldest first, skipping any that
 * would crowd the one before (the compressed scale bunches the millions together).
 */
export function scaleTicks(at: (year: number) => number): { y: number; x: number }[] {
  const ticks: { y: number; x: number }[] = [];
  for (const y of SCALE_YEARS) {
    const x = at(y);
    if (x >= 2 && x <= 96 && (ticks.length === 0 || x - ticks[ticks.length - 1].x >= 12)) ticks.push({ y, x });
  }
  return ticks;
}

/** Ignore page shortcuts while typing in a field. */
export const typing = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
};
