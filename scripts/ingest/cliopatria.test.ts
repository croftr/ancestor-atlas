import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RAW_FILE, fromCliopatriaYear, readCliopatriaRows, slugify } from "./cliopatria.ts";

describe("slugify", () => {
  it("strips diacritics and punctuation", () => {
    expect(slugify("Janapada of Kāśī")).toBe("janapada-of-kasi");
    expect(slugify("Âu Lạc")).toBe("au-lac");
  });
});

// Year-convention spot check (needs the raw download: npm run data:fetch).
describe.skipIf(!existsSync(RAW_FILE))("Cliopatria year convention", () => {
  it("writes BCE as historians do: rows break on historians' century boundaries", () => {
    const rows = readCliopatriaRows();
    const bceStarts = rows.map((r) => r.FromYear).filter((y) => y < -100);
    const bceEnds = rows.map((r) => r.ToYear).filter((y) => y < -100);
    const share = (ys: number[], ok: (y: number) => boolean) => ys.filter(ok).length / ys.length;
    // Starts on round hundreds (-3400) and ends just after them (-3301): 3400-3301 BCE.
    expect(share(bceStarts, (y) => y % 100 === 0)).toBeGreaterThan(0.1);
    expect(share(bceEnds, (y) => y % 100 === -1)).toBeGreaterThan(0.1);
    // Read astronomically, those would be 3401-3302 BCE: no source rounds that way.
    expect(share(bceStarts, (y) => (y - 1) % 100 === 0)).toBeLessThan(0.02);
  });

  it("stays contiguous across the start of the era once converted", () => {
    const rows = readCliopatriaRows().filter((r) => r.Name === "Roman Empire");
    const end = rows.find((r) => r.ToYear === 0)!;
    const next = rows.find((r) => r.FromYear === 1)!;
    expect(fromCliopatriaYear(end.FromYear)).toBe(end.FromYear + 1); // -14 -> -13 (14 BCE)
    expect(fromCliopatriaYear(next.FromYear) - fromCliopatriaYear(end.ToYear)).toBe(1);
  });
});
