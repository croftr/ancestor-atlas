/**
 * A point well inside a territory, for the badge on a selected civilization: the "pole of
 * inaccessibility" (the inside point farthest from any edge) of its largest polygon, found by a
 * coarse grid search refined twice around the best cell. A bounding-box centre can fall outside
 * a crescent or coastal strip; this can't. Works in plain lon/lat, which is fine at this scale.
 */
type Ring = number[][];
type Polygon = Ring[];

const ringArea = (r: Ring) => {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]);
  return Math.abs(a / 2);
};

/** Signed distance from (x, y) to the polygon's edges: positive inside, negative outside. */
function signedDistance(x: number, y: number, poly: Polygon): number {
  let inside = false;
  let min = Infinity;
  for (const ring of poly) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [ax, ay] = ring[i];
      const [bx, by] = ring[j];
      if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
      // Distance to segment a–b.
      const dx = bx - ax, dy = by - ay;
      const len = dx * dx + dy * dy;
      const t = len ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len)) : 0;
      const ex = ax + t * dx - x, ey = ay + t * dy - y;
      min = Math.min(min, ex * ex + ey * ey);
    }
  }
  return (inside ? 1 : -1) * Math.sqrt(min);
}

export function polygonAnchor(geometry: { type: string; coordinates: unknown } | null): [number, number] | null {
  if (!geometry) return null;
  const polys: Polygon[] =
    geometry.type === "Polygon" ? [geometry.coordinates as Polygon]
    : geometry.type === "MultiPolygon" ? (geometry.coordinates as Polygon[])
    : [];
  if (polys.length === 0) return null;
  const poly = polys.reduce((a, b) => (ringArea(b[0]) > ringArea(a[0]) ? b : a));
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const [x, y] of poly[0]) {
    w = Math.min(w, x); e = Math.max(e, x);
    s = Math.min(s, y); n = Math.max(n, y);
  }
  let best: [number, number] = [(w + e) / 2, (s + n) / 2];
  let bestD = signedDistance(best[0], best[1], poly);
  let cx = best[0], cy = best[1], hw = (e - w) / 2, hh = (n - s) / 2;
  const N = 16;
  for (let round = 0; round < 3; round++) {
    for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++) {
        const x = cx - hw + ((i + 0.5) / N) * 2 * hw;
        const y = cy - hh + ((j + 0.5) / N) * 2 * hh;
        const d = signedDistance(x, y, poly);
        if (d > bestD) { bestD = d; best = [x, y]; }
      }
    // Zoom the grid in around the best point so far.
    [cx, cy] = best;
    hw /= N / 4;
    hh /= N / 4;
  }
  return best;
}
