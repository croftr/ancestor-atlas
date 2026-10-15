import { useEffect, useState } from "react";

/**
 * Climate behind the time slider (public/data/climate.json, from scripts/paleo.ts): the LR04 benthic δ18O
 * stack (0–5.32 Ma; higher = colder, more ice) and the Spratt & Lisiecki sea level stack (0–798 ka), both
 * as [ka, value] rows, oldest last. Ages count back from 1950.
 */
export interface Climate {
  d18o: [number, number][];
  sea_level: [number, number][];
}

/** Thousands of years before 1950 of an astronomical year. */
export const kaOf = (year: number) => (1950 - year) / 1000;

/** Linear interpolation in [ka, value] rows sorted by ka; undefined outside them. */
export function valueAt(rows: [number, number][], ka: number): number | undefined {
  if (!rows.length || ka < rows[0][0] || ka > rows[rows.length - 1][0]) return undefined;
  let lo = 0, hi = rows.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (rows[mid][0] <= ka) lo = mid;
    else hi = mid;
  }
  const [k0, v0] = rows[lo], [k1, v1] = rows[hi];
  return k1 === k0 ? v0 : v0 + ((v1 - v0) * (ka - k0)) / (k1 - k0);
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

/** Words for a δ18O value: roughly how glacial the world was (LR04 runs from about 2.6 to 5.1‰). */
export function climateWords(d18o: number): string {
  if (d18o >= 4.6) return "Ice age at its height";
  if (d18o >= 4.1) return "Ice age";
  if (d18o >= 3.6) return "Between warm and cold";
  return "Warm, little ice";
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
