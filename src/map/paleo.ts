import { useEffect, useState } from "react";
import { kaOf } from "../time/climate";

/**
 * Ice Age geography (public/data/paleo, from scripts/paleo.ts): for each age, a snapshot of the land
 * then dry that is sea today, the sea then over today's land, and the ice sheets. 0–80 ka from Gowan et
 * al. 2021 (every 2,500 years), 80–798 ka from the Spratt & Lisiecki sea level; older: none.
 */
export interface PaleoIndex {
  snapshots: Record<string, { sea_level: number; ice: boolean }>;
  /** [from ka, to ka, snapshot id], in order of age. */
  ranges: [number, number, string][];
  sources: { name: string; citation: string; url: string; licence: string }[];
}

export const paleoUrl = (id: string) => `/data/paleo/${id}.json`;

/** The snapshot drawn at an astronomical year, or null before the records begin. */
export function snapshotAt(index: PaleoIndex, year: number): string | null {
  const ka = Math.max(0, kaOf(year));
  for (const [from, to, id] of index.ranges) if (from <= ka && ka < to) return id;
  return null;
}

let index: PaleoIndex | null = null;
let promise: Promise<PaleoIndex | null> | null = null;

export function loadPaleo(): Promise<PaleoIndex | null> {
  promise ??= fetch("/data/paleo/index.json")
    .then((r) => r.json() as Promise<PaleoIndex>)
    .then((x) => (index = x))
    .catch(() => null);
  return promise;
}

export function usePaleo(): PaleoIndex | null {
  const [p, setP] = useState(index);
  useEffect(() => {
    let alive = true;
    loadPaleo().then((x) => alive && setP(x));
    return () => {
      alive = false;
    };
  }, []);
  return p;
}
