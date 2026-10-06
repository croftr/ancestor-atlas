import { describe, expect, it } from "vitest";
import { setAsideOutliers, type XronosDate, type XronosSite } from "./xronos.ts";

// A date with a calibrated median (cal BP) and a 95% range of ± half-width years.
const date = (labnr: string, median: number, half = 100): XronosDate =>
  ({ labnr, recordId: "1", bp: 0, std: 0, median, from: median + half, to: median - half, refs: [], via: [] });
const site = (dates: XronosDate[], category: "culture" | "species" = "culture"): XronosSite =>
  ({ entity_id: "x", category, range: [6000, 4000], site: "s", country: "NL", lat: 0, lon: 0, dates });

describe("setAsideOutliers", () => {
  it("sets aside an isolated young date (Elsloo GrN-2310)", () => {
    const s = site([date("a", 7300), date("b", 7200), date("c", 7100), date("d", 7000), date("e", 6950), date("f", 6900), date("GrN-2310", 5810)]);
    expect(setAsideOutliers(s)).toBe(1);
    expect(s.setAside!.map((d) => d.labnr)).toEqual(["GrN-2310"]);
    expect(s.dates).toHaveLength(6);
  });
  it("keeps an end date whose 95% range overlaps its neighbour's, however far the medians", () => {
    const s = site([date("old", 43600, 700), date("b", 42900, 500), date("c", 42400, 400), date("d", 42000, 400)]);
    expect(setAsideOutliers(s)).toBe(0);
  });
  it("leaves sites with fewer than four dates alone", () =>
    expect(setAsideOutliers(site([date("a", 7000), date("b", 6900), date("c", 5000)]))).toBe(0));
  it("sets aside at most a quarter of a site's dates, the further end first", () => {
    const s = site([date("old", 9000), date("b", 7100), date("c", 7000), date("young", 6000)]);
    expect(setAsideOutliers(s)).toBe(1);
    expect(s.setAside![0].labnr).toBe("old");
  });
  it("never touches H. sapiens (species) points", () =>
    expect(setAsideOutliers(site([date("a", 20000), date("b", 15000), date("c", 14900), date("d", 14800)], "species"))).toBe(0));
});
