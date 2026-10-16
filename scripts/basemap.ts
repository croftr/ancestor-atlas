// Splits the basemap's land polygons at the antimeridian:
//   npx tsx scripts/basemap.ts
// Rewrites public/data/basemap/land.geojson (Natural Earth) in place; safe to run again.
//
// A few Natural Earth polygons run across ±180° (Eurasia with Chukotka, Wrangel Island, a Fiji sliver), joined by
// edges from 179.9° to −180°. On the map those edges run the other way, right round the world, so Eurasia's ring
// crossed Norway's coast at 65°N and 69°N and the fill triangulated into straight-edged wedges over western Europe.
// Here each such polygon is unwrapped to continuous longitudes and clipped into one piece per side of the line.
// Antarctica's ring was closed the same way, along 84°S (across its own Ross and Filchner coasts); it is closed
// through the South Pole instead.
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "public/data/basemap/land.geojson";

type Pt = [number, number];
type Ring = Pt[];

/** Whether an edge jumps across ±180° (an edge along a pole, as Antarctica's after this script, does no harm). */
const crossesAntimeridian = (ring: Ring) =>
  ring.some((p, i) => i > 0 && Math.abs(p[0] - ring[i - 1][0]) > 180 && !(Math.abs(p[1]) === 90 && p[1] === ring[i - 1][1]));

/** The ring with each longitude shifted by whole turns so no edge is longer than half a turn. */
function unwrap(ring: Ring): Ring {
  const out: Ring = [ring[0]];
  let shift = 0;
  for (let i = 1; i < ring.length; i++) {
    const dx = ring[i][0] + shift - out[i - 1][0];
    if (dx > 180) shift -= 360;
    else if (dx < -180) shift += 360;
    out.push([ring[i][0] + shift, ring[i][1]]);
  }
  return out;
}

/** Sutherland–Hodgman: the part of a closed ring with keep(x) true, cut along the line x = at. */
function clip(ring: Ring, at: number, keep: (x: number) => boolean): Ring {
  const out: Ring = [];
  for (let i = 0; i + 1 < ring.length; i++) {
    const [a, b] = [ring[i], ring[i + 1]];
    const [ina, inb] = [keep(a[0]), keep(b[0])];
    if (ina) out.push(a);
    if (ina !== inb && a[0] !== at && b[0] !== at) out.push([at, a[1] + ((at - a[0]) / (b[0] - a[0])) * (b[1] - a[1])]);
  }
  if (out.length) out.push(out[0]);
  return out;
}

const area = (r: Ring) => {
  let s = 0;
  for (let i = 0; i + 1 < r.length; i++) s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
  return s / 2;
};
const round = (v: number) => Math.round(v * 1e6) / 1e6;

/**
 * A ring that goes once round a pole (Antarctica) and was closed by an edge back round the world, re-closed
 * through the pole instead: unwrapped from just after that edge, then down to the pole and back along it.
 */
function closeRoundPole(ring: Ring): Ring {
  const pts = ring.slice(0, -1);
  const j = pts.findIndex((p, i) => Math.abs(pts[(i + 1) % pts.length][0] - p[0]) > 180);
  const path = unwrap([...pts.slice(j + 1), ...pts.slice(0, j + 1)]);
  const pole = path.reduce((s, p) => s + p[1], 0) < 0 ? -90 : 90;
  const first = path[0];
  // The start again, one turn on: the coast meets itself across the line.
  const end: Pt = [first[0] + 360 * Math.sign(path[path.length - 1][0] - first[0]), first[1]];
  return [...path, end, [end[0], pole], [first[0], pole], first];
}

function split(poly: Ring[]): Ring[][] {
  if (!poly.some(crossesAntimeridian)) return [poly];
  const rings = poly
    .map(unwrap)
    .map((r, i) => (Math.abs(r[0][0] - r[r.length - 1][0]) > 1e-9 ? closeRoundPole(poly[i]) : r))
    .filter((r) => Math.abs(area(r)) >= 1e-9);
  // Holes on the same side as the outer ring.
  const mid = (r: Ring) => (Math.min(...r.map((p) => p[0])) + Math.max(...r.map((p) => p[0]))) / 2;
  const outerMid = mid(rings[0]);
  for (const r of rings.slice(1)) {
    const turns = Math.round((outerMid - mid(r)) / 360);
    for (const p of r) p[0] += turns * 360;
  }
  const xs = rings[0].map((p) => p[0]);
  const out: Ring[][] = [];
  // One piece per whole-turn window [k·360 − 180, k·360 + 180] the polygon reaches, moved back into −180..180.
  for (let k = Math.floor((Math.min(...xs) + 180) / 360); k <= Math.floor((Math.max(...xs) + 180) / 360); k++) {
    const lo = k * 360 - 180, hi = k * 360 + 180;
    const pieces = rings
      .map((r) => clip(clip(r, lo, (x) => x >= lo), hi, (x) => x <= hi))
      .map((r) => r.map(([x, y]): Pt => [round(x - k * 360), y]));
    if (pieces[0].length < 4 || Math.abs(area(pieces[0])) < 1e-9) continue;
    out.push(pieces.filter((r) => r.length >= 4 && Math.abs(area(r)) >= 1e-9));
  }
  return out;
}

const fc = JSON.parse(readFileSync(FILE, "utf8"));
let changed = 0;
for (const feature of fc.features) {
  const g = feature.geometry;
  const polys: Ring[][] = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  const next = polys.flatMap((p) => {
    const s = split(p);
    if (s.length !== 1 || s[0] !== p) changed++;
    return s;
  });
  feature.geometry = { type: "MultiPolygon", coordinates: next };
}
writeFileSync(FILE, JSON.stringify(fc));
console.log(`Split ${changed} polygon(s) at the antimeridian`);
