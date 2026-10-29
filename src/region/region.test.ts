import { describe, expect, it } from "vitest";
import { areaAt, loadAreas } from "./area";
import {
  circleBBox,
  circleGeoJSON,
  destinationPoint,
  distanceKm,
  formatCoords,
  polygonDistanceKm,
  queryRegion,
} from "./region";
import type { Data } from "../map/data";
import type { DnaData } from "../dna/types";
import type { Entity, FeatureProps } from "../types";

describe("region spatial math", () => {
  it("computes great-circle distance accurately", () => {
    // London (0.1276 W, 51.5072 N) to Paris (2.3522 E, 48.8566 N) ~ 343 km
    const d = distanceKm([-0.1276, 51.5072], [2.3522, 48.8566]);
    expect(d).toBeGreaterThan(338);
    expect(d).toBeLessThan(348);
    expect(distanceKm([35, 31], [35, 31])).toBe(0);
  });

  it("reaches expected distance with destinationPoint and builds a closed circleGeoJSON", () => {
    const dest = destinationPoint(35, 32, 45, 300);
    expect(distanceKm([35, 32], dest)).toBeCloseTo(300, 0);

    const geo = circleGeoJSON(35, 32, 300, 32);
    expect(geo.features).toHaveLength(2);
    const poly = geo.features[0];
    expect(poly.geometry.type).toBe("Polygon");
    if (poly.geometry.type === "Polygon") {
      expect(poly.geometry.coordinates[0]).toHaveLength(33);
      expect(poly.geometry.coordinates[0][0]).toEqual(poly.geometry.coordinates[0][32]);
    }
  });

  it("formats coordinates and computes circleBBox", () => {
    expect(formatCoords(35.24, 31.78)).toBe("31.8°N, 35.2°E");
    expect(formatCoords(-77.04, -12.05)).toBe("12.1°S, 77.0°W");
    const box = circleBBox(35, 32, 300);
    expect(box[0]).toBeLessThan(35);
    expect(box[2]).toBeGreaterThan(35);
    expect(box[1]).toBeLessThan(32);
    expect(box[3]).toBeGreaterThan(32);
  });

  it("checks point-in-polygon and boundary distance", () => {
    const square: GeoJSON.Geometry = {
      type: "Polygon",
      coordinates: [
        [
          [30, 30],
          [34, 30],
          [34, 34],
          [30, 34],
          [30, 30],
        ],
      ],
    };
    // Inside polygon -> 0 km
    expect(polygonDistanceKm(32, 32, square)).toBe(0);
    // 1 degree north of top edge (lat 35 vs 34 at lon 32) -> ~111.2 km
    const outside = polygonDistanceKm(32, 35, square);
    expect(outside).toBeGreaterThan(108);
    expect(outside).toBeLessThan(114);
  });
});

