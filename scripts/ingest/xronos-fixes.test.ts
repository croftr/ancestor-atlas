import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { describe, expect, it } from "vitest";
import { QID } from "../lib/qa.ts";

const rows = parse(readFileSync("data/curated/xronos-site-fixes.csv", "utf8"), { columns: true }) as Record<string, string>[];

describe("data/curated/xronos-site-fixes.csv", () => {
  it.each(rows.map((r) => [r.site, r]))("%s is well-formed", (_, r) => {
    expect(["move", "keep"]).toContain(r.action);
    expect(r.wikidata).toMatch(QID);
    expect(r.note.length).toBeGreaterThan(10);
    for (const k of ["xronos_lat", "xronos_lon"]) expect(Number.isFinite(Number(r[k])) && r[k] !== "").toBe(true);
    if (r.action === "move") {
      const lat = Number(r.lat), lon = Number(r.lon);
      expect(r.lat !== "" && Math.abs(lat) <= 90 && r.lon !== "" && Math.abs(lon) <= 180).toBe(true);
    } else expect(r.lat + r.lon).toBe("");
  });
  it("has one row per XRONOS site point", () => {
    const keys = rows.map((r) => `${r.site}|${r.country}|${r.xronos_lat}|${r.xronos_lon}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
