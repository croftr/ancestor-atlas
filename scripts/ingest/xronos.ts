// XRONOS (https://xronos.ch, CC BY 4.0) -> culture site points, plus H. sapiens points from directly dated human remains.
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
import { distanceKm } from "../lib/qa.ts";
import { STEPS, segmentOfBce } from "../../src/time/scale.ts";

export const XRONOS_CSV = "data/raw/xronos/data.csv";

// Dates on human remains (species "Homo sapiens") are evidence for the H. sapiens layer, whatever their culture label.
const HUMAN_SPECIES = /^homo sapiens/i;
const HUMAN_ENTITY = "homo-sapiens";

export interface XronosSite {
  entity_id: string; category: "culture" | "species"; range: [number, number]; // culture's sourced range, years BCE (oldest, youngest), no margin
  site: string; country: string; lat: number; lon: number;
  dates: { labnr: string; recordId: string; bp: number; std: number; median: number; from: number; to: number; refs: string[]; via: string[] }[];
}
export interface XronosStats { rows: number; labelled: number; conflicting: number; noCoords: number; uncalibrated: number; duplicates: number; outOfWindow: number; coarse: number; countryMismatch: number; merged: number; sites: number }

// Distinct references as one "; "-separated string (feature properties must be flat for MapLibre).
const YEAR_END = /\b(?:1[89]|20)\d{2}[a-z]?$/;
const uniq = (xs: string[]): string | undefined => {
  const all = [...new Set(xs
    .flatMap((x) => x.split(/;\s*/))
    .map((x) => x.trim().replace(/^(.*?)\s*DB\s*\d+$/i, "$1 DB")) // "Kiel DB 3245" -> "Kiel DB"
    // "Burleigh 1981, Weinstein 1984" lists several works: split when every part ends in a year.
    .flatMap((x) => { const parts = x.split(/,\s*/); return parts.length > 1 && parts.every((p) => YEAR_END.test(p)) ? parts : [x]; })
    .filter(Boolean))];
  // One work cited at several pages ("Smith 1988, 185", "Smith 1988, 187") becomes "Smith 1988, 185, 187".
  const pages = new Map<string, string[]>();
  const seen = new Set<string>();
  for (const x of all) {
    if (seen.has(x.toLowerCase())) continue; // "brami 2011" / "Brami 2011"
    seen.add(x.toLowerCase());
    const m = x.match(/^(.*\b(?:1[89]|20)\d{2}[a-z]?),\s*((?:pp?\.\s*)?\d[\d\s–-]*f{0,2}\.?)$/);
    const [work, page] = m ? [m[1], m[2]] : [x, ""];
    const ps = pages.get(work) ?? pages.set(work, []).get(work)!;
    if (page) ps.push(page);
  }
  const out = [...pages].map(([work, ps]) => (ps.length ? `${work}, ${ps.join(", ")}` : work));
  return out.length ? out.join("; ") : undefined;
};
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
  const ranges = new Map<string, [number, number]>(); // entity -> sourced range, no margin
  for (const r of parse(readFileSync(windowsPath, "utf8"), { columns: true }) as Record<string, string>[]) {
    windows.set(r.entity_id, [Number(r.start_bce) + Number(r.margin_years), Number(r.end_bce) - Number(r.margin_years)]);
    ranges.set(r.entity_id, [Number(r.start_bce), Number(r.end_bce)]);
  }
  const curve = loadCurve();
  const stats: XronosStats = { rows: 0, labelled: 0, conflicting: 0, noCoords: 0, uncalibrated: 0, duplicates: 0, outOfWindow: 0, coarse: 0, countryMismatch: 0, merged: 0, sites: 0 };
  const byCountry = new Map<string, [number, number][]>(); // all XRONOS coordinates per country, for a consistency check
  const seen = new Set<string>();
  const sites = new Map<string, XronosSite>();
  const rows = parse(readFileSync(XRONOS_CSV, "utf8"), { columns: true, relax_quotes: true }) as Record<string, string>[];
  // XRONOS merges several source databases, so one lab number can appear in several records with different culture
  // labels. Collect every culture each lab number maps to; a date claimed by two of our cultures is dropped.
  // The same measurement can also carry different lab-number spellings (ETH-4122 / UZ-4122), so cultures are
  // collected both per lab number and per measurement (same age, error and ~0.1 degree location).
  const labCultures = new Map<string, Set<string>>();
  const measKey = (r: Record<string, string>) =>
    r.bp && r.std && r.lat && r.lng ? `m|${r.bp}|${r.std}|${Number(r.lat).toFixed(1)}|${Number(r.lng).toFixed(1)}` : undefined;
  for (const r of rows) {
    const keys = [r.labnr?.trim(), measKey(r)].filter((k): k is string => !!k);
    for (const u of units(r.typochronological_units)) {
      const e = labels.get(u);
      if (e) for (const k of keys) (labCultures.get(k) ?? labCultures.set(k, new Set()).get(k)!).add(e);
    }
  }
  const conflicted = (r: Record<string, string>) =>
    [r.labnr?.trim(), measKey(r)].some((k) => !!k && (labCultures.get(k)?.size ?? 0) > 1);
  // A record's references are either publications (they contain a year as a separate word, e.g. "Smith 2004") or the
  // radiocarbon compilations XRONOS took the date from (RADON, EUROEVOL, CalPal2022, p3k14c, ...). XRONOS asks for both
  // the original sources and XRONOS itself to be cited, so all of them are kept, publications and compilations apart.
  // "Kiel DB 2018" is a record number in the Kiel radiocarbon database, not a year: a compilation.
  const isDbRecord = (x: string) => /\bDB\s*\d+$/i.test(x);
  const isPub = (x: string) => /\b(1[89]|20)\d{2}[a-z]?\b/.test(x) && !isDbRecord(x);
  const refsOf = (r: Record<string, string>) => units(r.reference).filter(isPub);
  const viaOf = (r: Record<string, string>) => units(r.reference).filter((x) => !isPub(x));
  for (const r of rows) {
    stats.rows++;
    if (r.lat && r.lng && r.country) {
      const p: [number, number] = [Number(r.lat), Number(r.lng)];
      if (Number.isFinite(p[0]) && Number.isFinite(p[1])) (byCountry.get(r.country) ?? byCountry.set(r.country, []).get(r.country)!).push(p);
    }
    // Which entities this date is evidence for: at most one culture (by label) and, if the dated material is human
    // remains, Homo sapiens (by species) -- a directly dated burial can count for both.
    const targets: string[] = [];
    const mapped = new Set(units(r.typochronological_units).map((u) => labels.get(u)).filter((x): x is string => !!x));
    if (mapped.size > 1 || (mapped.size === 1 && conflicted(r))) stats.conflicting++;
    else if (mapped.size === 1) targets.push([...mapped][0]);
    if (HUMAN_SPECIES.test(r.species?.trim() ?? "")) targets.push(HUMAN_ENTITY);
    if (!targets.length) continue;
    stats.labelled++;
    const lat = Number(r.lat), lon = Number(r.lng);
    if (!r.lat || !r.lng || !Number.isFinite(lat) || !Number.isFinite(lon)) { stats.noCoords++; continue; }
    if (Number.isInteger(lat) && Number.isInteger(lon)) { stats.coarse++; continue; } // whole-degree point: ~100 km
    const bp = Number(r.bp), std = Number(r.std);
    const c = Number.isFinite(bp) && Number.isFinite(std) ? calibrate(curve, bp, std) : undefined;
    if (!c) { stats.uncalibrated++; continue; }
    const key = r.labnr?.trim();
    for (const entity_id of targets) {
      const w = windows.get(entity_id);
      if (!w) continue; // only entities with a sourced date range are imported
      const dupKey = `${entity_id}|${key}`;
      if (key && seen.has(dupKey)) { stats.duplicates++; continue; }
      if (key) seen.add(dupKey);
      const bce = c.median - 1949; // cal BP -> years BCE (1950 - calBP = astronomical year; BCE = 1 - year)
      if (bce > w[0] || bce < w[1]) { stats.outOfWindow++; continue; }
      // The same measurement sometimes appears under two lab-number styles (ETH-4086 / UZ-4086) at a slightly different
      // site point: same age and error within 5 km of an already-kept date of this entity is one measurement.
      const twin = [...sites.values()].some((o) => o.entity_id === entity_id && o.dates.some((d) => d.bp === bp && d.std === std) && distanceKm(o.lat, o.lon, lat, lon) < 5);
      if (twin) { stats.duplicates++; continue; }
      const id = `${entity_id}|${r.site.trim()}|${lat.toFixed(3)}|${lon.toFixed(3)}`;
      const s = sites.get(id) ?? sites.set(id, {
        entity_id, category: entity_id === HUMAN_ENTITY ? "species" : "culture", range: ranges.get(entity_id)!,
        site: r.site.trim(), country: r.country, lat, lon, dates: [],
      }).get(id)!;
      s.dates.push({ labnr: key, recordId: r.id, bp, std, median: c.median, from: c.from, to: c.to, refs: refsOf(r), via: viaOf(r) });
    }
  }
  // Drop sites whose coordinates are far from where the rest of their country's XRONOS dates lie: these are
  // source errors (flipped longitude signs, shifted grids, wrong country codes).
  const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
  const centre = new Map<string, { lat: number; lon: number; limit: number }>();
  for (const [c, ps] of byCountry) {
    if (ps.length < 10) continue;
    const lat = med(ps.map((p) => p[0])), lon = med(ps.map((p) => p[1]));
    centre.set(c, { lat, lon, limit: Math.max(600, 4 * med(ps.map((p) => distanceKm(lat, lon, p[0], p[1])))) });
  }
  const kept = [...sites.values()].filter((s) => s.dates.length > 0).filter((s) => {
    const c = centre.get(s.country);
    if (c && distanceKm(c.lat, c.lon, s.lat, s.lon) > c.limit) { stats.countryMismatch++; return false; }
    return true;
  });
  // Merge same-culture sites within 1 km: XRONOS often spells one site several ways ("Lubcze" / "Lubcze site 37").
  // The merged site keeps the name and coordinates of the variant with the most dates.
  kept.sort((a, b) => b.dates.length - a.dates.length);
  const merged: XronosSite[] = [];
  for (const s of kept) {
    const m = merged.find((x) => x.entity_id === s.entity_id && distanceKm(x.lat, x.lon, s.lat, s.lon) < 1);
    if (m) { m.dates.push(...s.dates); stats.merged++; } else merged.push(s);
  }
  stats.sites = merged.length;
  return { sites: merged, stats };
}

