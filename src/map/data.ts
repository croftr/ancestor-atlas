import { useEffect, useState } from "react";
import type { Entity, FeatureProps, Source } from "../types";

export interface Data {
  entities: Entity[];
  entityById: Map<string, Entity>;
  /** Children of each group entity, ordered by start year. */
  childrenOf: Map<string, Entity[]>;
  /** Features of each entity, ordered by start year. */
  featuresOf: Map<string, FeatureProps[]>;
  features: FeatureProps[];
  sources: Source[];
  sourceById: Map<string, Source>;
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
    fetch("/data/features.geojson").then((r) => r.json() as Promise<{ features: { properties: FeatureProps }[] }>),
    fetch("/data/sources.json").then((r) => r.json() as Promise<Source[]>),
  ])
    .then(([entities, gj, sources]) => {
      const features = gj.features.map((f) => f.properties);
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

export const isActive = (f: { start_year: number; end_year: number }, year: number) =>
  f.start_year <= year && year <= f.end_year;
