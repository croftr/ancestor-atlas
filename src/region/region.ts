import type { BBox, Data } from "../map/data";
import type { DnaData, DnaSite } from "../dna/types";
import type { Category, Entity, FeatureProps } from "../types";
import { CATEGORIES } from "../types";
import type { Area } from "./area";

export const DEFAULT_RADIUS_KM = 300;
export const RADIUS_OPTIONS_KM = [150, 300, 500] as const;

const EARTH_RADIUS_KM = 6371;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export interface RegionEntry {
  entity: Entity;
  /** Earliest start_year of this entity's features within the search radius. */
  localStart: number;
  /** Latest end_year of this entity's features within the search radius. */
  localEnd: number;
  /** Number of features (sites or territory periods) of this entity within the radius. */
  siteCount: number;
  /** The feature closest to the queried centre point. */
  closestFeature: FeatureProps;
  /** Great-circle distance in km to the closest feature (0 when inside a polygon). */
  distanceKm: number;
  /** All features of this entity within the radius, nearest first. */
  localFeatures: FeatureProps[];
}

export interface RegionDnaSite {
  site: DnaSite;
  distanceKm: number;
}

export interface RegionResult {
  lon: number;
  lat: number;
  radiusKm: number;
  /** Set when the search covers a whole country or continent instead of the radius. */
  area: Area | null;
  title: string;
  entries: RegionEntry[];
  dnaSites: RegionDnaSite[];
  dnaPeopleCount: number;
  counts: Record<Category, number>;
  earliestYear: number | null;
  latestYear: number | null;
}

/** Great-circle (Haversine) distance in kilometres between two [lon, lat] points. */
export function distanceKm(a: [number, number], b: [number, number]): number {
  const dLat = (b[1] - a[1]) * DEG_TO_RAD;
  const dLon = (b[0] - a[0]) * DEG_TO_RAD;
  const lat1 = a[1] * DEG_TO_RAD;
  const lat2 = b[1] * DEG_TO_RAD;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Destination point [lon, lat] from (lon, lat) along `bearingDeg` (0 = north, 90 = east) by `distKm`. */
export function destinationPoint(lon: number, lat: number, bearingDeg: number, distKm: number): [number, number] {
  const ang = distKm / EARTH_RADIUS_KM;
  const brng = bearingDeg * DEG_TO_RAD;
  const lat1 = lat * DEG_TO_RAD;
  const lon1 = lon * DEG_TO_RAD;

  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);
  const sinAng = Math.sin(ang);
  const cosAng = Math.cos(ang);

  const sinLat2 = sinLat1 * cosAng + cosLat1 * sinAng * Math.cos(brng);
  const lat2 = Math.asin(Math.max(-1, Math.min(1, sinLat2)));
  const y = Math.sin(brng) * sinAng * cosLat1;
  const x = cosAng - sinLat1 * sinLat2;
  const lon2 = lon1 + Math.atan2(y, x);

  // Keep longitude continuous around `lon` so circles near ±180° don't tear across the globe.
  let degLon = lon2 * RAD_TO_DEG;
  while (degLon - lon > 180) degLon -= 360;
  while (degLon - lon < -180) degLon += 360;
  return [degLon, lat2 * RAD_TO_DEG];
}

/** GeoJSON polygon + centre point for drawing the regional search circle on the globe. */
export function circleGeoJSON(lon: number, lat: number, radiusKm: number, steps = 64): GeoJSON.FeatureCollection {
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const bearing = (i / steps) * 360;
    ring.push(destinationPoint(lon, lat, bearing, radiusKm));
  }
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [ring] },
        properties: { kind: "circle" },
      },
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [lon, lat] },
        properties: { kind: "center" },
      },
    ],
  };
}

/** Bounding box [west, south, east, north] enclosing a circle of `radiusKm` around (lon, lat). */
export function circleBBox(lon: number, lat: number, radiusKm: number): BBox {
  const dLat = (radiusKm / EARTH_RADIUS_KM) * RAD_TO_DEG;
  const cosLat = Math.max(0.05, Math.cos(lat * DEG_TO_RAD));
  const dLon = (radiusKm / (EARTH_RADIUS_KM * cosLat)) * RAD_TO_DEG;
  return [
    Math.max(-180, lon - dLon),
    Math.max(-85, lat - dLat),
    Math.min(180, lon + dLon),
    Math.min(85, lat + dLat),
  ];
}

