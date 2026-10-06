import { describe, expect, it } from "vitest";
import { bestYear, buildIndex, normalize, searchEntities } from "./search";
import { unionBBox } from "../map/data";
import type { Entity, FeatureProps } from "../types";

const ent = (id: string, name: string, start = 0): Entity => ({
  id, name, category: "civilization", start_year: start, end_year: start + 100, description: "", source_ids: [],
});

const index = buildIndex([
  ent("rome-emp", "Roman Empire", -26),
  ent("rome-rep", "Roman Republic", -508),
  ent("rome", "Rome", -752),
  ent("hs", "Homo sapiens", -300_000),
  ent("catal", "Çatalhöyük", -7_100),
  ent("egypt-ok", "Egypt Old Kingdom", -2_685),
]);
const names = (q: string) => searchEntities(index, q).map((e) => e.id);

describe("searchEntities", () => {
  it("ranks exact, then prefix (shorter first), then word prefix, then substring", () => {
    expect(names("rome")).toEqual(["rome"]);
    expect(names("rom")).toEqual(["rome", "rome-emp", "rome-rep"]);
    expect(names("sapiens")).toEqual(["hs"]);
    expect(names("old egy")).toEqual(["egypt-ok"]);
    expect(names("apien")).toEqual(["hs"]);
  });
  it("ignores case and accents", () => {
    expect(normalize("Çatalhöyük")).toBe("catalhoyuk");
    expect(names("CATAL")).toEqual(["catal"]);
  });
  it("returns nothing for blank queries", () => {
    expect(names("  ")).toEqual([]);
  });
});

const feat = (id: string, start: number, end: number): FeatureProps => ({
  id, entity_id: "x", category: "species", start_year: start, end_year: end, source_id: "s",
});

describe("bestYear", () => {
  it("picks the year with the most simultaneous features, earliest on ties", () => {
    const fs = [feat("a", -2_000_000, -1_500_000), feat("b", -1_800_000, -1_000_000), feat("c", -1_700_000, -1_600_000)];
    const r = bestYear(fs)!;
    expect(r.active.map((f) => f.id)).toEqual(["a", "b", "c"]);
    expect(r.year).toBeGreaterThanOrEqual(-1_700_000);
    expect(r.year).toBeLessThanOrEqual(-1_600_000);
  });
  it("lands inside a single feature", () => {
    const r = bestYear([feat("a", -2_349, -2_154)])!;
    expect(r.year).toBeGreaterThanOrEqual(-2_349);
    expect(r.year).toBeLessThanOrEqual(-2_154);
  });
});

describe("unionBBox", () => {
  it("takes the narrow way across the antimeridian", () => {
    expect(unionBBox([[170, 0, 175, 5], [-178, -2, -170, 1]])).toEqual([170, -2, 190, 5]);
  });
  it("keeps ordinary boxes as they are", () => {
    expect(unionBBox([[10, 0, 20, 5], [-5, -2, 0, 1]])).toEqual([-5, -2, 20, 5]);
  });
});
