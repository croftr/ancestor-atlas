import { STEPS, segmentOfBce } from "../time/scale";
import { bearing, greatCircle, splitAtAntimeridian } from "../routes/geometry";
import type { GeneFlow } from "./geneflow";

/** Where a site on the globe is. */
export type SiteAt = (id: string) => [lon: number, lat: number] | undefined;

/**
 * Whether an episode shows at the slider's year: inside its window, or within half a slider step of it,
 * so a window between two stops (100,000 years apart in deep time) still shows at the nearer one.
 */
export function shownAt(flow: GeneFlow, year: number): boolean {
  const half = STEPS[segmentOfBce(1 - year)] / 2;
  return flow.start_year - half <= year && year <= flow.end_year + half;
}

/**
 * The episodes shown at `year`, as GeoJSON: a link (line plus an arrowhead at the receiving end) or a ring
 * at a single site. Throws if a site is missing.
 */
export function geneFlowGeoJSON(flows: GeneFlow[], site: SiteAt, year: number): GeoJSON.FeatureCollection {
  const at = (id: string) => {
    const p = site(id);
    if (!p) throw new Error(`gene flow: no site ${id} on the globe`);
    return p;
  };
  const features: GeoJSON.Feature[] = [];
  for (const flow of flows) {
    if (!shownAt(flow, year)) continue;
    if ("at" in flow.link) {
      features.push({ type: "Feature", properties: { id: flow.id, ring: true }, geometry: { type: "Point", coordinates: at(flow.link.at) } });
      continue;
    }
    const line = greatCircle(at(flow.link.from), at(flow.link.to));
    features.push({ type: "Feature", properties: { id: flow.id }, geometry: { type: "MultiLineString", coordinates: splitAtAntimeridian(line) } });
    features.push({
      type: "Feature",
      properties: { id: flow.id, head: true, bearing: bearing(line[line.length - 2], line[line.length - 1]) },
      geometry: { type: "Point", coordinates: line[line.length - 1] },
    });
  }
  return { type: "FeatureCollection", features };
}
