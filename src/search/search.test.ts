import { describe, expect, it } from "vitest";
import { bestYear, buildIndex, buildPlaceIndex, navOrder, normalize, searchEntities, searchPlaces } from "./search";
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

describe("navOrder", () => {
  it("orders by date, then west to east", () => {
    const fs = [feat("east", -5_600, -5_000), feat("late", -5_000, -4_500), feat("west", -5_600, -5_100)];
    const boxes = new Map<string, [number, number, number, number]>([
      ["east", [20, 50, 20, 50]],
      ["late", [-5, 50, -5, 50]],
      ["west", [2, 50, 2, 50]],
    ]);
    expect(navOrder(fs, boxes).map((f) => f.id)).toEqual(["west", "east", "late"]);
  });
});

describe("searchPlaces", () => {
  const site = (id: string, entity_id: string, label: string, start: number, category: FeatureProps["category"] = "species"): FeatureProps => ({
    id, entity_id, label, category, start_year: start, end_year: start + 1000, source_id: "x",
  });
  const features = [
    site("den@1", "denisovan", "Denisova Cave", -200_000),
    site("nea@1", "neanderthal", "Denisova Cave", -250_000),
    site("nea@far", "neanderthal", "Denisova Cave", -100_000), // same label, far away: another place
    site("pb@1", "boisei", "Olduvai Gorge", -1_800_000),
    site("ur@1", "ubaid", "Tell Uruk", -5_000, "culture"),
    site("civ@1", "rome", "Roman Empire", -26, "civilization"),
  ];
  const bbox = new Map<string, [number, number, number, number]>([
    ["den@1", [84.68, 51.4, 84.68, 51.4]],
    ["nea@1", [84.69, 51.41, 84.69, 51.41]],
    ["nea@far", [10, 50, 10, 50]],
    ["pb@1", [35.35, -2.99, 35.35, -2.99]],
    ["ur@1", [45.6, 31.3, 45.6, 31.3]],
    ["civ@1", [0, 40, 20, 50]],
  ]);
  const names: Record<string, string> = { denisovan: "Denisovans", neanderthal: "Neanderthal", boisei: "P. boisei", ubaid: "Ubaid" };
  const places = buildPlaceIndex(features, (id) => names[id], bbox);

  it("joins sites with one label at one spot, oldest first, and leaves territories out", () => {
    const den = searchPlaces(places, "denisova");
    expect(den.map((p) => p.features.map((f) => f.id))).toEqual([["nea@1", "den@1"], ["nea@far"]]);
    expect(den[0].entities).toEqual(["Neanderthal", "Denisovans"]);
    expect(searchPlaces(places, "roman")).toEqual([]);
  });
  it("finds word starts, ignores accents, and needs 3 letters for a match inside a word", () => {
    expect(searchPlaces(places, "olduvái").map((p) => p.label)).toEqual(["Olduvai Gorge"]);
    expect(searchPlaces(places, "gorge").map((p) => p.label)).toEqual(["Olduvai Gorge"]);
    expect(searchPlaces(places, "ru")).toEqual([]);
    expect(searchPlaces(places, "ruk").map((p) => p.label)).toEqual(["Tell Uruk"]);
  });
});
