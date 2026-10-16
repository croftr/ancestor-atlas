import { useEffect, useState } from "react";
import type { DnaData, DnaPerson, DnaSite } from "./types";
import { siteColour, type DnaColour } from "./haplogroups";

let data: DnaData | null = null;
let promise: Promise<DnaData | null> | null = null;

/** Fetch public/data/dna.json once (only when the layer is first switched on). */
export function loadDna(): Promise<DnaData | null> {
  promise ??= fetch("/data/dna.json")
    .then((r) => r.json() as Promise<DnaData>)
    .then((d) => (data = d))
    .catch((e) => {
      console.error("Failed to load ancient DNA", e);
      promise = null; // try again next time
      return null;
    });
  return promise;
}

export const getDna = () => data;

export function useDna(on = true): DnaData | null {
  const [d, setD] = useState<DnaData | null>(data);
  useEffect(() => {
    if (!on) return;
    let alive = true;
    loadDna().then((x) => alive && setD(x));
    return () => {
      alive = false;
    };
  }, [on]);
  return d;
}

export const aliveAt = (p: DnaPerson, year: number) => p[1] <= year && year <= p[2];

/** The sites with anyone dated to `year`, as map points sized by how many and coloured by `mode`. */
export function dnaGeoJSON(d: DnaData, year: number, mode: DnaColour): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const s of d.sites) {
    if (s.start > year || s.end < year) continue;
    const now = s.people.filter((p) => aliveAt(p, year));
    if (!now.length) continue;
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [s.lon, s.lat] },
      properties: { id: s.id, n: now.length, color: siteColour(now, mode) },
    });
  }
  return { type: "FeatureCollection", features };
}

export const dnaSiteById = (d: DnaData | null, id: string | null): DnaSite | undefined =>
  id ? d?.sites.find((s) => s.id === id) : undefined;
