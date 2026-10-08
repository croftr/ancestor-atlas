import { featuresContaining, iso1A2Code } from "@rapideditor/country-coder";

// A civilization's region is where most of its territory lay, over its whole history: points sampled
// inside each territory map (Cliopatria), weighted by area and by how many years the map covers, are
// placed in a country (country-coder) and so in a UN M49 subregion, renamed and merged below into
// regions that suit the ancient world. A region set by hand in entities.yaml wins.

/** UN M49 subregion code -> region. */
const BY_SUBREGION: Record<string, string> = {
  "145": "Near East", // Western Asia: Anatolia, the Levant, Mesopotamia, Arabia, the Caucasus, Cyprus
  "015": "Egypt & North Africa", // Northern Africa, including Sudan
  "039": "Mediterranean Europe", // Southern Europe
  "143": "Iran & Central Asia",
  "034": "South Asia",
  "030": "East Asia",
  "035": "Southeast Asia",
  "154": "Western & Northern Europe",
  "155": "Western & Northern Europe",
  "151": "Eastern Europe & Steppe", // includes all of Russia
  "202": "Sub-Saharan Africa",
  "013": "Mexico & Central America",
  "005": "South America",
  "021": "North America",
  "029": "Caribbean",
  "053": "Oceania",
  "054": "Oceania",
  "057": "Oceania",
  "061": "Oceania",
};
/** Countries placed apart from their M49 subregion: Iran and Afghanistan are Southern Asia in M49. */
const BY_COUNTRY: Record<string, string> = { IR: "Iran & Central Asia", AF: "Iran & Central Asia" };

export const REGIONS = [...new Set([...Object.values(BY_SUBREGION), ...Object.values(BY_COUNTRY)])];

const cache = new Map<string, string | null>();

/** Region of a point, or null at sea or outside every mapped subregion. */
export function regionAt(lon: number, lat: number): string | null {
  const code = iso1A2Code([lon, lat]);
  if (!code) return null;
  if (BY_COUNTRY[code]) return BY_COUNTRY[code];
  if (cache.has(code)) return cache.get(code)!;
  const m49 = featuresContaining([lon, lat]).map((f) => f.properties.m49).find((m) => m && BY_SUBREGION[m]);
  const region = m49 ? BY_SUBREGION[m49] : null;
  cache.set(code, region);
  return region;
}

type Ring = number[][];
type Geometry = { type: string; coordinates: unknown };

const polygonsOf = (g: Geometry): Ring[][] =>
  g.type === "Polygon" ? [g.coordinates as Ring[]] : g.type === "MultiPolygon" ? (g.coordinates as Ring[][]) : [];

/** Even-odd test against all rings, so holes are excluded. */
function inside(rings: Ring[], x: number, y: number): boolean {
  let hit = false;
  for (const ring of rings)
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
  return hit;
}

/**
 * Area of each region inside a geometry (square degrees scaled by cos(latitude)), from a grid of
 * up to `n` x `n` points over each polygon's bounding box. Points at sea are left out.
 */
export function regionAreas(geometry: Geometry, n = 24): Map<string, number> {
  const out = new Map<string, number>();
  for (const rings of polygonsOf(geometry)) {
    const outer = rings[0];
    if (!outer?.length) continue;
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const [x, y] of outer) [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
    const dx = (x1 - x0) / n;
    const dy = (y1 - y0) / n;
    if (!(dx > 0 && dy > 0)) continue;
    let found = false;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const x = x0 + (i + 0.5) * dx;
        const y = y0 + (j + 0.5) * dy;
        if (!inside(rings, x, y)) continue;
        const r = regionAt(x, y);
        if (!r) continue;
        found = true;
        out.set(r, (out.get(r) ?? 0) + dx * dy * Math.cos((y * Math.PI) / 180));
      }
    // A polygon too small or too coastal for any grid point to land: use its vertices instead.
    if (!found)
      for (const [x, y] of outer) {
        const r = regionAt(x, y);
        if (r) out.set(r, (out.get(r) ?? 0) + 1e-9);
      }
  }
  return out;
}

/** Add `weight` times each area in `from` into `into`. */
export function addAreas(into: Map<string, number>, from: Map<string, number>, weight = 1) {
  for (const [r, a] of from) into.set(r, (into.get(r) ?? 0) + a * weight);
}

/** The region with the largest share, and that share (0..1); undefined when nothing was placed. */
export function topRegion(areas: Map<string, number>): { region: string; share: number } | undefined {
  let total = 0;
  let best: [string, number] | undefined;
  for (const [r, a] of areas) {
    total += a;
    if (!best || a > best[1]) best = [r, a];
  }
  return best && total > 0 ? { region: best[0], share: best[1] / total } : undefined;
}
