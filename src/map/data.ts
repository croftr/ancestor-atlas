import { useEffect, useState } from "react";
import type { EntityProps } from "../types";

let entities: EntityProps[] = [];
let promise: Promise<EntityProps[]> | null = null;

/** Fetch the GeoJSON once and keep the flat property list at module level. */
export function loadEntities(): Promise<EntityProps[]> {
  promise ??= fetch("/data/entities.geojson")
    .then((r) => r.json())
    .then((gj: { features: { properties: EntityProps }[] }) => {
      entities = gj.features.map((f) => f.properties);
      return entities;
    })
    .catch((e) => {
      console.error("Failed to load entities", e);
      return entities;
    });
  return promise;
}

export function useEntities(): EntityProps[] {
  const [list, setList] = useState<EntityProps[]>(entities);
  useEffect(() => {
    let alive = true;
    loadEntities().then((l) => alive && setList(l));
    return () => {
      alive = false;
    };
  }, []);
  return list;
}

export const isActive = (e: EntityProps, year: number) => e.start_year <= year && year <= e.end_year;
