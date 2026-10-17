import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GENE_FLOWS } from "./geneflow";
import { geneFlowGeoJSON, shownAt, type SiteAt } from "./geometry";
import { snapYear } from "../time/scale";

// The committed data the app loads.
const gj = JSON.parse(readFileSync("public/data/features.geojson", "utf8")) as {
  features: { properties: { id: string; entity_id: string }; geometry: { type: string; coordinates: number[] } }[];
};
const byId = new Map(gj.features.map((f) => [f.properties.id, f]));
const site: SiteAt = (id) => {
  const f = byId.get(id);
  return f?.geometry.type === "Point" ? [f.geometry.coordinates[0], f.geometry.coordinates[1]] : undefined;
};

describe("GENE_FLOWS", () => {
  it("have unique ids", () => {
    expect(new Set(GENE_FLOWS.map((g) => g.id)).size).toBe(GENE_FLOWS.length);
  });

  for (const flow of GENE_FLOWS) {
    it(`${flow.id}: its sites are on the globe, and it shows at some stop of the slider`, () => {
      expect(flow.start_year).toBeLessThanOrEqual(flow.end_year);
      expect(flow.source.url).toMatch(/^https:\/\//);
      const ids = "at" in flow.link ? [flow.link.at] : [flow.link.from, flow.link.to];
      for (const id of ids) expect(site(id), id).toBeDefined();
      if ("from" in flow.link) expect(byId.get(flow.link.from)!.properties.entity_id).not.toBe(byId.get(flow.link.to)!.properties.entity_id);
      const stops = new Set<number>();
      for (let y = flow.start_year - 100_000; y <= flow.end_year + 100_000; y += 500) stops.add(snapYear(y));
      expect([...stops].some((y) => shownAt(flow, y))).toBe(true);
    });
  }
});

describe("gene flow geometry", () => {
  const flow = GENE_FLOWS.find((g) => g.id === "oase")!;
  const sites: Record<string, [number, number]> = { "neanderthal@10": [0, 0], "homo-sapiens@9": [10, 0] };

  it("draws a link with an arrowhead at the receiving end, only near its window", () => {
    const fc = geneFlowGeoJSON([flow], (id) => sites[id], -38_050);
    expect(fc.features.map((f) => f.geometry.type)).toEqual(["MultiLineString", "Point"]);
    expect((fc.features[1].geometry as GeoJSON.Point).coordinates[0]).toBeCloseTo(10);
    expect(fc.features[1].properties!.bearing).toBeCloseTo(90);
    expect(geneFlowGeoJSON([flow], (id) => sites[id], -60_050).features).toEqual([]);
  });

  it("shows a deep-time window at the nearer slider stop", () => {
    const deep = { ...flow, start_year: -120_050, end_year: -100_050 };
    expect(shownAt(deep, -99_999)).toBe(true); // 100 ka (10,000-year steps)
    expect(shownAt(deep, -199_999)).toBe(false); // 200 ka (100,000-year steps)
  });

  it("draws a single-site episode as a ring", () => {
    const denny = GENE_FLOWS.find((g) => g.id === "denny")!;
    const fc = geneFlowGeoJSON([denny], () => [84.7, 51.4], -88_050);
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].properties!.ring).toBe(true);
  });
});