const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** One Point feature per site. */
export function xronosFeatures(sites: XronosSite[]): { props: FeatureProps; geometry: { type: string; coordinates: number[] } }[] {
  const maxN = Math.max(1, ...sites.map((s) => s.dates.length));
  const used = new Set<string>();
  return sites.map((s) => {
    const meds = s.dates.map((d) => d.median);
    const oldest = Math.max(...meds), youngest = Math.min(...meds); // cal BP
    // Astronomical years, clipped to the culture's sourced range: the margin only decides which dates are kept,
    // it never stretches a site beyond what the culture's dating supports.
    const lo = 1 - s.range[0], hi = 1 - s.range[1];
    let a = Math.max(1950 - oldest, lo), b = Math.min(1950 - youngest, hi);
    if (a > b) a = b = Math.min(Math.max(1950 - oldest, lo), hi); // all dates in the margin: pin to the nearest bound
    let [start, end] = minWindow(a, b, 2 * STEPS[segmentOfBce(1 - (a + b) / 2)]);
    // Keep the widened window inside the culture's range by sliding it, not stretching past the range.
    if (start < lo) [start, end] = [lo, Math.min(hi, lo + (end - start))];
    if (end > hi) [start, end] = [Math.max(lo, hi - (end - start)), hi];
    const n = s.dates.length;
    const ka = (x: number) => (x / 1000).toFixed(x >= 10000 ? 1 : 2).replace(/\.?0+$/, "");
    let id = `${s.entity_id}@x:${slug(s.site) || "site"}`;
    for (let k = 2; used.has(id); k++) id = `${s.entity_id}@x:${slug(s.site)}-${k}`;
    used.add(id);
    return {
      props: {
        id, entity_id: s.entity_id, category: s.category, start_year: start, end_year: end,
        label: s.site,
        date_text: (oldest === youngest ? `c. ${ka(oldest)} ka cal BP (1 date` : `${ka(oldest)}–${ka(youngest)} ka cal BP (${n} dates`) + (s.category === "species" ? ", human remains)" : ")"),
        confidence: n >= 5 ? "high" : n >= 2 ? "medium" : "low",
        weight: Math.round((Math.log(n + 1) / Math.log(maxN + 1)) * 1000) / 1000,
        source_id: "xronos",
        refs: uniq(s.dates.flatMap((d) => d.refs)),
        via: uniq(s.dates.flatMap((d) => d.via)),
        source_ref: `xronos:${s.dates.slice(0, 3).map((d) => d.labnr).join(",")}${n > 3 ? ",…" : ""}`,
        coord_source: `xronos:c14/${s.dates[0].recordId}`, date_source: `xronos:IntCal20:c14/${s.dates[0].recordId}`,
      },
      geometry: { type: "Point", coordinates: [s.lon, s.lat] },
    };
  });
}
