import { describe, expect, it } from "vitest";
import { SKY_EVENTS, skyAt, skyShownAt } from "./sky";
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
      const stops = new Set<number>();
      for (let y = e.start_year - 100_000; y <= e.end_year + 100_000; y += 5) stops.add(snapYear(y));
      expect([...stops].some((y) => skyShownAt(e, y))).toBe(true);
    });
  }

  it("never shows two things of one kind at once (they share a place in the sky)", () => {
    for (let y = snapYear(MIN_YEAR); y < MAX_YEAR; y = stepYear(y, 1)) {
      const now = skyAt(y);
      for (const kind of ["supernova", "comet"]) expect(now.filter((e) => e.kind === kind).length, `${kind} at ${y}`).toBeLessThanOrEqual(1);
    }
  });

  it("shows a comet at its own stop, not at the next Halley return", () => {
    expect(skyAt(-239).map((e) => e.id)).toEqual(["halley-240-bce"]);
    expect(skyAt(-199)).toEqual([]);
  });
});
