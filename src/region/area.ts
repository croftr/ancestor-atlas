import { useEffect, useState } from "react";
import { unionBBox, type BBox } from "../map/data";
import { polygonDistanceKm } from "./region";

type CountryCoder = typeof import("@rapideditor/country-coder");
type CoderFeature = NonNullable<ReturnType<CountryCoder["feature"]>>;

/**
 * The widest choices on the place card after the radii: the country and the continent of the
 * clicked point, from country-coder's borders (UN M49 regions, with North and South America apart).
 */
export type AreaLevel = "country" | "continent";

export interface Area {
  level: AreaLevel;
  /** country-coder feature id ("BR", "005"). */
  id: string;
  /** Its outline file, `public/data/areas/<key>.json` (scripts/areas.ts). */
  key: string;
  name: string;
  /** country-coder's shape, which takes in coastal waters (so drowned and coastal sites count). */
  geometry: GeoJSON.MultiPolygon;
  /** For flying to it; east may pass 180 when it crosses the antimeridian (as `unionBBox`). */
  bbox: BBox;
  contains(lon: number, lat: number): boolean;
}

/** Sites just off the (coarse) coastline still count, within this distance of the area. */
const COAST_KM = 25;
const COAST_DEG = 0.5;

/** Shorter names than country-coder's official ones. */
const COUNTRY_NAMES: Record<string, string> = {
  CN: "China",
  US: "United States",
  CD: "DR Congo",
  CG: "Republic of the Congo",
};

let coder: CountryCoder | null = null;
let loading: Promise<CountryCoder> | null = null;

/** Loads country-coder (about 700 kB of borders) the first time a place card needs it. */
export function loadAreas(): Promise<CountryCoder> {
  loading ??= import("@rapideditor/country-coder").then((m) => (coder = m));
  return loading;
}

/** True once `loadAreas` has finished: `areaAt` answers from then on. */
export function useAreasReady(on = true): boolean {
  const [ready, setReady] = useState(coder !== null);
  useEffect(() => {
    if (!on || ready) return;
    let live = true;
    loadAreas().then(() => live && setReady(true));
    return () => void (live = false);
  }, [on, ready]);
  return ready;
}

const ringBBox = (ring: number[][]): BBox => {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const [x, y] of ring) {
    if (x < w) w = x;
    if (x > e) e = x;
    if (y < s) s = y;
    if (y > n) n = y;
  }
  return [w, s, e, n];
};

const polygonsOf = (geom: GeoJSON.Geometry | null): number[][][][] =>
  !geom ? [] : geom.type === "Polygon" ? [geom.coordinates] : geom.type === "MultiPolygon" ? geom.coordinates : [];

/**
 * The country and continent from country-coder's features containing a point or feature (most specific
 * first). The continent is the UN M49 region, except that the Americas are North America (with Central
 * America and the Caribbean) and South America. The country is the nearest feature that is a country or
 * a territory with its own ISO code (Greenland, Puerto Rico).
 */
export function classify(hits: CoderFeature[]): { country: CoderFeature | null; continent: CoderFeature | null } {
  if (!hits.some((h) => h.geometry)) return { country: null, continent: null };
  const continent =
    hits.find((h) => h.properties.id === "005" || h.properties.id === "003") ??
    hits.find((h) => h.properties.level === "region" && h.properties.id !== "001") ??
    null;
  const country =
    hits.find((h) => h.properties.level === "country" || (h.properties.level === "territory" && h.properties.iso1A2)) ??
    null;
  return { country, continent };
}

export const areaKey = (level: AreaLevel, countryId: string | null, continentId: string) =>
  level === "continent" ? `continent-${continentId}` : `country-${countryId}-${continentId}`;

