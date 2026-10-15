import { describe, expect, it } from "vitest";
import { climateAt, climateColor, climateWords, isColdStage, kaOf, stageAt, valueAt, type Climate } from "./climate";

describe("climate", () => {
  it("counts ka back from 1950", () => {
    expect(kaOf(1950)).toBe(0);
    expect(kaOf(1 - 20_000)).toBeCloseTo(21.949);
  });

  it("interpolates between rows and is undefined outside them", () => {
    const rows: [number, number][] = [
      [0, 3],
      [10, 5],
      [20, 4],
    ];
    expect(valueAt(rows, 5)).toBe(4);
    expect(valueAt(rows, 15)).toBe(4.5);
    expect(valueAt(rows, 20)).toBe(4);
    expect(valueAt(rows, -1)).toBeUndefined();
    expect(valueAt(rows, 21)).toBeUndefined();
  });

  it("colours warm to cold and clamps the ends", () => {
    expect(climateColor(2)).toBe(climateColor(3));
    expect(climateColor(3)).toBe("rgb(222, 146, 78)");
    expect(climateColor(6)).toBe("rgb(196, 228, 255)");
  });

  it("names the state of the climate", () => {
    expect(climateWords(5.0)).toMatch(/height/);
    expect(climateWords(3.2)).toBe("About as much ice as today");
    expect(climateWords(3.6)).toBe("More ice than today");
    expect(climateWords(2.8)).toMatch(/warmer/);
  });
});

describe("climate popover data", () => {
  const c = {
    sources: [],
    d18o: [
      [0, 3.2],
      [20, 5.0],
      [130, 3.4],
    ] as [number, number][],
    temperature: [
      [0, 0],
      [20, -6],
    ] as [number, number][],
    sea_level: [
      [0, 0],
      [80, -20],
      [81, -30, -50, -10],
      [100, -40, -60, -20],
    ] as Climate["sea_level"],
    mis: [
      [0, 14, "1"],
      [14, 29, "2"],
      [29, 130, "3"],
    ] as Climate["mis"],
  };

  it("tells cold stages from warm ones, lettered stages too", () => {
    expect(isColdStage("2")).toBe(true);
    expect(isColdStage("5")).toBe(false);
    expect(isColdStage("M2")).toBe(true);
    expect(isColdStage("G1")).toBe(false);
  });

  it("finds the stage at an age", () => {
    expect(stageAt(c.mis, 20)).toEqual({ stage: "2", from: 14, to: 29, cold: true });
    expect(stageAt(c.mis, 130)?.stage).toBe("3");
    expect(stageAt(c.mis, 131)).toBeUndefined();
  });

  it("gathers temperature, sea level (with its range where given) and stage", () => {
    const at = climateAt(c, 1950 - 20_000);
    expect(at).toMatchObject({ ka: 20, d18o: 5, temperature: -6, stage: { stage: "2" } });
    expect(at.sea).toEqual({ m: -5, lo: undefined, hi: undefined });
    expect(climateAt(c, 1950 - 90_000).sea).toMatchObject({ lo: expect.closeTo(-54.7, 1), hi: expect.closeTo(-14.7, 1) });
    expect(climateAt(c, 1950 - 100_000).temperature).toBeUndefined();
  });
});
