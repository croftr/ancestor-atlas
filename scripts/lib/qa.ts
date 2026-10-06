// Pure helpers for the data QA report (scripts/report-data.ts). Years are astronomical.
import { fromKa, fromMa, minWindow } from "./dates.ts";
import { STEPS, segmentOfBce } from "../../src/time/scale.ts";

/** Great-circle distance in km. */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
}

const UNIT: Record<string, (n: number) => number> = { Ma: fromMa, ka: fromKa };
const NUM = String.raw`(\d[\d,]*(?:\.\d+)?)`;
const num = (s: string) => Number(s.replace(/,/g, ""));

/**
 * Parse the human-readable age used in the curated CSVs. Returns [startYear, endYear] (older first) or undefined.
 * Accepted shapes (anything in parentheses is ignored):
 *   "7.2–6.8 Ma", "1.5 Ma–400 ka", "117–108 ka"       range
 *   "c. 480 ka", "480 ka"                              single age (a zero-length range)
 *   "315 ± 34 ka"                                      age ± error
 *   "9500–8000 BCE"                                    calendar range
 */
export function parseAgeText(text: string): [number, number] | undefined {
  const t = text.replace(/\(.*?\)/g, "").replace(/^c\.\s*/, "").trim();
  let m = t.match(new RegExp(`^${NUM}\\s*(Ma|ka)?\\s*[–-]\\s*${NUM}\\s*(Ma|ka)$`));
  if (m) {
    const older = UNIT[m[2] ?? m[4]](num(m[1]));
    const younger = UNIT[m[4]](num(m[3]));
    return older <= younger ? [older, younger] : undefined;
  }
  if ((m = t.match(new RegExp(`^${NUM}\\s*±\\s*${NUM}\\s*(Ma|ka)$`)))) {
    const [a, e] = [num(m[1]), num(m[2])];
    return [UNIT[m[3]](a + e), UNIT[m[3]](a - e)];
  }
  if ((m = t.match(new RegExp(`^${NUM}\\s*(Ma|ka)$`)))) {
    const y = UNIT[m[2]](num(m[1]));
    return [y, y];
  }
  if ((m = t.match(new RegExp(`^${NUM}\\s*[–-]\\s*${NUM}\\s*BCE$`)))) {
    const [a, b] = [1 - num(m[1]), 1 - num(m[2])];
    return a <= b ? [a, b] : undefined;
  }
  return undefined;
}

/** Slider-visible window for an age text: the parsed range widened to at least 2 slider steps (see README.md, Provenance rules). */
export function windowFromText(text: string): [number, number] | undefined {
  const r = parseAgeText(text);
  if (!r) return undefined;
  const mid = 1 - (r[0] + r[1]) / 2; // years BCE
  return minWindow(r[0], r[1], 2 * STEPS[segmentOfBce(mid)]);
}

/**
 * True when the date window [start, end] contains the range stated in date_text.
 * Windows may be wider (they are widened to at least 2 slider steps) but never narrower.
 * `tolerance` is a fraction of the age, to absorb rounding.
 */
export function windowMatchesText(start: number, end: number, text: string, tolerance = 0.01): boolean | undefined {
  const r = parseAgeText(text);
  if (!r) return undefined;
  const slack = (y: number) => Math.max(10, Math.abs(1950 - y) * tolerance);
  return start <= r[0] + slack(r[0]) && end >= r[1] - slack(r[1]);
}

export type Status = "recall" | "partial" | "sourced";

/** Provenance status of a curated site row. */
export function siteStatus(r: { source_id: string; coord_source?: string; date_source?: string }): Status {
  const n = (r.coord_source ? 1 : 0) + (r.date_source ? 1 : 0);
  if (n === 2 && r.source_id !== "recall") return "sourced";
  return n === 0 ? "recall" : "partial";
}

/** Indices of points far from the rest of their entity: > max(minKm, factor × median distance) from the median centre. */
export function outliers(points: { lat: number; lon: number }[], minKm = 3000, factor = 4): number[] {
  if (points.length < 4) return [];
  const med = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  };
  const cLat = med(points.map((p) => p.lat));
  const cLon = med(points.map((p) => p.lon));
  const d = points.map((p) => distanceKm(p.lat, p.lon, cLat, cLon));
  const limit = Math.max(minKm, factor * med(d));
  return d.flatMap((x, i) => (x > limit ? [i] : []));
}

export const normaliseLabel = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Evidence references look like "<scheme>:<value>". */
export const EVIDENCE_REF = /^(wikidata|wikipedia|doi|pbdb|road|url|xronos):\S.*$/;
export const QID = /^Q\d+$/;