describe("queryRegion", () => {
  const entities: Entity[] = [
    {
      id: "erectus",
      name: "Homo erectus",
      category: "species",
      start_year: -1_800_000,
      end_year: -110_000,
      description: "",
      wikipedia_url: "",
      source_ids: [],
    },
    {
      id: "natufian",
      name: "Natufian",
      category: "culture",
      start_year: -13_000,
      end_year: -9_500,
      description: "",
      wikipedia_url: "",
      source_ids: [],
    },
    {
      id: "rome",
      name: "Roman Empire",
      category: "civilization",
      start_year: -27,
      end_year: 476,
      description: "",
      wikipedia_url: "",
      source_ids: [],
    },
  ];

  const features: FeatureProps[] = [
    {
      id: "f-gesher",
      entity_id: "erectus",
      category: "species",
      label: "Gesher Benot Ya'aqov",
      start_year: -780_000,
      end_year: -750_000,
      source_id: "s1",
    },
    {
      id: "f-natuf-1",
      entity_id: "natufian",
      category: "culture",
      label: "El-Wad Terrace",
      start_year: -13_000,
      end_year: -9_800,
      source_id: "s1",
    },
    {
      id: "f-natuf-2",
      entity_id: "natufian",
      category: "culture",
      label: "Ain Mallaha",
      start_year: -12_500,
      end_year: -9_500,
      source_id: "s1",
    },
    {
      id: "f-rome",
      entity_id: "rome",
      category: "civilization",
      label: "Roman Levant",
      start_year: -63,
      end_year: 395,
      source_id: "s1",
    },
    {
      id: "f-far",
      entity_id: "erectus",
      category: "species",
      label: "Trinil (Java)",
      start_year: -1_500_000,
      end_year: -700_000,
      source_id: "s1",
    },
  ];

  const data: Data = {
    entities,
    entityById: new Map(entities.map((e) => [e.id, e])),
    childrenOf: new Map(),
    features,
    featureById: new Map(features.map((f) => [f.id, f])),
    mapGeoJSON: { type: "FeatureCollection", features: [] },
    featuresOf: new Map([
      ["erectus", [features[0], features[4]]],
      ["natufian", [features[1], features[2]]],
      ["rome", [features[3]]],
    ]),
    bboxOf: new Map([
      ["f-gesher", [35.63, 33.01, 35.63, 33.01]],
      ["f-natuf-1", [34.97, 32.67, 34.97, 32.67]],
      ["f-natuf-2", [35.57, 33.08, 35.57, 33.08]],
      ["f-rome", [34.0, 31.0, 36.5, 34.0]],
      ["f-far", [111.47, -7.37, 111.47, -7.37]],
    ]),
    geometryOf: new Map([
      [
        "f-rome",
        {
          type: "Polygon",
          coordinates: [
            [
              [34.0, 31.0],
              [36.5, 31.0],
              [36.5, 34.0],
              [34.0, 34.0],
              [34.0, 31.0],
            ],
          ],
        },
      ],
    ]),
    sourceById: new Map(),
    sources: [],
  };

  const dna: DnaData = {
    release: "v66.p1",
    pubs: [["Lazaridis 2016", ""]],
    sites: [
      {
        id: "dna:32.670,34.970",
        name: "Raqefet Cave",
        country: "Israel",
        lon: 35.07,
        lat: 32.65,
        start: -11_800,
        end: -9_700,
        people: [["I1072", -11_800, -9_700, "11800–9700 BCE", "M", "E1b1b", "U6", "Natufian", 0, "natufian"]],
      },
    ],
  };

  it("aggregates local features and DNA sites chronologically within the radius", () => {
    const res = queryRegion(data, dna, 35.0, 32.7, 300);
    expect(res.entries.map((e) => e.entity.id)).toEqual(["erectus", "natufian", "rome"]);
    // Local span for Homo erectus uses only the Levant site, not Trinil (Java)
    expect(res.entries[0].localStart).toBe(-780_000);
    expect(res.entries[0].localEnd).toBe(-750_000);
    expect(res.entries[0].siteCount).toBe(1);
    // Natufian merges both local sites
    expect(res.entries[1].siteCount).toBe(2);
    expect(res.entries[1].localStart).toBe(-13_000);
    expect(res.entries[1].localEnd).toBe(-9_500);
    expect(res.entries[1].closestFeature.id).toBe("f-natuf-1");
    // Roman Empire polygon contains the query point -> distanceKm = 0
    expect(res.entries[2].distanceKm).toBe(0);
    // DNA site included
    expect(res.dnaSites).toHaveLength(1);
    expect(res.dnaPeopleCount).toBe(1);
    expect(res.title).toBe("Near El-Wad Terrace, Israel");
  });

  it("searches a whole country or continent instead of the radius", async () => {
    await loadAreas();
    const israel = areaAt(35.0, 32.7, "country")!;
    expect(israel.name).toBe("Israel");
    const inIsrael = queryRegion(data, dna, 35.0, 32.7, 300, israel);
    expect(inIsrael.title).toBe("Israel");
    expect(inIsrael.entries.map((e) => e.entity.id)).toEqual(["erectus", "natufian", "rome"]);
    expect(inIsrael.entries[0].siteCount).toBe(1);

    const asia = areaAt(35.0, 32.7, "continent")!;
    expect(asia.name).toBe("Asia");
    const inAsia = queryRegion(data, dna, 35.0, 32.7, 300, asia);
    // Trinil (Java) is in Asia too.
    expect(inAsia.entries[0].siteCount).toBe(2);
    expect(inAsia.dnaSites).toHaveLength(1);
  });
});
