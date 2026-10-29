import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TOURS, announcementText, toursOfEntity } from "./tours";
import { textHash } from "../../scripts/lib/text-hash";
import { isActive } from "../map/data";
import { readTourHash, tourHash } from "../globeLink";
import { snapYear } from "../time/scale";
import type { Entity, FeatureProps } from "../types";

const entities: Entity[] = JSON.parse(readFileSync("public/data/entities.json", "utf8"));
const features: FeatureProps[] = JSON.parse(readFileSync("public/data/features.geojson", "utf8")).features.map(
  (f: { properties: FeatureProps }) => f.properties,
);
const byId = new Map(entities.map((e) => [e.id, e]));

describe.each(TOURS)("tour $id", (tour) => {
  it("has a unique id and stops", () => {
    expect(TOURS.filter((t) => t.id === tour.id)).toHaveLength(1);
    expect(tour.stops.length).toBeGreaterThan(0);
  });

  it.each(tour.stops)("$entity is on the globe when the tour stops there", (stop) => {
    const e = byId.get(stop.entity);
    expect(e).toBeDefined();
    expect(tour.layers ?? [e!.category]).toContain(e!.category);
    const year = snapYear(stop.year ?? e!.year ?? e!.start_year);
    expect(features.some((f) => f.entity_id === stop.entity && isActive(f, year))).toBe(true);
    if (stop.site) {
      const site = features.find((f) => f.id === stop.site);
      expect(site?.entity_id).toBe(stop.entity);
      expect(isActive(site!, year)).toBe(true);
    }
  });

  it("names its music by the bucket convention, with a credit", () => {
    if (!tour.music) return;
    expect(tour.music.src).toMatch(new RegExp(`^music/tours/${tour.id}-v\\d+\\.mp3$`));
    expect(tour.music.credit).toBeTruthy();
  });

  it("names its announcement by the bucket convention, with a credit", () => {
    if (!tour.announcement) return;
    expect(tour.announcement.src).toMatch(new RegExp(`^narration/tours/${tour.id}-v\\d+\\.mp3$`));
    expect(tour.announcement.credit).toBeTruthy();
    // A changed title leaves the recording behind (npm run audio:narrate -- --stale re-records it).
    if (tour.announcement.text_hash !== textHash(announcementText(tour)))
      console.warn(`tour ${tour.id}: the announcement no longer matches its title`);
  });

  it("names its closing narration by the bucket convention, with a credit, for its closing line", () => {
    if (!tour.closingNarration) return;
    expect(tour.closing).toBeTruthy();
    expect(tour.closingNarration.src).toMatch(new RegExp(`^narration/tours/${tour.id}-closing-v\\d+\\.mp3$`));
    expect(tour.closingNarration.credit).toBeTruthy();
    // An edited closing line leaves the recording behind (npm run audio:narrate -- --stale re-records it).
    if (tour.closingNarration.text_hash !== textHash(tour.closing!))
      console.warn(`tour ${tour.id}: the closing narration no longer matches its closing line`);
  });

  it("as a book tour, has a synopsis and book stops with their text", () => {
    if (!tour.book) {
      expect(tour.synopsis ?? tour.stops.find((s) => s.note)).toBeUndefined();
      return;
    }
    expect(tour.book.link).toMatch(/^https:\/\//);
    expect(tour.synopsis).toBeTruthy();
    expect(tour.stops.some((s) => s.note)).toBe(true);
    for (const stop of tour.stops) if (stop.note) expect(stop.note.text, stop.entity).toBeTruthy();
    if (tour.book.cover) expect(existsSync(`public${tour.book.cover.url}`), tour.book.cover.url).toBe(true);
    for (const img of tour.stops.flatMap((s) => s.note?.images ?? [])) {
      expect(existsSync(`public${img.url}`), img.url).toBe(true);
      expect(img.credit && img.caption && img.source, img.url).toBeTruthy();
    }
    for (const narration of [tour.synopsisNarration, ...tour.stops.map((s) => s.note?.narration)])
      if (narration) expect(narration.src).toMatch(new RegExp(`^narration/books/${tour.id}/[\\w-]+-v\\d+\\.mp3$`));
  });

  it("runs oldest first", () => {
    const years = tour.stops.map((s) => s.year ?? byId.get(s.entity)?.year ?? 0);
    expect(years).toEqual([...years].sort((a, b) => a - b));
  });
});

describe("tour links", () => {
  it("reads back what it writes", () => {
    expect(readTourHash(tourHash("events-and-inventions"))).toBe("events-and-inventions");
    expect(readTourHash("#/?year=1")).toBeNull();
  });

  it("finds all tours that stop at an entity with their 0-based stop index", () => {
    const sapiens = toursOfEntity("homo-sapiens");
    expect(sapiens.map((r) => ({ id: r.tour.id, index: r.index }))).toEqual([
      { id: "human-evolution", index: 11 },
      { id: "out-of-africa", index: 1 },
    ]);
    expect(toursOfEntity("not-an-entity")).toEqual([]);
  });
});
