// Builds public/data/areas/: the outlines drawn on the globe when the place card ("What Was Here?",
// src/region/PlaceCard.tsx) searches a whole country or continent:
//   npm run data:areas
// One file per area, named as `areaKey` in src/region/area.ts (country-BR-005.json, continent-150.json), holding a
// GeoJSON MultiPolygon. country-coder's shapes take in coastal waters (which is right for deciding which sites
// count), so each is cut here to the Natural Earth land the globe draws (public/data/basemap/land.geojson).
// Committed; not part of the data build or its fingerprint. Rerun after updating country-coder or the basemap.
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import * as cc from "@rapideditor/country-coder";
import polygonClipping, { type MultiPolygon, type Polygon } from "polygon-clipping";
import { areaKey, classify } from "../src/region/area.ts";

const OUT = "public/data/areas";
const DECIMALS = 2; // about a kilometre, the basemap's own precision

type BBox = [number, number, number, number];
const bboxOf = (ring: number[][]): BBox => {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const [x, y] of ring) {
    w = Math.min(w, x);
    e = Math.max(e, x);
    s = Math.min(s, y);
    n = Math.max(n, y);
  }
  return [w, s, e, n];
};
const overlaps = (a: BBox, b: BBox) => !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
const polygonsOf = (g: GeoJSON.Geometry | null | undefined): Polygon[] =>
  !g ? [] : g.type === "Polygon" ? [g.coordinates as Polygon] : g.type === "MultiPolygon" ? (g.coordinates as MultiPolygon) : [];

const land = JSON.parse(readFileSync("public/data/basemap/land.geojson", "utf8")) as GeoJSON.FeatureCollection;
const landPolys = land.features.flatMap((f) => polygonsOf(f.geometry));
const landBoxes = landPolys.map((p) => bboxOf(p[0]));

function onLand(polys: Polygon[]): MultiPolygon {
  const out: MultiPolygon = [];
  for (const p of polys) {
    const box = bboxOf(p[0]);
    const near = landPolys.filter((_, i) => overlaps(box, landBoxes[i]));
    if (near.length) out.push(...polygonClipping.intersection([p], near));
  }
  return out;
}

const round = (v: number) => Math.round(v * 10 ** DECIMALS) / 10 ** DECIMALS;
/** Twice the signed area (shoelace); positive when counter-clockwise. */
const signedArea = (ring: [number, number][]) => {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] + ring[i][0]) * (ring[i][1] - ring[j][1]);
  return a;
};
// Rounded, without repeated points or slivers, and wound as the basemap's land is (outer rings clockwise,
// holes counter-clockwise): wound the other way, MapLibre left parts of a continent unfilled on the globe.
function tidy(mp: MultiPolygon): MultiPolygon {
  const out: MultiPolygon = [];
  for (const poly of mp) {
    const rings = poly
      .map((ring) => ring.map(([x, y]) => [round(x), round(y)] as [number, number]))
      .map((ring) => ring.filter((pt, i) => i === 0 || pt[0] !== ring[i - 1][0] || pt[1] !== ring[i - 1][1]))
      .map((ring, i) => ((signedArea(ring) > 0) === (i === 0) ? ring.reverse() : ring));
    const ok = (ring: [number, number][]) => ring.length >= 4 && signedArea(ring) !== 0;
    if (ok(rings[0])) out.push(rings.filter(ok));
  }
  return out;
}

// Group the leaf shapes (the ones with geometry) by country-within-continent, as `areaAt` does.
const countries = new Map<string, Polygon[]>();
const continents = new Set<string>();
for (const leaf of cc.borders.features) {
  if (!leaf.geometry) continue;
  const { country, continent } = classify(cc.featuresContaining(leaf.properties.id));
  if (!continent) continue;
  continents.add(continent.properties.id);
  if (!country) continue;
  const key = areaKey("country", country.properties.id, continent.properties.id);
  countries.set(key, [...(countries.get(key) ?? []), ...polygonsOf(leaf.geometry)]);
}

// Empty the folder but keep it: a running Vite dev server serves a recreated folder's files as missing.
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) rmSync(`${OUT}/${f}`);
let bytes = 0;
const write = (key: string, mp: MultiPolygon) => {
  const json = JSON.stringify({ type: "MultiPolygon", coordinates: tidy(mp) });
  writeFileSync(`${OUT}/${key}.json`, json);
  bytes += json.length;
};
for (const [key, polys] of countries) write(key, onLand(polys));
for (const id of continents) {
  const t = Date.now();
  // country-coder's continent is its countries side by side: merge them first, so only the coast is outlined.
  const polys = polygonsOf(cc.aggregateFeature(id)?.geometry);
  write(areaKey("continent", null, id), onLand(polys.length ? polygonClipping.union(polys) : []));
  console.log(`continent ${id}: ${((Date.now() - t) / 1000).toFixed(1)} s`);
}
console.log(`${countries.size} countries, ${continents.size} continents, ${(bytes / 1e6).toFixed(1)} MB in ${OUT}`);
