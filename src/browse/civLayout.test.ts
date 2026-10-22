import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Entity } from "../types";
import { buildEntries, byRegion, pack } from "./civLayout";
import { index, marks, nearMisses, search, type SearchRecord } from "./civSearch";

// The committed data the app loads.
const entities = JSON.parse(readFileSync("public/data/entities.json", "utf8")) as Entity[];
const civs = entities.filter((e) => e.category === "civilization");
const childrenOf = new Map<string, Entity[]>();
for (const e of civs) if (e.parent_id) childrenOf.set(e.parent_id, [...(childrenOf.get(e.parent_id) ?? []), e]);
const entries = buildEntries(civs, childrenOf);

describe("buildEntries", () => {
  it("places every civilization other than a group exactly once", () => {
    const placed = entries.flatMap((e) => (e.kind === "single" ? [e.entity.id] : e.members.map((m) => m.id)));
    expect(new Set(placed).size).toBe(placed.length);
    expect([...placed].sort()).toEqual(civs.filter((e) => !e.group).map((e) => e.id).sort());
  });

  it("gives every family two or more members and a picture", () => {
    for (const e of entries) {
      if (e.kind !== "family") continue;
      expect(e.members.length, e.title).toBeGreaterThanOrEqual(2);
      expect(e.picture?.url, e.title).toBeTruthy();
    }
  });

  it("counts every civilization in one region", () => {
    expect(byRegion(entries).reduce((n, r) => n + r.count, 0)).toBe(civs.filter((e) => !e.group).length);
  });
});

describe("pack", () => {
  it("never overlaps two items in a row", () => {
    const items = Array.from({ length: 200 }, (_, i) => ({ x0: (i * 37) % 500, x1: ((i * 37) % 500) + 20 + (i % 7) * 15 }));
    for (const row of pack(items, 4)) for (let i = 1; i < row.length; i++) expect(row[i].x0).toBeGreaterThanOrEqual(row[i - 1].x1 + 4);
  });
});

describe("search", () => {
  const records: SearchRecord[] = [];
  for (const e of entries) {
    if (e.kind === "single") records.push({ id: e.entity.id, name: e.entity.name, context: [e.region], start: e.start });
    else {
      if (e.entity) records.push({ id: e.entity.id, name: e.entity.name, context: [e.region], start: e.start });
      for (const m of e.members) records.push({ id: m.id, name: m.name, context: [e.title, e.region], start: m.start_year });
    }
  }
  const idx = index(records);
  const names = (q: string) => search(idx, q).map((r) => r.name);

  it("finds Rome's states for 'rome' and Persia's for 'persian'", () => {
    expect(names("rome")).toEqual(expect.arrayContaining(["Roman Kingdom", "Roman Republic", "Roman Empire"]));
    expect(names("persian")).toEqual(expect.arrayContaining(["Achaemenid Empire", "Parthian Empire"]));
    expect(names("assyrian")).toContain("Neo-Assyrian Empire");
  });

  it("finds members through their family's name", () => {
    expect(names("korea")).toContain("Goguryeo");
  });

  it("ranks the exact name first", () => {
    expect(names("han")[0]).toBe("Han");
    expect(names("han")).not.toContain("Shang Dynasty");
  });

  it("offers near misses for a typo", () => {
    expect(names("babilon")).toEqual([]);
    expect(nearMisses(idx, "babilon").map((r) => r.name)).toContain("Babylonia");
  });

  it("marks where the typed words begin, across accents", () => {
    expect(marks("Janapada of Kāśī", "kasi")).toEqual([[12, 16]]);
    expect(marks("Roman Republic", "rome")).toEqual([[0, 5]]);
  });
});
