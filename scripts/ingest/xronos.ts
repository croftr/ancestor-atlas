// XRONOS (https://xronos.ch, CC BY 4.0) -> culture site points.
// Reads ONLY the local copy data/raw/xronos/data.csv (downloaded by hand from https://xronos.ch/data.csv;
// XRONOS's robots.txt disallows automated fetching of /data*, so this script never downloads).
// Dates whose typochronological label maps to a culture in data/curated/culture-labels.csv are calibrated with
// IntCal20, then grouped into one point per site. A site's window runs from its oldest to its youngest
// calibrated median; weight grows with the number of dates.
// Dates whose calibrated median falls outside the culture's sourced date range (data/curated/culture-windows.csv,
// widened by its margin) are dropped as mislabelled or contaminated, and counted.
import { existsSync, readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import type { FeatureProps } from "../../src/types.ts";
import { calibrate, loadCurve } from "../lib/calibrate.ts";
import { minWindow } from "../lib/dates.ts";
import { STEPS, segmentOfBce } from "../../src/time/scale.ts";

export const XRONOS_CSV = "data/raw/xronos/data.csv";

export interface XronosSite {
  entity_id: string; site: string; country: string; lat: number; lon: number;
  dates: { labnr: string; bp: number; std: number; median: number; from: number; to: number }[];
}
export interface XronosStats { rows: number; labelled: number; conflicting: number; noCoords: number; uncalibrated: number; duplicates: number; outOfWindow: number; sites: number }

const units = (s: string): string[] => {
  try { return (JSON.parse(s || "[]") as Record<string, string>[]).map((d) => Object.values(d)[0]?.trim()).filter(Boolean); }
  catch { return []; }
};

export function readXronosSites(labelsPath = "data/curated/culture-labels.csv", windowsPath = "data/curated/culture-windows.csv"): { sites: XronosSite[]; stats: XronosStats } | undefined {
  if (!existsSync(XRONOS_CSV)) return undefined;
  const labels = new Map<string, string>();
  for (const r of parse(readFileSync(labelsPath, "utf8"), { columns: true }) as Record<string, string>[])
    if (r.source === "xronos") labels.set(r.label, r.entity_id);
  const windows = new Map<string, [number, number]>(); // entity -> [oldest, youngest] years BCE incl. margin
  for (const r of parse(readFileSync(windowsPath, "utf8"), { columns: true }) as Record<string, string>[])
    windows.set(r.entity_id, [Number(r.start_bce) + Number(r.margin_years), Number(r.end_bce) - Number(r.margin_years)]);
  const curve = loadCurve();
  const stats: XronosStats = { rows: 0, labelled: 0, conflicting: 0, noCoords: 0, uncalibrated: 0, duplicates: 0, outOfWindow: 0, sites: 0 };
  const seen = new Set<string>();
  const sites = new Map<string, XronosSite>();
  const rows = parse(readFileSync(XRONOS_CSV, "utf8"), { columns: true, relax_quotes: true }) as Record<string, string>[];
  for (const r of rows) {
    stats.rows++;
    const mapped = new Set(units(r.typochronological_units).map((u) => labels.get(u)).filter((x): x is string => !!x));
    if (!mapped.size) continue;
    if (mapped.size > 1) { stats.conflicting++; continue; }
    stats.labelled++;
    const lat = Number(r.lat), lon = Number(r.lng);
    if (!r.lat || !r.lng || !Number.isFinite(lat) || !Number.isFinite(lon)) { stats.noCoords++; continue; }
    const key = r.labnr?.trim();
    if (key && seen.has(key)) { stats.duplicates++; continue; }
    if (key) seen.add(key);
    const bp = Number(r.bp), std = Number(r.std);
    const c = Number.isFinite(bp) && Number.isFinite(std) ? calibrate(curve, bp, std) : undefined;
    if (!c) { stats.uncalibrated++; continue; }
    const entity_id = [...mapped][0];
    const w = windows.get(entity_id);
    if (!w) continue; // only cultures with a sourced date range are imported
    const bce = c.median - 1949; // cal BP -> years BCE (1950 - calBP = astronomical year; BCE = 1 - year)
    if (bce > w[0] || bce < w[1]) { stats.outOfWindow++; continue; }
    const id = `${entity_id}|${r.site.trim()}|${lat.toFixed(3)}|${lon.toFixed(3)}`;
    const s = sites.get(id) ?? sites.set(id, { entity_id, site: r.site.trim(), country: r.country, lat, lon, dates: [] }).get(id)!;
    s.dates.push({ labnr: key, bp, std, median: c.median, from: c.from, to: c.to });
  }
  stats.sites = sites.size;
  return { sites: [...sites.values()], stats };
}

const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** One Point feature per site. */
export function xronosFeatures(sites: XronosSite[]): { props: FeatureProps; geometry: { type: string; coordinates: number[] } }[] {
  const maxN = Math.max(1, ...sites.map((s) => s.dates.length));
  const used = new Set<string>();
  return sites.map((s) => {
    const meds = s.dates.map((d) => d.median);
    const oldest = Math.max(...meds), youngest = Math.min(...meds); // cal BP
    const a = 1950 - oldest, b = 1950 - youngest; // astronomical years
    const [start, end] = minWindow(a, b, 2 * STEPS[segmentOfBce(1 - (a + b) / 2)]);
    const n = s.dates.length;
    const ka = (x: number) => (x / 1000).toFixed(x >= 10000 ? 1 : 2).replace(/\.?0+$/, "");
    let id = `${s.entity_id}@x:${slug(s.site) || "site"}`;
    for (let k = 2; used.has(id); k++) id = `${s.entity_id}@x:${slug(s.site)}-${k}`;
    used.add(id);
    return {
      props: {
        id, entity_id: s.entity_id, category: "culture", start_year: start, end_year: end,
        label: s.site,
        date_text: oldest === youngest ? `c. ${ka(oldest)} ka cal BP (1 date)` : `${ka(oldest)}–${ka(youngest)} ka cal BP (${n} dates)`,
        confidence: n >= 5 ? "high" : n >= 2 ? "medium" : "low",
        weight: Math.round((Math.log(n + 1) / Math.log(maxN + 1)) * 1000) / 1000,
        source_id: "xronos",
        source_ref: `xronos:${s.dates.slice(0, 3).map((d) => d.labnr).join(",")}${n > 3 ? ",…" : ""}`,
        coord_source: "xronos:site", date_source: "xronos:IntCal20",
      },
      geometry: { type: "Point", coordinates: [s.lon, s.lat] },
    };
  });
}
