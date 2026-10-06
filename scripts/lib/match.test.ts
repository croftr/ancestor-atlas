import { describe, expect, it } from "vitest";
import { nameVariants, scoreCandidate, type Candidate } from "./match.ts";

describe("nameVariants", () => {
  it("splits parentheticals and drops stratigraphic units", () => {
    expect(nameVariants("Grotte du Renne (Arcy-sur-Cure)")).toEqual(["Grotte du Renne (Arcy-sur-Cure)", "Grotte du Renne", "Arcy-sur-Cure"]);
    expect(nameVariants("Sterkfontein (Member 5)")).toEqual(["Sterkfontein (Member 5)", "Sterkfontein"]);
    expect(nameVariants("Lantian (Gongwangling / Chenchiawo)")).toEqual(["Lantian (Gongwangling / Chenchiawo)", "Lantian", "Gongwangling", "Chenchiawo"]);
  });
});

describe("scoreCandidate", () => {
  const base: Candidate = { qid: "Q1", typeLabels: [], byName: true, byGeo: false };
  it("prefers a nearby archaeological site over a town of the same name", () => {
    const site = scoreCandidate({ ...base, label: "Dmanisi", description: "archaeological site in Georgia", distanceKm: 1, enwiki: "Dmanisi" }, "Dmanisi");
    const town = scoreCandidate({ ...base, label: "Dmanisi", description: "town in Georgia", typeLabels: ["town"], distanceKm: 1.5 }, "Dmanisi");
    expect(site).toBeGreaterThan(town);
  });
  it("sinks disambiguation pages", () =>
    expect(scoreCandidate({ ...base, label: "Ubeidiya", description: "Wikimedia disambiguation page" }, "Ubeidiya")).toBeLessThan(0));
});
