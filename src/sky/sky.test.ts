import { describe, expect, it } from "vitest";
import { SKY_EVENTS, SKY_KIND_PLURAL, SKY_PLACE, skyAt, skyShownAt, skyYear } from "./sky";
import { MAX_YEAR, MIN_YEAR, snapYear, stepYear } from "../time/scale";

describe("SKY_EVENTS", () => {
  it("have unique ids", () => {
    expect(new Set(SKY_EVENTS.map((e) => e.id)).size).toBe(SKY_EVENTS.length);
  });

  for (const e of SKY_EVENTS) {
    it(`${e.id}: inside the timeline, sourced, and shown at some stop of the slider`, () => {
      expect(e.start_year).toBeLessThanOrEqual(e.end_year);
      expect(e.start_year).toBeGreaterThanOrEqual(MIN_YEAR);
      expect(e.end_year).toBeLessThanOrEqual(MAX_YEAR);
      expect(e.source.url).toMatch(/^https:\/\//);
      expect(e.description.length).toBeGreaterThan(40);
      const stops = new Set<number>();
      for (let y = e.start_year - 100_000; y <= e.end_year + 100_000; y += 5) stops.add(snapYear(y));
      expect([...stops].some((y) => skyShownAt(e, y))).toBe(true);
      // "Show in the sky" lands on a slider stop where it shows.
      expect(snapYear(skyYear(e))).toBe(skyYear(e));
      expect(skyShownAt(e, skyYear(e))).toBe(true);
      expect(SKY_KIND_PLURAL.some(([k]) => k === e.kind)).toBe(true);
    });
  }

  it("never shows two things in one place at once (kinds can share a place in the sky)", () => {
    for (let y = snapYear(MIN_YEAR); y < MAX_YEAR; y = stepYear(y, 1)) {
      const places = skyAt(y).map((e) => SKY_PLACE[e.kind].join(","));
      expect(new Set(places).size, `at ${y}: ${skyAt(y).map((e) => e.id)}`).toBe(places.length);
    }
  });

  it("shows a comet at its own stop, not at the next Halley return", () => {
    expect(skyAt(-239).map((e) => e.id)).toEqual(["halley-240-bce"]);
    expect(skyAt(-199)).toEqual([]);
  });
});
