import { scaleLinear } from "d3-scale";

export const BCE_BREAKS = [10_000_000, 1_000_000, 100_000, 10_000, 3_000, 0];
export const POS_BREAKS = [0, 0.15, 0.35, 0.55, 0.75, 1];
export const STEPS = [100_000, 10_000, 1_000, 100, 10];
export const MIN_YEAR = 1 - BCE_BREAKS[0]; // -9_999_999
export const MAX_YEAR = 1;

const posToBce = scaleLinear().domain(POS_BREAKS).range(BCE_BREAKS).clamp(true);
const bceToPos = scaleLinear().domain(BCE_BREAKS).range(POS_BREAKS).clamp(true);

const clampYear = (y: number) => Math.min(MAX_YEAR, Math.max(MIN_YEAR, y));

/** Segment index i such that BCE_BREAKS[i] >= bce > BCE_BREAKS[i+1]; 4 for bce <= 3000. */
export function segmentOfBce(bce: number): number {
  if (bce <= 3_000) return 4;
  if (bce <= 10_000) return 3;
  if (bce <= 100_000) return 2;
  if (bce <= 1_000_000) return 1;
  return 0;
}

export function snapYear(year: number): number {
  let bce = 1 - year;
  const step = STEPS[segmentOfBce(bce)];
  bce = Math.round(bce / step) * step;
  return clampYear(1 - bce);
}

export function posToYear(pos: number): number {
  return Math.round(snapYear(1 - posToBce(pos)));
}

export function yearToPos(year: number): number {
  return bceToPos(1 - year);
}

/** dir = 1 moves forward in time (toward 1 CE). */
export function stepYear(year: number, dir: 1 | -1): number {
  const bce = 1 - year;
  const step = STEPS[segmentOfBce(dir === 1 ? bce - 1 : bce + 1)];
  return clampYear(snapYear(1 - (bce - dir * step)));
}

export function formatYear(year: number): string {
  const bce = 1 - year;
  if (bce >= 1_000_000) {
    const x = +(bce / 1e6).toFixed(2);
    return `c. ${x} million years ago`;
  }
  if (bce >= 10_000) {
    // Deep-time dates carry leftovers from conversion (e.g. 347,051 BCE from years before 1950);
    // show them to 3 significant figures, marked "c." when that changed the number. Round values,
    // such as every year the time slider can show, are left exactly as they are.
    const unit = 10 ** (Math.floor(Math.log10(bce)) - 2);
    const r = Math.round(bce / unit) * unit;
    return `${r === bce ? "" : "c. "}${r.toLocaleString("en-US")} BCE`;
  }
  if (bce >= 1) return `${bce.toLocaleString("en-US")} BCE`;
  return `${year} CE`;
}

export function formatRange(start: number, end: number): string {
  return `${formatYear(start)} – ${formatYear(end)}`;
}
