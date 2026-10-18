import { describe, expect, it } from "vitest";
import { compareSpecies, geneFlowsBetween, lowestCommonClade } from "./compare";
import type { Data } from "../map/data";
import type { Entity, FeatureProps } from "../types";

describe("speciesCompare", () => {
  it("finds the lowest common clade in PHYLOGENY", () => {
    expect(lowestCommonClade("neanderthal", "denisovan")?.id).toBe("neanderthals-denisovans");
    expect(lowestCommonClade("neanderthal", "homo-sapiens")?.id).toBe("sapiens-and-archaics");
    expect(lowestCommonClade("homo-erectus", "homo-sapiens")?.id).toBe("erectus-and-later");
    expect(lowestCommonClade("australopithecus-afarensis", "homo-erectus")?.id).toBe("afarensis-and-later");
  });

  it("finds documented gene flows between species pairs", () => {
    const sapNeand = geneFlowsBetween("homo-sapiens", "neanderthal");
    expect(sapNeand.length).toBeGreaterThanOrEqual(3);
    const neandDen = geneFlowsBetween("neanderthal", "denisovan");
    expect(neandDen.map((g) => g.id)).toContain("denny");
    expect(geneFlowsBetween("australopithecus-afarensis", "homo-erectus")).toEqual([]);
  });

  it("computes temporal overlap, gap, and closest fossil sites", () => {
    const neanderthal: Entity = {
      id: "neanderthal",
      name: "Neanderthal",
      category: "species",
      start_year: -430_000,
      end_year: -40_000,
      description: "Stocky Eurasian hominin.",
      wikipedia_url: "",
      source_ids: [],
    };
    const sapiens: Entity = {
      id: "homo-sapiens",
      name: "Homo sapiens",
      category: "species",
      start_year: -315_000,
      end_year: 1,
      description: "Anatomically modern humans.",
      wikipedia_url: "",
      source_ids: [],
    };
    const afarensis: Entity = {
      id: "australopithecus-afarensis",
      name: "Australopithecus afarensis",
      category: "species",
      start_year: -3_900_000,
      end_year: -2_900_000,
      description: "Early bipedal australopith.",
      wikipedia_url: "",
      source_ids: [],
    };

    const f1: FeatureProps = {
      id: "neand-tabun",
      entity_id: "neanderthal",
      category: "species",
      label: "Tabun Cave",
      start_year: -120_000,
      end_year: -50_000,
      finds: 12,
      source_id: "s1",
    };
    const f2: FeatureProps = {
      id: "sap-qafzeh",
      entity_id: "homo-sapiens",
      category: "species",
      label: "Qafzeh",
      start_year: -115_000,
      end_year: -90_000,
      finds: 15,
      source_id: "s1",
    };

    const data: Data = {
      entities: [neanderthal, sapiens, afarensis],
      entityById: new Map([
        ["neanderthal", neanderthal],
        ["homo-sapiens", sapiens],
        ["australopithecus-afarensis", afarensis],
      ]),
      childrenOf: new Map(),
      features: [f1, f2],
      featuresOf: new Map([
        ["neanderthal", [f1]],
        ["homo-sapiens", [f2]],
        ["australopithecus-afarensis", []],
      ]),
      bboxOf: new Map([
        ["neand-tabun", [34.96, 32.67, 34.96, 32.67]],
        ["sap-qafzeh", [35.3, 32.68, 35.3, 32.68]],
      ]),
      geometryOf: new Map(),
      sourceById: new Map(),
      sources: [],
    };

    const over = compareSpecies(data, neanderthal, sapiens);
    expect(over.overlap).toEqual([-315_000, -40_000]);
    expect(over.overlapYears).toBe(275_000);
    expect(over.gapYears).toBe(0);
    expect(over.findsA).toBe(12);
    expect(over.findsB).toBe(15);
    expect(over.closestSites?.distanceKm).toBeGreaterThan(25);
    expect(over.closestSites?.distanceKm).toBeLessThan(40);

    const nonOver = compareSpecies(data, afarensis, neanderthal);
    expect(nonOver.overlap).toBeNull();
    expect(nonOver.gapYears).toBe(2_470_000);
  });
});
