import type { Entity, FeatureProps } from "../types";
import { snapYear, stepYear } from "../time/scale";

/** Lower-case and strip accents so "Çatalhöyük" matches "catalhoyuk". */
export const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const words = (s: string) => s.split(/[^a-z0-9]+/).filter(Boolean);

/** Lower is better; null = no match. */
function score(name: string, q: string, qWords: string[]): number | null {
  if (name === q) return 0;
  if (name.startsWith(q)) return 1;
  const nWords = words(name);
  if (qWords.length > 0 && qWords.every((qw) => nWords.some((nw) => nw.startsWith(qw)))) return 2;
  if (name.includes(q)) return 3;
  return null;
}

export interface SearchIndexEntry {
  entity: Entity;
  norm: string;
}

export const buildIndex = (entities: Entity[]): SearchIndexEntry[] =>
  entities.map((entity) => ({ entity, norm: normalize(entity.name) }));

/** Match entity names only. Ranked exact > prefix > word-prefix > substring, then shorter name, then older. */
export function searchEntities(index: SearchIndexEntry[], query: string, limit = 8): Entity[] {
  const q = normalize(query);
  if (!q) return [];
  const qWords = words(q);
  const hits: { e: Entity; s: number; len: number }[] = [];
  for (const { entity, norm } of index) {
    const s = score(norm, q, qWords);
    if (s !== null) hits.push({ e: entity, s, len: norm.length });
  }
  hits.sort((a, b) => a.s - b.s || a.len - b.len || a.e.start_year - b.e.start_year);
  return hits.slice(0, limit).map((h) => h.e);
}

/** A slider position inside the feature's span (the slider only lands on stepped years). */
export function sliderYearFor(f: { start_year: number; end_year: number }): number {
  let year = snapYear(f.start_year);
  if (year < f.start_year) year = stepYear(year, 1);
  if (year > f.end_year) year = f.start_year; // very short feature between slider steps
  return year;
}

const active = (f: FeatureProps, y: number) => f.start_year <= y && y <= f.end_year;

/**
 * The slider year at which the most of these features are on the map at once (earliest on ties),
 * and those features. Features should be sorted by start year.
 */
export function bestYear(features: FeatureProps[]): { year: number; active: FeatureProps[] } | null {
  let best: { year: number; active: FeatureProps[] } | null = null;
  for (const f of features) {
    const year = sliderYearFor(f);
    const on = features.filter((g) => active(g, year));
    if (!best || on.length > best.active.length) best = { year, active: on };
  }
  return best;
}
