// All internal years are astronomical: 1 CE = 1, 1 BCE = 0, 2 BCE = -1.
import { MAX_YEAR, MIN_YEAR } from "../../src/time/scale.ts";

/** Millions of years ago (PBDB max_ma / min_ma). */
export const fromMa = (ma: number) => Math.round(1950 - ma * 1e6);

/** Thousands of years before present (literature, ROAD). */
export const fromKa = (ka: number) => Math.round(1950 - ka * 1e3);

/** CALIBRATED radiocarbon years BP. Never pass uncalibrated 14C ages here. */
export const fromCalBP = (bp: number) => 1950 - bp;

/** Sources that write BCE as negative numbers with no year 0 (-1 = 1 BCE). */
export const fromHistorical = (y: number) => (y < 0 ? y + 1 : y);

/**
 * Widen [start, end] symmetrically to at least `minSpan` years, so precisely
 * dated points don't flash past on the slider. Clamped to the slider range.
 */
export function minWindow(start: number, end: number, minSpan: number): [number, number] {
  const span = end - start;
  if (span >= minSpan) return [start, end];
  const pad = Math.ceil((minSpan - span) / 2);
  let s = start - pad;
  let e = end + pad;
  if (s < MIN_YEAR) [s, e] = [MIN_YEAR, MIN_YEAR + (e - s)];
  if (e > MAX_YEAR) [s, e] = [MAX_YEAR - (e - s), MAX_YEAR];
  return [Math.max(MIN_YEAR, s), Math.min(MAX_YEAR, e)];
}
