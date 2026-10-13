import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TOURS, announcementText } from "./tours";
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
    // A changed title or blurb leaves the recording behind (npm run audio:narrate -- --stale re-records it).
    if (tour.announcement.text_hash !== textHash(announcementText(tour)))
      console.warn(`tour ${tour.id}: the announcement no longer matches its title and blurb`);
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
});
