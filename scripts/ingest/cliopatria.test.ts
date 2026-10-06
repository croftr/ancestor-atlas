import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RAW_FILE, readCliopatriaRows, slugify } from "./cliopatria.ts";

describe("slugify", () => {
  it("strips diacritics and punctuation", () => {
    expect(slugify("Janapada of Kāśī")).toBe("janapada-of-kasi");
    expect(slugify("Âu Lạc")).toBe("au-lac");
  });
});

// Year-convention spot check (needs the raw download: npm run data:fetch).
describe.skipIf(!existsSync(RAW_FILE))("Cliopatria year convention", () => {
  it("uses astronomical years: year 0 exists and rows are contiguous across it", () => {
    const rows = readCliopatriaRows().filter((r) => r.Name === "Roman Empire");
    const ends = rows.map((r) => r.ToYear);
    const starts = rows.map((r) => r.FromYear);
    expect(ends).toContain(0);
    expect(starts).toContain(1);
    expect(starts).not.toContain(-0.5);
  });
});
