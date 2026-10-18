import type { Data } from "../map/data";
import type { Entity, FeatureProps } from "../types";
import { distanceKm } from "../region/region";
import { PHYLOGENY, leavesOf, type Clade } from "./phylogeny";
import { GENE_FLOWS, type GeneFlow } from "../geneflow/geneflow";

export interface SitePoint {
  feature: FeatureProps;
  lon: number;
  lat: number;
  finds: number;
}

export interface ClosestSitePair {
  siteA: SitePoint;
  siteB: SitePoint;
  distanceKm: number;
}

export interface SpeciesComparison {
  a: Entity;
  b: Entity;
  sitesA: SitePoint[];
  sitesB: SitePoint[];
  findsA: number;
  findsB: number;
  /** Overlap interval [start, end] if the two species lived at the same time, else null. */
  overlap: [number, number] | null;
  /** Years of overlap (0 if none). */
  overlapYears: number;
  /** Years separating the end of the older species from the start of the younger (0 if they overlapped). */
  gapYears: number;
  /** Closest pair of fossil sites between species A and species B, if both have mapped sites. */
  closestSites: ClosestSitePair | null;
  /** Lowest common clade in PHYLOGENY containing both species. */
  commonClade: Clade | null;
  /** Documented interbreeding / gene flow episodes between these two species. */
  geneFlows: GeneFlow[];
  /** Suggested initial globe centre [lon, lat] framing both species' fossil distributions. */
  globeCenter: [number, number];
}

export const FAMOUS_SPECIES_PAIRS: { a: string; b: string; label: string }[] = [
  { a: "neanderthal", b: "homo-sapiens", label: "Neanderthal vs. H. sapiens" },
  { a: "neanderthal", b: "denisovan", label: "Neanderthal vs. Denisovan" },
  { a: "australopithecus-afarensis", b: "homo-erectus", label: "A. afarensis vs. H. erectus" },
  { a: "homo-habilis", b: "paranthropus-boisei", label: "H. habilis vs. P. boisei" },
  { a: "homo-erectus", b: "homo-floresiensis", label: "H. erectus vs. H. floresiensis" },
];

/** Extract point coordinates and specimen counts for a species' fossil sites. */
export function sitePointsFor(data: Data, speciesId: string): SitePoint[] {
  const features = data.featuresOf.get(speciesId) ?? [];
  const points: SitePoint[] = [];
  for (const f of features) {
    const b = data.bboxOf.get(f.id);
    if (!b) continue;
    points.push({
      feature: f,
      lon: (b[0] + b[2]) / 2,
      lat: (b[1] + b[3]) / 2,
      finds: f.finds ?? 1,
    });
  }
  return points;
}

/** Find the lowest (most specific) clade in `root` whose leaves include both `idA` and `idB`. */
export function lowestCommonClade(idA: string, idB: string, root: Clade = PHYLOGENY): Clade | null {
  const rootLeaves = leavesOf(root);
  if (!rootLeaves.includes(idA) || !rootLeaves.includes(idB)) return null;

  for (const child of root.children) {
    if (typeof child !== "string") {
      const deeper = lowestCommonClade(idA, idB, child);
      if (deeper) return deeper;
    }
  }
  return root;
}

/** Find any documented gene-flow / interbreeding episodes linking species A and species B. */
export function geneFlowsBetween(idA: string, idB: string): GeneFlow[] {
  if (idA === idB) return [];
  const pair = new Set([idA, idB]);
  const speciesOfFeature = (fid: string) => fid.split("@")[0];

  return GENE_FLOWS.filter((gf) => {
    if ("from" in gf.link) {
      const s1 = speciesOfFeature(gf.link.from);
      const s2 = speciesOfFeature(gf.link.to);
      return s1 !== s2 && pair.has(s1) && pair.has(s2);
    }
    // Single-site hybrid: Denny is a Neanderthal-Denisovan F1 hybrid.
    if (gf.id === "denny") {
      return pair.has("neanderthal") && pair.has("denisovan");
    }
    return false;
  });
}

/** Compute spherical mean centre [lon, lat] for a list of site points (defaults to East Africa [36, 5]). */
export function meanGlobeCenter(points: SitePoint[]): [number, number] {
  if (points.length === 0) return [36, 5];
  let x = 0;
  let y = 0;
  let z = 0;
  const deg = Math.PI / 180;
  for (const p of points) {
    const lat = p.lat * deg;
    const lon = p.lon * deg;
    x += Math.cos(lat) * Math.cos(lon);
    y += Math.cos(lat) * Math.sin(lon);
    z += Math.sin(lat);
  }
  x /= points.length;
  y /= points.length;
  z /= points.length;
  const hyp = Math.hypot(x, y);
  if (hyp < 1e-6 && Math.abs(z) < 1e-6) return [36, 5];
  const lon = (Math.atan2(y, x) * 180) / Math.PI;
  const lat = (Math.atan2(z, hyp) * 180) / Math.PI;
  return [lon, Math.max(-70, Math.min(70, lat))];
}

/** Compare two species across time, geography, fossil record, phylogeny, and gene flow. */
export function compareSpecies(data: Data, a: Entity, b: Entity): SpeciesComparison {
  const sitesA = sitePointsFor(data, a.id);
  const sitesB = sitePointsFor(data, b.id);
  const findsA = sitesA.reduce((n, s) => n + s.finds, 0);
  const findsB = sitesB.reduce((n, s) => n + s.finds, 0);

  const overStart = Math.max(a.start_year, b.start_year);
  const overEnd = Math.min(a.end_year, b.end_year);
  const overlap: [number, number] | null = overStart <= overEnd ? [overStart, overEnd] : null;
  const overlapYears = overlap ? Math.max(0, overEnd - overStart) : 0;
  const gapYears = overlap ? 0 : overStart - overEnd;

  let closestSites: ClosestSitePair | null = null;
  for (const sa of sitesA) {
    for (const sb of sitesB) {
      const d = distanceKm([sa.lon, sa.lat], [sb.lon, sb.lat]);
      if (!closestSites || d < closestSites.distanceKm) {
        closestSites = { siteA: sa, siteB: sb, distanceKm: Math.round(d) };
      }
    }
  }

  const commonClade = lowestCommonClade(a.id, b.id);
  const geneFlows = geneFlowsBetween(a.id, b.id);
  const globeCenter = meanGlobeCenter([...sitesA, ...sitesB]);

  return {
    a,
    b,
    sitesA,
    sitesB,
    findsA,
    findsB,
    overlap,
    overlapYears,
    gapYears,
    closestSites,
    commonClade,
    geneFlows,
    globeCenter,
  };
}
