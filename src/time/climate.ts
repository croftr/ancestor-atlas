import { useEffect, useState } from "react";

/**
 * Climate behind the time slider (public/data/climate.json, from scripts/climate.ts). Rows are by age in ka
 * (counting back from 1950), youngest first: the LR04 benthic δ18O stack (0–5.32 Ma; higher = colder, more
 * ice), global surface temperature against pre-industrial (0–783 ka), sea level against today (0–798 ka;
 * beyond 80 ka with its 95% range) and the Marine Isotope Stages.
 */
export interface Climate {
  sources: { name: string; citation: string; url: string; licence: string }[];
  d18o: [number, number][];
  temperature: [number, number][];
  sea_level: ([number, number] | [number, number, number, number])[];
  mis: [from: number, to: number, stage: string][];
}

/** A Marine Isotope Stage and whether it was a cold one (even-numbered: glacial). */
export interface Stage {
  stage: string;
  from: number;
  to: number;
  cold: boolean;
}

/** Everything the climate popover says about one moment. */
export interface ClimateAt {
  ka: number;
  d18o?: number;
  temperature?: number;
  sea?: { m: number; lo?: number; hi?: number };
  stage?: Stage;
}

/** Thousands of years before 1950 of an astronomical year. */
export const kaOf = (year: number) => (1950 - year) / 1000;

/** Linear interpolation of column `col` in rows sorted by ka (column 0); undefined outside them. */
export function valueAt(rows: number[][], ka: number, col = 1): number | undefined {
  if (!rows.length || ka < rows[0][0] || ka > rows[rows.length - 1][0]) return undefined;
  let lo = 0, hi = rows.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (rows[mid][0] <= ka) lo = mid;
    else hi = mid;
  }
  const [k0, v0] = [rows[lo][0], rows[lo][col]], [k1, v1] = [rows[hi][0], rows[hi][col]];
  if (v0 === undefined || v1 === undefined) return undefined;
  return k1 === k0 ? v0 : v0 + ((v1 - v0) * (ka - k0)) / (k1 - k0);
}

/** Cold stages have even numbers, in the numbered stages and the Pliocene's lettered ones (M2, G6) alike. */
export const isColdStage = (stage: string) => Number(stage.match(/\d+$/)?.[0] ?? 1) % 2 === 0;

/** The Marine Isotope Stage at an age, if within the record. */
export function stageAt(mis: Climate["mis"], ka: number): Stage | undefined {
  const row = mis.find(([from, to]) => from <= ka && ka < to) ?? (ka === mis.at(-1)?.[1] ? mis.at(-1) : undefined);
  return row && { stage: row[2], from: row[0], to: row[1], cold: isColdStage(row[2]) };
}

/** The stage's name as written: "MIS 2", "MIS M2". */
export const stageName = (stage: string) => `MIS ${stage}`;

/** Well-known stages, in a few words. */
export const STAGE_NOTES: Record<string, string> = {
  "1": "The Holocene, the warm stage we live in.",
  "2": "The coldest part of the last ice age, with the Last Glacial Maximum about 26,000–19,000 years ago.",
  "3": "A long, unsettled stretch of the last ice age, milder than the stages either side.",
  "4": "The first deep cold of the last ice age.",
  "5": "The Last Interglacial; its warmest part, MIS 5e (the Eemian), peaked about 123,000 years ago, with seas a few metres higher than today.",
  "6": "The penultimate ice age, one of the largest of the last million years.",
  "11": "An unusually long, warm interglacial.",
  "12": "One of the coldest ice ages of the last million years.",
  M2: "A brief, strong glaciation in the otherwise warm Pliocene.",
};

/** What the record says about one moment (an astronomical year). */
export function climateAt(c: Climate, year: number): ClimateAt {
  const ka = Math.max(0, kaOf(year));
  const m = valueAt(c.sea_level, ka);
  return {
    ka,
    d18o: valueAt(c.d18o, ka),
    temperature: valueAt(c.temperature, ka),
    sea: m === undefined ? undefined : { m, lo: valueAt(c.sea_level, ka, 2), hi: valueAt(c.sea_level, ka, 3) },
    stage: stageAt(c.mis, ka),
  };
}

// Warm (little ice) to cold (great ice sheets): amber, slate, ice blue, by δ18O in ‰.
const STOPS: [number, [number, number, number]][] = [
  [3.0, [222, 146, 78]],
  [3.9, [86, 104, 136]],
  [4.9, [196, 228, 255]],
];

/** Colour of a δ18O value on the climate strip. */
export function climateColor(d18o: number): string {
  const v = Math.min(STOPS[STOPS.length - 1][0], Math.max(STOPS[0][0], d18o));
  const i = Math.max(0, STOPS.findIndex(([s]) => s >= v) - 1);
  const [s0, c0] = STOPS[i], [s1, c1] = STOPS[i + 1];
  const t = (v - s0) / (s1 - s0);
  const c = c0.map((x, k) => Math.round(x + (c1[k] - x) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/**
 * Words for a δ18O value: how much land ice there was compared with today (LR04 reads about 3.2‰ now).
 * Relative words, so a cold stage of the warm Pliocene (M2) still reads as more ice than today.
 */
export function climateWords(d18o: number): string {
  if (d18o >= 4.6) return "Ice age at its height";
  if (d18o >= 4.1) return "Ice age";
  if (d18o >= 3.5) return "More ice than today";
  if (d18o >= 3.0) return "About as much ice as today";
  return "Less ice than today, warmer";
}

let climate: Climate | null = null;
let promise: Promise<Climate | null> | null = null;

export function loadClimate(): Promise<Climate | null> {
  promise ??= fetch("/data/climate.json")
    .then((r) => r.json() as Promise<Climate>)
    .then((c) => (climate = c))
    .catch(() => null);
  return promise;
}

export function useClimate(): Climate | null {
  const [c, setC] = useState(climate);
  useEffect(() => {
    let alive = true;
    loadClimate().then((x) => alive && setC(x));
    return () => {
      alive = false;
    };
  }, []);
  return c;
}
