import type { Data } from "../map/data";
import { pictureOf, type Picture } from "../browse/browse";
import { bestYear } from "../search/search";
import { skyById, skyYear, type SkyEvent } from "../sky/sky";
import { snapYear, yearToPos } from "../time/scale";
import type { Entity } from "../types";
import type { Tour, TourStop } from "./tours";

/** Seconds a card stays up: about reading speed for its description, within 8–22 s. */
export function holdSeconds(stop: TourStop, description: string): number {
  if (stop.hold) return stop.hold;
  const words = description.split(/\s+/).filter(Boolean).length;
  return Math.min(22, Math.max(8, 4 + words / 4.5));
}

/** Seconds to read a book tour's note or synopsis without narration: about 200 words a minute, within 7–40 s. */
export function readingSeconds(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.min(40, Math.max(7, 3 + words / 3.3));
}

/** What a stop is called: the entity or sky object, or for a book stop its note's title, else its place (site), else the entity. */
export function stopName(stop: TourStop, d: Data): string {
  const sky = skyById(stop.entity);
  const name = sky?.name ?? d.entityById.get(stop.entity)?.name ?? "";
  if (!stop.note) return name;
  return stop.note.title ?? (stop.site ? d.featureById.get(stop.site)?.label : undefined) ?? name;
}

export function stopYear(stop: TourStop, d: Data): number | null {
  const sky = skyById(stop.entity);
  if (sky) return stop.year !== undefined ? snapYear(stop.year) : skyYear(sky);
  const e = d.entityById.get(stop.entity);
  if (!e) return null;
  return snapYear(stop.year ?? e.year ?? bestYear(d.featuresOf.get(stop.entity) ?? [])?.year ?? e.start_year);
}

/** Rough running time of a tour in minutes: the title card, the holds and the slider travel between stops. */
export function minutes(tour: Tour, d: Data): number {
  let ms = tour.synopsis ? Math.max(8, readingSeconds(tour.synopsis)) * 1000 : 8_000;
  let pos = 0;
  for (const stop of tour.stops) {
    const item = skyById(stop.entity) ?? d.entityById.get(stop.entity);
    const y = stopYear(stop, d);
    if (!item || y === null) continue;
    ms += (stop.note ? readingSeconds(stop.note.text) : holdSeconds(stop, item.description)) * 1000;
    const to = yearToPos(y);
    if (to > pos) ms += Math.min(6000, Math.max(1500, (to - pos) * 60_000));
    pos = to;
  }
  return Math.max(1, Math.round(ms / 60_000));
}

export interface StopSummary {
  index: number;
  entity?: Entity;
  sky?: SkyEvent;
  /** What the stop is called: the entity or sky object, or for a book stop the place (its site) it is about. */
  name: string;
  /** A book stop: the book's note on a place, not the entity's card. */
  book: boolean;
  /** The stop is read out (the entity's or sky object's narration, or the note's). */
  narrated: boolean;
  year: number | null;
  picture?: Picture;
}

/**
 * A tour's stops with their entity (or sky object), name, year and picture (stops whose entity is missing are left out). A
 * book stop is named for its place and shows its note's first picture of it.
 */
export function stopsOf(tour: Tour, d: Data): StopSummary[] {
  return tour.stops.flatMap((stop, index) => {
    const sky = skyById(stop.entity);
    const entity = d.entityById.get(stop.entity);
    if (!entity && !sky) return [];
    const note = stop.note;
    const own = note?.images?.[0];
    const picture = own ? { url: own.url, credit: own.credit, note: own.caption } : entity ? pictureOf(entity, d) : undefined;
    return [{
      index,
      entity,
      sky,
      name: stopName(stop, d),
      book: !!note,
      narrated: !!(note ? note.narration : (sky ?? entity)!.narration),
      year: stopYear(stop, d),
      picture,
    }];
  });
}

/** Up to `n` pictures spread evenly through the tour (first and last included; just the first for n = 1), for its cover. */
export function coverPictures(stops: StopSummary[], n = 4): StopSummary[] {
  const pictured = stops.filter((s) => s.picture || s.sky);
  if (pictured.length <= n || n <= 1) return pictured.slice(0, n);
  return Array.from({ length: n }, (_, i) => pictured[Math.round((i * (pictured.length - 1)) / (n - 1))]);
}

/** Whether every stop of the tour has a narration. */
export const narrated = (stops: StopSummary[]) => stops.length > 0 && stops.every((s) => s.narrated);
