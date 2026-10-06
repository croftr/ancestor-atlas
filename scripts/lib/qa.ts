// Pure helpers for the data QA report (scripts/report-data.ts). Years are astronomical.
import { fromKa, fromMa } from "./dates.ts";

/** Great-circle distance in km. */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
}

const UNIT: Record<string, (n: number) => number> = { Ma: fromMa, ka: fromKa };

/**
 * Parse the human-readable age range used in the curated CSVs, e.g. "7.2–6.8 Ma (approx.)" or
 * "1.5 Ma–400 ka". Returns [startYear, endYear] (older first), or undefined if the text has another shape.
 */
export function parseAgeText(text: string): [number, number] | undefined {
  const m = text
    .replace(/\(.*?\)/g, "")
    .trim()
    .match(/^([\d.]+)\s*(Ma|ka)?\s*[–-]\s*([\d.]+)\s*(Ma|ka)$/);
  if (!m) return undefined;
  const [, a, ua, b, ub] = m;
  const older = UNIT[ua ?? ub](Number(a));
  const younger = UNIT[ub](Number(b));
  return older <= younger ? [older, younger] : undefined;
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
export const EVIDENCE_REF = /^(wikidata|wikipedia|doi|pbdb|road|url):\S.*$/;
export const QID = /^Q\d+$/;
