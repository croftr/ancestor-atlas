import { isActive, unionBBox, type BBox, type Data } from "../map/data";
import { stopYear } from "./summary";
import type { Tour } from "./tours";

/**
 * A tour's epilogue, after its last stop: the card closes, the globe pulls back and the journey is
 * drawn again as one glowing thread from stop to stop (map/MapView.tsx), while the end card
 * (EndCard.tsx) lights each stop's picture as the thread reaches it. The music plays on, then fades.
 * Both follow the schedule here, on the epilogue's own clock (frozen while the tour is paused).
 */

/**
 * The thread starts at the first stop this long after the epilogue starts: time for the card to close
 * and the globe to pull back and turn there from the last stop.
 */
export const TRAIL_DELAY_MS = 2_600;
/** Time from one stop to the next: one beat each, so a long tour draws faster (at most TRAIL_MAX_MS in all). */
const BEAT_MS = 1_400;
const TRAIL_MAX_MS = 14_000;
/** The music plays on at full level this long, then fades over MUSIC_FADE_S; the epilogue is then over. */
export const MUSIC_HOLD_MS = 17_000;
export const MUSIC_FADE_S = 12;
export const EPILOGUE_MS = MUSIC_HOLD_MS + MUSIC_FADE_S * 1000;

export type LngLat = [number, number];

export const beatMs = (n: number) => (n <= 1 ? 0 : Math.min(BEAT_MS, TRAIL_MAX_MS / (n - 1)));
/** When the thread reaches stop `i` of `n` (ms into the epilogue). */
export const reachedAt = (i: number, n: number) => TRAIL_DELAY_MS + i * beatMs(n);

/** Where each stop sits on the globe: the middle of what its card showed (that site, or the entity's features then). */
export function trailPoints(tour: Tour, d: Data): LngLat[] {
  return tour.stops.flatMap((stop) => {
    const year = stopYear(stop, d);
    const all = d.featuresOf.get(stop.entity) ?? [];
    const on = all.filter((f) => (stop.site ? f.id === stop.site : year !== null && isActive(f, year)));
    const boxes = (on.length ? on : all).flatMap((f) => {
      const b = d.bboxOf.get(f.id);
      return b ? [b] : [];
    });
    const box = unionBBox(boxes);
    return box ? [centre(box)] : [];
  });
}

const centre = ([w, s, e, n]: BBox): LngLat => [wrap((w + e) / 2), (s + n) / 2];
const wrap = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180;
const rad = Math.PI / 180;

/** Points along the great circle from a to b, about one per two degrees, a and b included. */
export function greatCircle(a: LngLat, b: LngLat): LngLat[] {
  const v = (p: LngLat) => [Math.cos(p[1] * rad) * Math.cos(p[0] * rad), Math.cos(p[1] * rad) * Math.sin(p[0] * rad), Math.sin(p[1] * rad)];
  const [p, q] = [v(a), v(b)];
  const dot = Math.min(1, Math.max(-1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2]));
  const angle = Math.acos(dot);
  if (angle < 1e-6) return [a, b];
  const steps = Math.max(1, Math.ceil(angle / (2 * rad)));
  const out: LngLat[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const k1 = Math.sin((1 - t) * angle) / Math.sin(angle);
    const k2 = Math.sin(t * angle) / Math.sin(angle);
    const [x, y, z] = [k1 * p[0] + k2 * q[0], k1 * p[1] + k2 * q[1], k1 * p[2] + k2 * q[2]];
    out.push([Math.atan2(y, x) / rad, Math.atan2(z, Math.hypot(x, y)) / rad]);
  }
  return out;
}

/** Keep longitudes continuous along a line (179 then 181, not -179), so it never jumps round the world. */
export function unwrap(line: LngLat[]): LngLat[] {
  const out: LngLat[] = [];
  for (const [lon, lat] of line) {
    const prev = out[out.length - 1];
    let l = lon;
    if (prev) while (l - prev[0] > 180) l -= 360;
    if (prev) while (prev[0] - l > 180) l += 360;
    out.push([l, lat]);
  }
  return out;
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export interface TrailFrame {
  /** The thread drawn so far (continuous longitudes). */
  line: LngLat[];
  /** Its moving end, while it is still being drawn. */
  head: LngLat | null;
  /** Stops reached so far, with how long ago (ms). */
  reached: { index: number; at: LngLat; age: number }[];
}

/** Precomputes a tour's thread; `at(ms)` gives what is drawn that far into the epilogue. */
export function trail(points: LngLat[]) {
  const n = points.length;
  const arcs = points.slice(1).map((p, i) => greatCircle(points[i], p));
  return {
    end: reachedAt(Math.max(0, n - 1), n),
    at(ms: number): TrailFrame {
      const reached = points.flatMap((at, index) => (ms >= reachedAt(index, n) ? [{ index, at, age: ms - reachedAt(index, n) }] : []));
      const line: LngLat[] = n && ms >= TRAIL_DELAY_MS ? [points[0]] : [];
      let head: LngLat | null = null;
      for (let i = 0; i < arcs.length; i++) {
        const t = (ms - reachedAt(i, n)) / beatMs(n);
        if (t <= 0) break;
        const arc = arcs[i];
        if (t >= 1) {
          line.push(...arc.slice(1));
          continue;
        }
        // Part way along this arc: up to the point between two of its vertices.
        const x = ease(t) * (arc.length - 1);
        const j = Math.floor(x);
        line.push(...arc.slice(1, j + 1));
        const [a, b] = [arc[j], arc[Math.min(j + 1, arc.length - 1)]];
        const f = x - j;
        const [ua, ub] = unwrap([a, b]);
        head = [ua[0] + (ub[0] - ua[0]) * f, a[1] + (b[1] - a[1]) * f];
        line.push(head);
        break;
      }
      return { line: unwrap(line), head, reached };
    },
  };
}

/** A span of years in words for the end card: "7 million years", "45,000 years", "3,500 years". */
export function spanWords(years: number): string {
  const y = Math.abs(years);
  if (y >= 1_000_000) return `${+(y / 1e6).toFixed(1)} million years`;
  const unit = y >= 10_000 ? 10 ** (Math.floor(Math.log10(y)) - 1) : y >= 1_000 ? 100 : 1;
  const r = Math.round(y / unit) * unit;
  return `${r.toLocaleString("en-US")} ${r === 1 ? "year" : "years"}`;
}
