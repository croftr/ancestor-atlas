import type { Data } from "../map/data";
import { pictureOf, type Picture } from "../browse/browse";
import { bestYear } from "../search/search";
import { snapYear, yearToPos } from "../time/scale";
import type { Entity } from "../types";
import type { Tour, TourStop } from "./tours";

/** Seconds a card stays up: about reading speed for its description, within 8–22 s. */
export function holdSeconds(stop: TourStop, description: string): number {
  if (stop.hold) return stop.hold;
  const words = description.split(/\s+/).filter(Boolean).length;
  return Math.min(22, Math.max(8, 4 + words / 4.5));
}

export function stopYear(stop: TourStop, d: Data): number | null {
  const e = d.entityById.get(stop.entity);
  if (!e) return null;
  return snapYear(stop.year ?? e.year ?? bestYear(d.featuresOf.get(stop.entity) ?? [])?.year ?? e.start_year);
}

/** Rough running time of a tour in minutes: the title card, the holds and the slider travel between stops. */
export function minutes(tour: Tour, d: Data): number {
  let ms = 8_000;
  let pos = 0;
  for (const stop of tour.stops) {
    const e = d.entityById.get(stop.entity);
    const y = stopYear(stop, d);
    if (!e || y === null) continue;
    ms += holdSeconds(stop, e.description) * 1000;
    const to = yearToPos(y);
    if (to > pos) ms += Math.min(6000, Math.max(1500, (to - pos) * 60_000));
    pos = to;
  }
  return Math.max(1, Math.round(ms / 60_000));
}

export interface StopSummary {
  index: number;
  entity: Entity;
  year: number | null;
  picture?: Picture;
}

/** A tour's stops with their entity, year and picture (stops whose entity is missing are left out). */
export function stopsOf(tour: Tour, d: Data): StopSummary[] {
  return tour.stops.flatMap((stop, index) => {
    const entity = d.entityById.get(stop.entity);
    return entity ? [{ index, entity, year: stopYear(stop, d), picture: pictureOf(entity, d) }] : [];
  });
}

/** Up to `n` pictures spread evenly through the tour (first and last included; just the first for n = 1), for its cover. */
export function coverPictures(stops: StopSummary[], n = 4): StopSummary[] {
  const pictured = stops.filter((s) => s.picture);
  if (pictured.length <= n || n <= 1) return pictured.slice(0, n);
  return Array.from({ length: n }, (_, i) => pictured[Math.round((i * (pictured.length - 1)) / (n - 1))]);
}

/** Whether every stop of the tour has a narration. */
export const narrated = (stops: StopSummary[]) => stops.length > 0 && stops.every((s) => s.entity.narration);
