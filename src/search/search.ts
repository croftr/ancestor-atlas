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

const orderCache = new WeakMap<FeatureProps[], FeatureProps[]>();

/**
 * The order prev/next steps through an entity's features: chronological, then west to east so
 * same-dated sites sweep across the map instead of hopping around. Cached per features array.
 */
export function navOrder(
  features: FeatureProps[],
  bboxOf: Map<string, [number, number, number, number]>,
): FeatureProps[] {
  let order = orderCache.get(features);
  if (!order) {
    const lon = (f: FeatureProps) => bboxOf.get(f.id)?.[0] ?? 0;
    order = [...features].sort((a, b) => a.start_year - b.start_year || lon(a) - lon(b) || a.id.localeCompare(b.id));
    orderCache.set(features, order);
  }
  return order;
}

/** A named place on the globe: every site with the same label within a few km, across entities. */
export interface Place {
  label: string;
  norm: string;
  /** The place's sites, oldest first. */
  features: FeatureProps[];
  /** Names of the entities found there, oldest first, without repeats. */
  entities: string[];
}

/**
 * Index the site labels (species, culture and event points; civilization territories are named
 * after their entity, which the entity search finds already). Sites sharing a label within about
 * 5 km are one place, so "Denisova Cave" lists Denisovans and Neanderthals together.
 */
export function buildPlaceIndex(
  features: FeatureProps[],
  entityName: (id: string) => string | undefined,
  bboxOf: Map<string, [number, number, number, number]>,
): Place[] {
  const byKey = new Map<string, Place>();
  for (const f of features) {
    if (f.category === "civilization" || !f.label) continue;
    const b = bboxOf.get(f.id);
    if (!b) continue;
    const norm = normalize(f.label);
    const key = `${norm}|${Math.round(b[0] * 20)}|${Math.round(b[1] * 20)}`;
    let p = byKey.get(key);
    if (!p) byKey.set(key, (p = { label: f.label, norm, features: [], entities: [] }));
    p.features.push(f);
  }
  const places = [...byKey.values()];
  for (const p of places) {
    p.features.sort((a, b) => a.start_year - b.start_year);
    p.entities = [...new Set(p.features.map((f) => entityName(f.entity_id)).filter((n): n is string => !!n))];
  }
  return places;
}

/**
 * Match place labels, ranked as `searchEntities`. Substring matches need 3+ letters, so a short
 * query ("ur") doesn't list every site with those letters inside a word.
 */
export function searchPlaces(places: Place[], query: string, limit = 8): Place[] {
  const q = normalize(query);
  if (!q) return [];
  const qWords = words(q);
  const hits: { p: Place; s: number }[] = [];
  for (const p of places) {
    const s = score(p.norm, q, qWords);
    if (s !== null && (s < 3 || q.length >= 3)) hits.push({ p, s });
  }
  hits.sort((a, b) => a.s - b.s || a.p.norm.length - b.p.norm.length || a.p.features[0].start_year - b.p.features[0].start_year);
  return hits.slice(0, limit).map((h) => h.p);
}