/** Format a [lon, lat] coordinate pair as e.g. "32.5°N, 35.1°E". */
export function formatCoords(lon: number, lat: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(1)}°${ns}, ${Math.abs(lon).toFixed(1)}°${ew}`;
}

/** Ray-casting point-in-ring check for a closed ring of [lon, lat] vertices. */
function pointInRing(lon: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Point-in-polygon check (exterior ring minus any interior hole rings). */
function pointInPolygonRings(lon: number, lat: number, rings: number[][][]): boolean {
  if (rings.length === 0 || !pointInRing(lon, lat, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(lon, lat, rings[i])) return false;
  }
  return true;
}

/** Minimum distance in km from [lon, lat] to a line segment [a, b] using local equirectangular projection. */
function pointToSegmentKm(lon: number, lat: number, a: number[], b: number[]): number {
  const cosLat = Math.cos(lat * DEG_TO_RAD);
  const ax = (a[0] - lon) * cosLat;
  const ay = a[1] - lat;
  const bx = (b[0] - lon) * cosLat;
  const by = b[1] - lat;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = 0;
  if (lenSq > 0) {
    t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lenSq));
  }
  const nearLon = a[0] + t * (b[0] - a[0]);
  const nearLat = a[1] + t * (b[1] - a[1]);
  return distanceKm([lon, lat], [nearLon, nearLat]);
}

/**
 * Distance in km from (lon, lat) to a Polygon or MultiPolygon geometry:
 * 0 if the point is inside the polygon, else the minimum distance to its boundary segments.
 */
export function polygonDistanceKm(lon: number, lat: number, geom: { type: string; coordinates: unknown }): number {
  const polys: number[][][][] =
    geom.type === "Polygon"
      ? [geom.coordinates as number[][][]]
      : geom.type === "MultiPolygon"
        ? (geom.coordinates as number[][][][])
        : [];
  let minKm = Infinity;
  for (const rings of polys) {
    if (pointInPolygonRings(lon, lat, rings)) return 0;
    const outer = rings[0];
    if (!outer) continue;
    for (let i = 0; i < outer.length; i++) {
      const a = outer[i];
      const b = outer[(i + 1) % outer.length];
      const d = pointToSegmentKm(lon, lat, a, b);
      if (d < minKm) minKm = d;
    }
  }
  return minKm;
}

/** Fast bounding-box pre-filter before computing exact geodesic/polygon distances. */
function bboxMightIntersect(bbox: BBox, queryBox: BBox): boolean {
  return !(bbox[2] < queryBox[0] || bbox[0] > queryBox[2] || bbox[3] < queryBox[1] || bbox[1] > queryBox[3]);
}

/** Pick a concise, human-readable title for the queried region based on nearby sites and countries. */
function buildRegionTitle(
  lon: number,
  lat: number,
  entries: RegionEntry[],
  dnaSites: RegionDnaSite[],
): string {
  // Find the closest point feature with a specific site label (not just repeating its entity name).
  const pointEntries = entries.filter((e) => e.entity.category !== "civilization");
  let bestPoint: { label: string; dist: number } | null = null;
  for (const e of pointEntries) {
    const f = e.closestFeature;
    const label = f.label && f.label !== e.entity.name ? f.label : e.entity.category === "event" ? e.entity.name : "";
    if (label && (!bestPoint || e.distanceKm < bestPoint.dist)) {
      bestPoint = { label, dist: e.distanceKm };
    }
  }

  const nearestDna = dnaSites.length > 0 ? [...dnaSites].sort((a, b) => a.distanceKm - b.distanceKm)[0] : null;
  const country = nearestDna && nearestDna.distanceKm <= 220 ? nearestDna.site.country : "";

  if (bestPoint && bestPoint.dist <= 35) {
    return country && !bestPoint.label.includes(country)
      ? `Near ${bestPoint.label}, ${country}`
      : `Near ${bestPoint.label}`;
  }
  if (nearestDna && nearestDna.distanceKm <= 35) {
    return nearestDna.site.country
      ? `Near ${nearestDna.site.name}, ${nearestDna.site.country}`
      : `Near ${nearestDna.site.name}`;
  }
  if (bestPoint && bestPoint.dist <= 120) {
    return country && !bestPoint.label.includes(country)
      ? `Around ${bestPoint.label}, ${country}`
      : `Around ${bestPoint.label}`;
  }
  if (country) {
    return `Around ${country}`;
  }
  if (bestPoint) {
    return `Around ${bestPoint.label}`;
  }
  const coveringCiv = entries.find((e) => e.entity.category === "civilization" && e.distanceKm === 0);
  if (coveringCiv) {
    return `Around ${coveringCiv.entity.name}`;
  }
  return formatCoords(lon, lat);
}

/** Whether a territory reaches into the area: some of its outline (sampled) lies inside it. */
function geometryTouchesArea(geom: { type: string; coordinates: unknown }, area: Area): boolean {
  const polys: number[][][][] =
    geom.type === "Polygon"
      ? [geom.coordinates as number[][][]]
      : geom.type === "MultiPolygon"
        ? (geom.coordinates as number[][][][])
        : [];
  for (const rings of polys) {
    const outer = rings[0] ?? [];
    const step = Math.max(1, Math.floor(outer.length / 48));
    for (let i = 0; i < outer.length; i += step) {
      if (area.contains(outer[i][0], outer[i][1])) return true;
    }
  }
  return false;
}

/**
 * Query all species, cultures, civilizations, events, and ancient DNA sites within `radiusKm`
 * of `[lon, lat]` (or, given an `area`, inside that country or continent) across all 7 million years.
 */
export function queryRegion(
  data: Data,
  dna: DnaData | null,
  lon: number,
  lat: number,
  radiusKm: number = DEFAULT_RADIUS_KM,
  area: Area | null = null,
): RegionResult {
  const queryBox = circleBBox(lon, lat, radiusKm * 1.05);
  const byEntity = new Map<
    string,
    {
      entity: Entity;
      localStart: number;
      localEnd: number;
      hits: { feature: FeatureProps; dist: number }[];
    }
  >();

  for (const f of data.features) {
    const bbox = data.bboxOf.get(f.id);
    if (!bbox || (!area && !bboxMightIntersect(bbox, queryBox))) continue;

    let dist = Infinity;
    let inside = false;
    if (f.category === "civilization") {
      const geom = data.geometryOf.get(f.id);
      if (geom) {
        dist = polygonDistanceKm(lon, lat, geom);
        inside = !!area && (dist === 0 || geometryTouchesArea(geom, area));
      } else {
        const cx = (bbox[0] + bbox[2]) / 2;
        const cy = (bbox[1] + bbox[3]) / 2;
        dist = distanceKm([lon, lat], [cx, cy]);
        inside = !!area && area.contains(cx, cy);
      }
    } else {
      const cx = (bbox[0] + bbox[2]) / 2;
      const cy = (bbox[1] + bbox[3]) / 2;
      dist = distanceKm([lon, lat], [cx, cy]);
      inside = !!area && area.contains(cx, cy);
    }

    if (area ? !inside : dist > radiusKm) continue;
    const entity = data.entityById.get(f.entity_id);
    if (!entity) continue;

    const existing = byEntity.get(entity.id);
    if (existing) {
      if (f.start_year < existing.localStart) existing.localStart = f.start_year;
      if (f.end_year > existing.localEnd) existing.localEnd = f.end_year;
      existing.hits.push({ feature: f, dist });
    } else {
      byEntity.set(entity.id, {
        entity,
        localStart: f.start_year,
        localEnd: f.end_year,
        hits: [{ feature: f, dist }],
      });
    }
  }

  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  let earliestYear: number | null = null;
  let latestYear: number | null = null;

  const entries: RegionEntry[] = [];
  for (const item of byEntity.values()) {
    item.hits.sort((a, b) => a.dist - b.dist || a.feature.start_year - b.feature.start_year);
    const closest = item.hits[0];
    counts[item.entity.category] += 1;
    if (earliestYear === null || item.localStart < earliestYear) earliestYear = item.localStart;
    if (latestYear === null || item.localEnd > latestYear) latestYear = item.localEnd;
    entries.push({
      entity: item.entity,
      localStart: item.localStart,
      localEnd: item.localEnd,
      siteCount: item.hits.length,
      closestFeature: closest.feature,
      distanceKm: Math.round(closest.dist),
      localFeatures: item.hits.map((h) => h.feature),
    });
  }

  // Chronological order: oldest local arrival first, then earliest end, then closest.
  entries.sort((a, b) => a.localStart - b.localStart || a.localEnd - b.localEnd || a.distanceKm - b.distanceKm);

  const dnaSites: RegionDnaSite[] = [];
  let dnaPeopleCount = 0;
  if (dna) {
    for (const s of dna.sites) {
      if (area) {
        if (!area.contains(s.lon, s.lat)) continue;
      } else if (s.lon < queryBox[0] || s.lon > queryBox[2] || s.lat < queryBox[1] || s.lat > queryBox[3]) continue;
      const d = distanceKm([lon, lat], [s.lon, s.lat]);
      if (area || d <= radiusKm) {
        dnaSites.push({ site: s, distanceKm: Math.round(d) });
        dnaPeopleCount += s.people.length;
        if (earliestYear === null || s.start < earliestYear) earliestYear = s.start;
        if (latestYear === null || s.end > latestYear) latestYear = s.end;
      }
    }
    dnaSites.sort((a, b) => a.site.start - b.site.start || a.distanceKm - b.distanceKm);
  }

  const title = area ? area.name : buildRegionTitle(lon, lat, entries, dnaSites);

  return {
    lon,
    lat,
    radiusKm,
    area,
    title,
    entries,
    dnaSites,
    dnaPeopleCount,
    counts,
    earliestYear,
    latestYear,
  };
}