function makeArea(cc: CountryCoder, level: AreaLevel, f: CoderFeature, polygons: number[][][][], within: string[]): Area {
  const id = f.properties.id;
  const parts = polygons.map((rings) => ({ rings, bbox: ringBBox(rings[0]) }));
  const near = (lon: number, lat: number, pad: number) =>
    parts.filter(({ bbox: b }) => lon >= b[0] - pad && lon <= b[2] + pad && lat >= b[1] - pad && lat <= b[3] + pad);
  return {
    level,
    id,
    key: areaKey(level, within.length > 1 ? within[0] : null, within[within.length - 1]),
    name: COUNTRY_NAMES[id] ?? f.properties.nameEn,
    geometry: { type: "MultiPolygon", coordinates: polygons },
    bbox: unionBBox(parts.map((p) => p.bbox)) ?? [-180, -85, 180, 85],
    contains(lon, lat) {
      const candidates = near(lon, lat, COAST_DEG);
      if (candidates.length === 0) return false;
      const hits = cc.featuresContaining([lon, lat]);
      if (hits.some((h) => h.geometry)) {
        const ids = new Set(hits.map((h) => h.properties.id));
        return within.every((w) => ids.has(w));
      }
      // At sea on country-coder's coastline: count it if the area's coast is close.
      return candidates.some(({ rings }) => polygonDistanceKm(lon, lat, { type: "Polygon", coordinates: rings }) <= COAST_KM);
    },
  };
}

const cache = new Map<string, Area>();

/**
 * The country or continent containing (lon, lat), or null (at sea, or before `loadAreas`).
 * A country is cut to the continent of the point: European or Asian Russia, the contiguous US
 * and Alaska but not Hawaii, metropolitan France without French Guiana.
 */
export function areaAt(lon: number, lat: number, level: AreaLevel): Area | null {
  const cc = coder;
  if (!cc) return null;
  const { country, continent } = classify(cc.featuresContaining([lon, lat]));
  if (!continent) return null;
  const continentId = continent.properties.id;

  if (level === "continent") {
    const key = `continent:${continentId}`;
    let area = cache.get(key);
    if (!area) {
      const agg = cc.aggregateFeature(continentId);
      area = makeArea(cc, "continent", continent, polygonsOf(agg?.geometry ?? null), [continentId]);
      cache.set(key, area);
    }
    return area;
  }

  if (!country) return null;
  const countryId = country.properties.id;
  const key = `country:${countryId}:${continentId}`;
  let area = cache.get(key);
  if (!area) {
    const leaves = country.geometry ? [country] : cc.featuresIn(countryId, true).filter((f) => f.geometry);
    const polygons = leaves
      .filter((f) => cc.featuresContaining(f.properties.id).some((g) => g.properties.id === continentId))
      .flatMap((f) => polygonsOf(f.geometry));
    area = makeArea(cc, "country", country, polygons, [countryId, continentId]);
    cache.set(key, area);
  }
  return area;
}

const outlines = new Map<string, GeoJSON.MultiPolygon | null>();
const outlineLoads = new Map<string, Promise<GeoJSON.MultiPolygon | null>>();

/** The area cut to the land the globe draws, once fetched (`loadOutline`); undefined until then. */
export const outlineOf = (area: Area): GeoJSON.MultiPolygon | null | undefined => outlines.get(area.key);

export function loadOutline(area: Area): Promise<GeoJSON.MultiPolygon | null> {
  let p = outlineLoads.get(area.key);
  if (!p) {
    p = fetch(`/data/areas/${area.key}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<GeoJSON.MultiPolygon>) : null))
      .catch(() => null)
      .then((g) => (outlines.set(area.key, g), g));
    outlineLoads.set(area.key, p);
  }
  return p;
}

/** The area's outline on land for the place layer (same `kind`s as `circleGeoJSON`). */
export function areaGeoJSON(outline: GeoJSON.MultiPolygon | null, lon: number, lat: number): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      ...(outline ? [{ type: "Feature" as const, geometry: outline, properties: { kind: "circle", area: true } }] : []),
      { type: "Feature", geometry: { type: "Point", coordinates: [lon, lat] }, properties: { kind: "center" } },
    ],
  };
}
