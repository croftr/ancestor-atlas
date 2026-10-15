import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ROUTES, type Route } from "./routes";
import { bearing, drawnAt, routesGeoJSON, splitAtAntimeridian, timeline, type SiteLookup } from "./geometry";

// The committed data the app loads.
const gj = JSON.parse(readFileSync("public/data/features.geojson", "utf8")) as {
  features: { properties: { id: string; start_year: number; end_year: number }; geometry: { type: string; coordinates: number[] } }[];
};
const byId = new Map(gj.features.map((f) => [f.properties.id, f]));
const site: SiteLookup = (id) => {
  const f = byId.get(id);
  if (!f || f.geometry.type !== "Point") return undefined;
  return { lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], start_year: f.properties.start_year, end_year: f.properties.end_year };
};

describe("ROUTES", () => {
  it("have unique ids", () => {
    expect(new Set(ROUTES.map((r) => r.id)).size).toBe(ROUTES.length);
  });

  for (const route of ROUTES) {
    it(`${route.id}: every site is a point on the globe, dates run forward, and it ends before it is hidden`, () => {
      const pts = timeline(route, site);
      for (let i = 1; i < pts.length; i++) expect(pts[i].year).toBeGreaterThanOrEqual(pts[i - 1].year);
      expect(pts.at(-1)!.year).toBeLessThan(route.until);
      expect(route.waypoints[0]).toHaveProperty("site");
      expect(route.waypoints.at(-1)).toHaveProperty("site");
      expect(route.source.url).toMatch(/^https:\/\//);
    });
  }
});

describe("route geometry", () => {
  const sites: Record<string, { lon: number; lat: number; start_year: number; end_year: number }> = {
    a: { lon: 0, lat: 0, start_year: -1000, end_year: -1000 },
    b: { lon: 20, lat: 0, start_year: -500, end_year: -500 },
  };
  const route: Route = {
    id: "t",
    name: "t",
    description: "",
    color: "#fff",
    until: 0,
    source: { label: "", url: "https://example.org" },
    waypoints: [{ site: "a" }, { via: [10, 0], place: "v" }, { site: "b" }],
  };
  const pts = timeline(route, (id) => sites[id]);

  it("times via points by distance and densifies", () => {
    const mid = pts.find((p) => Math.abs(p.lon - 10) < 1e-6)!;
    expect(mid.year).toBeCloseTo(-750);
    expect(pts.length).toBeGreaterThan(3);
  });

  it("grows the line with the year", () => {
    expect(drawnAt(pts, -1100, 0).line).toEqual([]);
    const half = drawnAt(pts, -750, 0);
    expect(half.growing).toBe(true);
    expect(half.line.at(-1)![0]).toBeCloseTo(10);
    const all = drawnAt(pts, -100, 0);
    expect(all.growing).toBe(false);
    expect(all.line.at(-1)![0]).toBeCloseTo(20);
    expect(drawnAt(pts, 1, 0).line).toEqual([]);
  });

  it("puts an arrowhead only on growing routes", () => {
    const fc = routesGeoJSON([{ route, points: pts }], -750);
    expect(fc.features.map((f) => f.geometry.type)).toEqual(["MultiLineString", "Point"]);
    expect(fc.features[1].properties!.bearing).toBeCloseTo(90);
    expect(routesGeoJSON([{ route, points: pts }], -100).features).toHaveLength(1);
  });

  it("splits lines at the antimeridian", () => {
    const parts = splitAtAntimeridian([
      [170, 60],
      [-170, 62],
    ]);
    expect(parts).toEqual([
      [
        [170, 60],
        [180, 61],
      ],
      [
        [-180, 61],
        [-170, 62],
      ],
    ]);
  });

  it("gives compass bearings", () => {
    expect(bearing([0, 0], [0, 10])).toBeCloseTo(0);
    expect(bearing([0, 0], [-10, 0])).toBeCloseTo(270);
  });
});
