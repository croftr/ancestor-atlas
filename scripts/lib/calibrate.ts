// Radiocarbon calibration against IntCal20 (Reimer et al. 2020, doi:10.1017/RDC.2020.41),
// curve file in data/reference/intcal20.14c. Standard single-date calibration: the probability of
// each calendar year is the normal likelihood of the measured 14C age given the curve at that year,
// with the curve's own error added in quadrature. Returns the 95.4% highest-density range.
import { readFileSync } from "node:fs";

export interface Curve { calBP: Float64Array; c14: Float64Array; sigma: Float64Array }

export function loadCurve(path = "data/reference/intcal20.14c"): Curve {
  const rows = readFileSync(path, "utf8").split(/\r?\n/).filter((l) => /^\d/.test(l)).map((l) => l.split(",").map(Number));
  rows.sort((a, b) => a[0] - b[0]); // ascending cal BP
  return { calBP: Float64Array.from(rows, (r) => r[0]), c14: Float64Array.from(rows, (r) => r[1]), sigma: Float64Array.from(rows, (r) => r[2]) };
}

export interface Calibrated { from: number; to: number; median: number } // cal BP, from > to (older first)

/** Calibrate a conventional 14C age (BP ± err). Undefined if outside the curve (> ~50 ka or modern). */
export function calibrate(curve: Curve, bp: number, err: number, step = 1, mass = 0.954): Calibrated | undefined {
  const { calBP, c14, sigma } = curve;
  const lo = calBP[0], hi = calBP[calBP.length - 1];
  if (!(err > 0) || bp - 4 * err > c14[c14.length - 1] || bp + 4 * err < c14[0]) return undefined;
  const years: number[] = [], p: number[] = [];
  let j = 0, total = 0;
  for (let t = lo; t <= hi; t += step) {
    while (j < calBP.length - 2 && calBP[j + 1] < t) j++;
    const f = (t - calBP[j]) / (calBP[j + 1] - calBP[j] || 1);
    const mu = c14[j] + f * (c14[j + 1] - c14[j]);
    const s2 = err * err + (sigma[j] + f * (sigma[j + 1] - sigma[j])) ** 2;
    const v = Math.exp(-((bp - mu) ** 2) / (2 * s2)) / Math.sqrt(s2);
    if (v > 1e-300) { years.push(t); p.push(v); total += v; }
  }
  if (!total) return undefined;
  // Highest-density region: take years in order of probability until `mass` is covered.
  const order = p.map((_, i) => i).sort((a, b) => p[b] - p[a]);
  let acc = 0, minY = Infinity, maxY = -Infinity;
  for (const i of order) { acc += p[i]; minY = Math.min(minY, years[i]); maxY = Math.max(maxY, years[i]); if (acc >= mass * total) break; }
  let cum = 0, median = years[0];
  for (let i = 0; i < p.length; i++) { cum += p[i]; if (cum >= total / 2) { median = years[i]; break; } }
  if (minY === lo || maxY === hi) return undefined; // runs off the curve
  return { from: maxY, to: minY, median };
}
