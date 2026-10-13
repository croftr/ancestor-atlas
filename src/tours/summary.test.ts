import { describe, expect, it } from "vitest";
import type { Entity } from "../types";
import { coverPictures, type StopSummary } from "./summary";

const stop = (index: number, pictured = true): StopSummary => ({
  index,
  entity: { id: `e${index}` } as Entity,
  year: null,
  picture: pictured ? { url: `/p${index}.webp` } : undefined,
});

describe("coverPictures", () => {
  const stops = Array.from({ length: 10 }, (_, i) => stop(i, i !== 0));
  it("spreads the pictures through the tour, first and last included", () => {
    expect(coverPictures(stops).map((s) => s.index)).toEqual([1, 4, 6, 9]);
  });
  it("gives the first picture for one", () => {
    expect(coverPictures(stops, 1).map((s) => s.index)).toEqual([1]);
  });
  it("gives all of them when there are few", () => {
    expect(coverPictures(stops.slice(0, 3)).map((s) => s.index)).toEqual([1, 2]);
  });
});
