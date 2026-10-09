import { useEffect, useState } from "react";
import type { Entity, FeatureProps, Source } from "../types";
import { STEPS, segmentOfBce } from "../time/scale";

export interface Data {
  entities: Entity[];
  entityById: Map<string, Entity>;
  /** Children of each group entity, ordered by start year. */
  childrenOf: Map<string, Entity[]>;
  /** Features of each entity, ordered by start year. */
  featuresOf: Map<string, FeatureProps[]>;
  features: FeatureProps[];
  /** [west, south, east, north] of each feature's geometry, by feature id. */
  bboxOf: Map<string, BBox>;
  /** Civilization territories' geometry, by feature id (for the selected one's badge). */
  geometryOf: Map<string, GeoFeature["geometry"]>;
  sources: Source[];
  sourceById: Map<string, Source>;
}

export type BBox = [number, number, number, number];

export interface GeoFeature {
  properties: FeatureProps;
  geometry: { type: string; coordinates: unknown } | null;
}

/** Bounding box of a GeoJSON geometry; wraps across the antimeridian when that is narrower. */
export function geometryBBox(geometry: GeoFeature["geometry"]): BBox | null {
  if (!geometry) return null;
  const boxes: BBox[] = [];
  const walk = (c: unknown) => {
    if (!Array.isArray(c)) return;
    if (typeof c[0] === "number") boxes.push([c[0], c[1], c[0], c[1]] as BBox);
    else for (const x of c) walk(x);
  };
  walk(geometry.coordinates);
  return unionBBox(boxes);
}

/**
 * Union of boxes. East may exceed 180 when the narrowest covering box crosses the antimeridian
 * (MapLibre's fitBounds accepts that).
 */
export function unionBBox(boxes: BBox[]): BBox | null {
  if (boxes.length === 0) return null;
  // Normalise each box to west in [-180, 180), then take the union both as-is and with
  // western-hemisphere boxes moved east by 360; keep whichever is narrower.
  let s = Infinity, n = -Infinity;
  let aw = Infinity, ae = -Infinity, bw = Infinity, be = -Infinity;
  for (const box of boxes) {
    s = Math.min(s, box[1]);
    n = Math.max(n, box[3]);
    const w = ((((box[0] + 180) % 360) + 360) % 360) - 180;
    const e = w + (box[2] - box[0]);
    aw = Math.min(aw, w);
    ae = Math.max(ae, e);
    const k = w < 0 ? 360 : 0;
    bw = Math.min(bw, w + k);
    be = Math.max(be, e + k);
  }
  if (be - bw < ae - aw) return bw >= 180 ? [bw - 360, s, be - 360, n] : [bw, s, be, n];
  return [aw, s, ae, n];
}

let data: Data | null = null;
let promise: Promise<Data | null> | null = null;

const group = <T>(items: T[], key: (t: T) => string | undefined) => {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    if (k !== undefined) (m.get(k) ?? m.set(k, []).get(k)!).push(it);
  }
  return m;
};

/** Fetch the registry, features and sources once and index them at module level. */
export function loadData(): Promise<Data | null> {
  promise ??= Promise.all([
    fetch("/data/entities.json").then((r) => r.json() as Promise<Entity[]>),
    fetch("/data/features.geojson").then((r) => r.json() as Promise<{ features: GeoFeature[] }>),
    fetch("/data/sources.json").then((r) => r.json() as Promise<Source[]>),
  ])
    .then(([entities, gj, sources]) => {
      const features = gj.features.map((f) => f.properties);
      const bboxOf = new Map<string, BBox>();
      const geometryOf = new Map<string, GeoFeature["geometry"]>();
      for (const f of gj.features) {
        const b = geometryBBox(f.geometry);
        if (b) bboxOf.set(f.properties.id, b);
        if (f.properties.category === "civilization") geometryOf.set(f.properties.id, f.geometry);
      }
      const byStart = (a: { start_year: number }, b: { start_year: number }) => a.start_year - b.start_year;
      const childrenOf = group(entities, (e) => e.parent_id);
      const featuresOf = group(features, (f) => f.entity_id);
      for (const l of childrenOf.values()) l.sort(byStart);
      for (const l of featuresOf.values()) l.sort(byStart);
      data = {
        entities,
        entityById: new Map(entities.map((e) => [e.id, e])),
        childrenOf,
        featuresOf,
        features,
        bboxOf,
        geometryOf,
        sources,
        sourceById: new Map(sources.map((s) => [s.id, s])),
      };
      return data;
    })
    .catch((e) => {
      console.error("Failed to load data", e);
      return null;
    });
  return promise;
}

export const getData = () => data;

export function useData(): Data | null {
  const [d, setD] = useState<Data | null>(data);
  useEffect(() => {
    let alive = true;
    loadData().then((x) => alive && setD(x));
    return () => {
      alive = false;
    };
  }, []);
  return d;
}

const NO_FEATURES: FeatureProps[] = [];
export const useFeatures = (): FeatureProps[] => useData()?.features ?? NO_FEATURES;

/**
 * How far either side of the slider year an event stays on the map: a few slider steps, so a
 * one-year event isn't skipped over between steps (100,000 years apart in deep time).
 */
export const eventTolerance = (year: number) => 3 * STEPS[segmentOfBce(1 - year)];

export const isActive = (f: { start_year: number; end_year: number; category?: string }, year: number) => {
  const tol = f.category === "event" ? eventTolerance(year) : 0;
  return f.start_year - tol <= year && year <= f.end_year + tol;
};
