import { describe, expect, it } from "vitest";
import { clusterSites, cultureOf, dateRange, haplo, pubLabel } from "./aadr.ts";
import { classOf, siteColour } from "../../src/dna/haplogroups.ts";
import type { DnaPerson } from "../../src/dna/types.ts";

const labels = new Map([
  ["Unetice", "unetice"],
  ["BellBeaker", "bell-beaker"],
  ["LBK", "linear-pottery"],
]);

describe("AADR ingest", () => {
  it("links a group label through exactly one known part, with AADR's suffixes off", () => {
    expect(cultureOf("Germany_EBA_Unetice", labels)).toBe("unetice");
    expect(cultureOf("Czechia_EBA_BellBeaker-o", labels)).toBe("bell-beaker");
    expect(cultureOf("Germany_LBK-1", labels)).toBe("linear-pottery");
    expect(cultureOf("Germany_BellBeaker_Unetice", labels)).toBe("");
    expect(cultureOf("Germany_Magdalenenberg_IA", labels)).toBe(""); // no partial matches
    expect(cultureOf("Germany_ProtoUnetice", labels)).toBe("");
  });

  it("dates: ±2 SD for direct dates, the full uniform range for contextual ones, at least ±50 years", () => {
    expect(dateRange(4500, 50, false)).toEqual([-2650, -2450]);
    // 2500–1700 BCE as a context range: mean 4050 BP, SD 800/√12.
    expect(dateRange(4050, 800 / Math.sqrt(12), true)).toEqual([-2500, -1700]);
    expect(dateRange(3000, 10, false)).toEqual([-1100, -1000]);
  });

  it("reads AADR's not-called markers as empty", () => {
    expect(haplo("..")).toBe("");
    expect(haplo("n/a (female)")).toBe("");
    expect(haplo("n/a (<2x)")).toBe("");
    expect(haplo(" R1b1a1b ")).toBe("R1b1a1b");
  });

  it("spells out publication abbreviations", () => {
    expect(pubLabel("MathiesonReichNature2018")).toBe("Mathieson Reich Nature 2018");
    expect(pubLabel("OlaldeNature2018")).toBe("Olalde Nature 2018");
  });

  it("merges sites within 1 km, keeping farther ones apart", () => {
    const rows = [
      { lat: 50, lon: 10 },
      { lat: 50, lon: 10 },
      { lat: 50.005, lon: 10 }, // ~0.6 km
      { lat: 50.05, lon: 10 }, // ~5.6 km
    ];
    expect(clusterSites(rows).map((c) => c.length)).toEqual([3, 1]);
  });
});

describe("haplogroup colours", () => {
  const person = (y: string, mt: string): DnaPerson => ["x", 0, 0, "", y ? "M" : "F", y, mt, "", 0, ""];

  it("classes Y and mtDNA haplogroups", () => {
    expect(classOf("R1b1a1b1a1a2", "y")).toBe("R1b");
    expect(classOf("R1a1a1", "y")).toBe("R1a");
    expect(classOf("I2a1a2", "y")).toBe("IG");
    expect(classOf("G2a2b2b1a1a", "y")).toBe("IG");
    expect(classOf("J2a1", "y")).toBe("other");
    expect(classOf("U5b2b", "mt")).toBe("U");
    expect(classOf("HV0", "mt")).toBe("H");
    expect(classOf("D4j", "mt")).toBe("EA");
    expect(classOf("K1a+195", "mt")).toBe("other");
    expect(classOf("", "mt")).toBe("");
  });

  it("colours a site by its commonest class, ignoring people without one", () => {
    const people = [person("R1b1", "H1"), person("R1b1a", "U5"), person("I2a", "U4"), person("", "T2b")];
    expect(siteColour(people, "y")).toBe("#2a78d6");
    expect(siteColour(people, "mt")).toBe("#2a78d6"); // U ×2
    expect(siteColour([person("J2a", "")], "y")).toBe("#8f8d86");
    expect(siteColour([person("", "")], "y")).toBe("rgba(0, 0, 0, 0)");
  });
});
