import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { addHeld, heldIds, readHeld } from "../lib/held-back.ts";
import { buildDetails, entryId } from "./changelog.ts";
import { compareSnapshots, isEmpty, type SnapFeature, type Snapshot } from "./compare.ts";
import { doubtsAbout, screen } from "./holdback.ts";
import { setPin } from "./refresh.ts";

const pt = (id: string, entity: string, lon: number, lat: number, o: Partial<SnapFeature> = {}): SnapFeature =>
  ({ id, entity_id: entity, category: "culture", source_id: "xronos", start_year: -5000, end_year: -4500, label: id, point: [lon, lat], ...o });
const snap = (features: SnapFeature[], entities = [{ id: "lbk", name: "Linear Pottery", category: "culture", start_year: -5500, end_year: -4500 }]): Snapshot =>
  ({ label: "t", features, entities });

// Linear Pottery points in Germany.
const german = [pt("lbk@1", "lbk", 8.7, 50.1), pt("lbk@2", "lbk", 9.9, 49.8), pt("lbk@3", "lbk", 11.5, 51.3), pt("lbk@4", "lbk", 7.1, 50.7), pt("lbk@5", "lbk", 10.2, 51.9)];

describe("compare", () => {
  it("finds added, removed and changed sites, and follows a renamed id", () => {
    const after = [german[0], { ...german[1], start_year: -5100 }, pt("lbk@x:new", "lbk", 9, 50), { ...german[3], id: "lbk@x:renamed", label: "lbk@4" }];
    const c = compareSnapshots(snap(german), snap(after));
    expect(c.features.added.map((f) => f.id)).toEqual(["lbk@x:new"]);
    expect(c.features.removed.map((f) => f.id)).toEqual(["lbk@3", "lbk@5"]);
    expect(c.features.changed.map((x) => [x.after.id, x.fields])).toEqual([["lbk@2", ["dates"]], ["lbk@x:renamed", ["id"]]]);
    expect(isEmpty(compareSnapshots(snap(german), snap(german)))).toBe(true);
  });
});

describe("hold-back screen", () => {
  it("publishes a new point among its entity's others", () => expect(doubtsAbout(pt("n", "lbk", 9.5, 50.5), german)).toEqual([]));
  it("holds a point far from the rest, in a new country, or stretching the span", () => {
    expect(doubtsAbout(pt("n", "lbk", 100, 30), german).join("; ")).toMatch(/far from lbk's other sites \(nearest [\d,]+ km\).*first lbk point in People.s Republic of China/);
    expect(doubtsAbout(pt("n", "lbk", 16.4, 48.2), german)).toEqual(["first lbk point in Austria"]);
    expect(doubtsAbout(pt("n", "lbk", 9.5, 50.5, { start_year: -6000 }), german, { start_year: -5500, end_year: -4500 })[0]).toMatch(/dated outside lbk's span/);
  });
  it("judges a newly mapped culture's points among themselves", () => {
    const fresh = [pt("h1", "horgen", 8.5, 47.4), pt("h2", "horgen", 8.9, 47.2), pt("h3", "horgen", 9.1, 47.6), pt("h4", "horgen", 7.6, 47.5), pt("h5", "horgen", -80, 40)];
    const held = screen(compareSnapshots(snap([]), snap(fresh, [])), snap([], []), "2026-10-23");
    expect(held.map((h) => h.id)).toEqual(["h5"]);
  });
  it("pairs a point merged into a new one nearby, and screens it for its span", () => {
    const road = pt("lbk@r:korman-iv", "lbk", 9.5, 50.5, { source_id: "road", label: "Korman IV" });
    const before = snap([...german, road]);
    const merged = pt("lbk@x:korman", "lbk", 9.505, 50.5, { label: "Korman", end_year: -4000 });
    const c = compareSnapshots(before, snap([...german, merged]));
    expect(c.features.removed).toEqual([]);
    expect(c.features.changed.map((x) => [x.after.id, x.fields[0]])).toEqual([["lbk@x:korman", "merged"]]);
    expect(screen(c, before, "d").map((h) => [h.id, h.reason])).toEqual([["lbk@x:korman", "dated outside Linear Pottery's span (5,501 BCE to 4,501 BCE)"]]);
  });
  it("screens only bulk points, and holds new Cliopatria polities but not curated ones", () => {
    const curatedRow = pt("lbk@6", "lbk", 100, 30, { source_id: "wikimedia" });
    const civs = [{ id: "kush", name: "Kush", category: "civilization", start_year: -800, end_year: 1 }, { id: "mine", name: "Mine", category: "civilization", start_year: -800, end_year: 1 }];
    const before = snap(german);
    const held = screen(compareSnapshots(before, snap([...german, curatedRow], [...before.entities, ...civs])), before, "d", new Set(["mine"]));
    expect(held.map((h) => [h.id, h.kind])).toEqual([["kush", "entity"]]);
  });
});

describe("change log", () => {
  it("counts by category and names each day's entries apart", () => {
    const before = snap(german);
    const after = snap([...german, pt("lbk@x:new", "lbk", 9, 50)]);
    const d = buildDetails("2026-10-23", "2026-10-23", compareSnapshots(before, after), after, before, [{ id: "xronos", from: "retrieved 2026-10-06", to: "retrieved 2026-10-23" }], []);
    expect(d.entry.added).toEqual({ culture: 1 });
    expect(d.added[0]).toMatchObject({ id: "lbk@x:new", entity: "Linear Pottery", lat: 50, lon: 9 });
    expect(entryId("2026-10-23", [])).toBe("2026-10-23");
    expect(entryId("2026-10-23", [d.entry, { ...d.entry, id: "2026-10-23-2" }])).toBe("2026-10-23-3");
  });
});

describe("pins and the held-back list", () => {
  it("moves a pin", () => {
    const text = 'export const CLIOPATRIA_RECORD = "23128623";\nexport const AADR_FILE_ID = 13994515;\n';
    expect(setPin(setPin(text, "CLIOPATRIA_RECORD", "30000000"), "AADR_FILE_ID", 42)).toBe('export const CLIOPATRIA_RECORD = "30000000";\nexport const AADR_FILE_ID = 42;\n');
    expect(() => setPin(text, "NOPE", 1)).toThrow();
  });
  it("adds held rows once and reads them back", () => {
    const path = join(mkdtempSync(join(tmpdir(), "held-")), "held-back.csv");
    const row = { id: "lbk@x:a", kind: "feature" as const, entity_id: "lbk", label: "A, B", reason: "far", held: "2026-10-23", status: "held" as const };
    addHeld([row], path);
    addHeld([row, { ...row, id: "lbk@x:b" }], path);
    expect(readHeld(path).map((r) => [r.id, r.label])).toEqual([["lbk@x:a", "A, B"], ["lbk@x:b", "A, B"]]);
    writeFileSync(path, readFileSync(path, "utf8").replace(/held$/m, "confirmed"));
    expect([...heldIds(path)]).toEqual(["lbk@x:b"]);
  });
});
