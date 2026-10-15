import type { Route } from "./routes";

/** A point of a route's line and the year the line reaches it. */
export interface TimedPoint {
  lon: number;
  lat: number;
  year: number;
}

/** Where each site on the globe is, and its date range (for a route's dated waypoints). */
export type SiteLookup = (id: string) => { lon: number; lat: number; start_year: number; end_year: number } | undefined;

const RAD = Math.PI / 180;

/** Great-circle angle between two points, in radians. */
function angle(a: [number, number], b: [number, number]): number {
  const [l1, p1] = [a[0] * RAD, a[1] * RAD], [l2, p2] = [b[0] * RAD, b[1] * RAD];
  const h = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2;
  return 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The point a fraction t of the way along the great circle from a to b. */
function slerp(a: [number, number], b: [number, number], t: number): [number, number] {
  const d = angle(a, b);
  if (d < 1e-9) return a;
  const [l1, p1] = [a[0] * RAD, a[1] * RAD], [l2, p2] = [b[0] * RAD, b[1] * RAD];
  const A = Math.sin((1 - t) * d) / Math.sin(d), B = Math.sin(t * d) / Math.sin(d);
  const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
  const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
  const z = A * Math.sin(p1) + B * Math.sin(p2);
  return [Math.atan2(y, x) / RAD, Math.atan2(z, Math.hypot(x, y)) / RAD];
}

/** Degrees of arc between the points a route's line is drawn through. */
const STEP_DEG = 1.5;

/**
 * A route as a line of timed points: dated at its sites (the middle of each site's range), the `via`
 * points in between timed by distance, densified along great circles. Throws if a site is missing.
 */
export function timeline(route: Route, site: SiteLookup): TimedPoint[] {
  const pts = route.waypoints.map((w) => {
    if ("site" in w) {
      const s = site(w.site);
      if (!s) throw new Error(`route ${route.id}: no site ${w.site} on the globe`);
      return { at: [s.lon, s.lat] as [number, number], year: Math.round((s.start_year + s.end_year) / 2) };
    }
    return { at: w.via, year: NaN };
  });
  // Time the via points by distance between the dated points either side.
  const dist = [0];
  for (let i = 1; i < pts.length; i++) dist.push(dist[i - 1] + angle(pts[i - 1].at, pts[i].at));
  for (let i = 0; i < pts.length; i++) {
    if (!Number.isNaN(pts[i].year)) continue;
    let a = i - 1, b = i + 1;
    while (a >= 0 && Number.isNaN(pts[a].year)) a--;
    while (b < pts.length && Number.isNaN(pts[b].year)) b++;
    if (a < 0 || b >= pts.length) throw new Error(`route ${route.id}: must start and end at a site`);
    const t = (dist[i] - dist[a]) / (dist[b] - dist[a] || 1);
    pts[i].year = pts[a].year + t * (pts[b].year - pts[a].year);
  }
  const out: TimedPoint[] = [{ lon: pts[0].at[0], lat: pts[0].at[1], year: pts[0].year }];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const n = Math.max(1, Math.ceil(angle(a.at, b.at) / RAD / STEP_DEG));
    for (let k = 1; k <= n; k++) {
      const [lon, lat] = slerp(a.at, b.at, k / n);
      out.push({ lon, lat, year: a.year + ((b.year - a.year) * k) / n });
    }
  }
  return out;
}

/**
 * The part of a route drawn at `year`: its points up to there, ending at a point between two of them.
 * Empty before the route starts or after `until`; `growing` while it has not reached its last site.
 */
export function drawnAt(points: TimedPoint[], year: number, until: number): { line: [number, number][]; growing: boolean } {
  if (points.length < 2 || year < points[0].year || year > until) return { line: [], growing: false };
  const line: [number, number][] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.year <= year) {
      line.push([p.lon, p.lat]);
      continue;
    }
    const q = points[i - 1];
    const t = (year - q.year) / (p.year - q.year || 1);
    if (t > 0) line.push(slerp([q.lon, q.lat], [p.lon, p.lat], t));
    return { line, growing: true };
  }
  return { line, growing: false };
}

/**
 * Splits a line where it crosses the antimeridian, so each piece stays within -180..180 and the
 * map doesn't draw it the long way round.
 */
export function splitAtAntimeridian(line: [number, number][]): [number, number][][] {
  if (line.length === 0) return [];
  const parts: [number, number][][] = [[line[0]]];
  for (let i = 1; i < line.length; i++) {
    const [x1, y1] = line[i - 1], [x2, y2] = line[i];
    if (Math.abs(x2 - x1) > 180) {
      const edge = x1 > 0 ? 180 : -180;
      const x2u = x2 + (x1 > 0 ? 360 : -360); // x2 unwrapped to x1's side
      const t = (edge - x1) / (x2u - x1);
      const y = y1 + t * (y2 - y1);
      parts[parts.length - 1].push([edge, y]);
      parts.push([[-edge, y]]);
    }
    parts[parts.length - 1].push([x2, y2]);
  }
  return parts.filter((p) => p.length > 1);
}

/** Compass bearing (degrees clockwise from north) from a to b, for the arrowhead. */
export function bearing(a: [number, number], b: [number, number]): number {
  const [l1, p1] = [a[0] * RAD, a[1] * RAD], [l2, p2] = [b[0] * RAD, b[1] * RAD];
  const y = Math.sin(l2 - l1) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(l2 - l1);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}

/** The routes drawn at `year`, as GeoJSON: a line per route, and an arrowhead on each still growing. */
export function routesGeoJSON(routes: { route: Route; points: TimedPoint[] }[], year: number): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const { route, points } of routes) {
    const { line, growing } = drawnAt(points, year, route.until);
    if (line.length < 2) continue;
    const props = { id: route.id, color: route.color };
    features.push({ type: "Feature", properties: props, geometry: { type: "MultiLineString", coordinates: splitAtAntimeridian(line) } });
    if (growing) {
      const head = line[line.length - 1];
      features.push({
        type: "Feature",
        properties: { ...props, head: true, bearing: bearing(line[line.length - 2], head) },
        geometry: { type: "Point", coordinates: head },
      });
    }
  }
  return { type: "FeatureCollection", features };
}
