import { describe, expect, it } from "vitest";
import { distanceKm, outliers, parseAgeText, siteStatus, windowFromText, windowMatchesText, normaliseLabel } from "./qa.ts";

describe("parseAgeText", () => {
  it("parses a Ma range", () => expect(parseAgeText("7.2–6.8 Ma (approx.)")).toEqual([-7198050, -6798050]));
  it("parses a ka range", () => expect(parseAgeText("117–108 ka")).toEqual([-115050, -106050]));
  it("parses mixed units", () => expect(parseAgeText("1.5 Ma–400 ka (approx.)")).toEqual([-1498050, -398050]));
  it("parses single ages, ± errors and BCE ranges", () => {
    expect(parseAgeText("c. 480 ka (end of MIS 13)")).toEqual([-478050, -478050]);
    expect(parseAgeText("315 ± 34 ka")).toEqual([-347050, -279050]);
    expect(parseAgeText("9500–8000 BCE")).toEqual([-9499, -7999]);
    expect(parseAgeText("16,590–14,000 BCE")).toEqual([-16589, -13999]);
  });
  it("rejects other shapes", () => {
    expect(parseAgeText("c. 5000 BCE")).toBeUndefined();
    expect(parseAgeText("1–2 Ma")).toBeUndefined(); // younger first
  });
});

describe("windowMatchesText", () => {
  it("accepts an exact or wider window", () => {
    expect(windowMatchesText(-7198050, -6798050, "7.2–6.8 Ma")).toBe(true);
    expect(windowMatchesText(-7300000, -6700000, "7.2–6.8 Ma")).toBe(true);
  });
  it("rejects a window that misses the stated range", () => expect(windowMatchesText(-6000000, -5000000, "7.2–6.8 Ma")).toBe(false));
  it("is undefined for unparseable text", () => expect(windowMatchesText(0, 1, "Bronze Age")).toBeUndefined());
});

describe("windowFromText", () => {
  it("widens to two slider steps", () => {
    expect(windowFromText("c. 480 ka")).toEqual([-488050, -468050]); // 10k steps in 1 Ma–100 ka
    expect(windowFromText("315 ± 34 ka")).toEqual([-347050, -279050]); // already wide enough
  });
});

describe("siteStatus", () => {
  it("classifies rows", () => {
    expect(siteStatus({ source_id: "recall" })).toBe("recall");
    expect(siteStatus({ source_id: "recall", coord_source: "wikidata:Q1#P625" })).toBe("partial");
    expect(siteStatus({ source_id: "recall", coord_source: "a:b", date_source: "doi:x" })).toBe("partial");
    expect(siteStatus({ source_id: "wikidata", coord_source: "a:b", date_source: "doi:x" })).toBe("sourced");
  });
});

describe("geometry", () => {
  it("measures distance", () => expect(distanceKm(51.5, 0, 48.85, 2.35)).toBeCloseTo(343, -1));
  it("flags a far-away point", () => {
    const pts = [
      { lat: 50, lon: 10 },
      { lat: 51, lon: 11 },
      { lat: 49, lon: 9 },
      { lat: 50.5, lon: 10.5 },
      { lat: -30, lon: 140 },
    ];
    expect(outliers(pts)).toEqual([4]);
  });
});

it("normalises labels", () => expect(normaliseLabel("Grotte du Renne (Arcy-sur-Cure)")).toBe("grotte du renne"));
