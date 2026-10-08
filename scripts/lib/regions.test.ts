import { describe, expect, it } from "vitest";
import { addAreas, regionAreas, regionAt, REGIONS, topRegion } from "./regions";

const box = (x0: number, y0: number, x1: number, y1: number) => ({
  type: "Polygon",
  coordinates: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]],
});

describe("regionAt", () => {
  it("places points by country and UN subregion", () => {
    expect(regionAt(44, 33)).toBe("Near East"); // Iraq
    expect(regionAt(31, 26)).toBe("Egypt & North Africa");
    expect(regionAt(12, 42)).toBe("Mediterranean Europe");
    expect(regionAt(116, 35)).toBe("East Asia");
    expect(regionAt(-90, 17)).toBe("Mexico & Central America");
  });
  it("puts Iran with Central Asia, not South Asia", () => {
    expect(regionAt(53, 32)).toBe("Iran & Central Asia");
    expect(regionAt(77, 23)).toBe("South Asia");
  });
  it("returns null at sea", () => {
    expect(regionAt(-30, 30)).toBeNull();
  });
  it("lists each region once", () => {
    expect(new Set(REGIONS).size).toBe(REGIONS.length);
  });
});

describe("regionAreas", () => {
  it("splits a territory across the regions it covers", () => {
    // Mostly Iraq and Syria, with a strip of western Iran.
    const top = topRegion(regionAreas(box(38, 31, 47, 37)));
    expect(top?.region).toBe("Near East");
    expect(top!.share).toBeGreaterThan(0.5);
  });
  it("leaves out holes", () => {
    const withHole = {
      type: "Polygon",
      coordinates: [box(20, 20, 40, 40).coordinates[0], [[25, 25], [35, 25], [35, 35], [25, 35], [25, 25]]],
    };
    const total = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);
    expect(total(regionAreas(withHole))).toBeLessThan(total(regionAreas(box(20, 20, 40, 40))));
  });
  it("still places a tiny island", () => {
    expect(topRegion(regionAreas(box(25.1, 35.3, 25.12, 35.32)))?.region).toBe("Mediterranean Europe"); // Crete
  });
});

describe("topRegion", () => {
  it("weights by duration when areas are added", () => {
    const m = new Map<string, number>();
    addAreas(m, new Map([["Near East", 1]]), 100);
    addAreas(m, new Map([["East Asia", 3]]), 10);
    expect(topRegion(m)).toEqual({ region: "Near East", share: 100 / 130 });
  });
  it("is undefined for nothing", () => {
    expect(topRegion(new Map())).toBeUndefined();
  });
});
