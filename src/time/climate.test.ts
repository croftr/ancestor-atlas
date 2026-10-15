import { describe, expect, it } from "vitest";
import { climateColor, climateWords, kaOf, valueAt } from "./climate";

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
    expect(climateWords(3.2)).toMatch(/Warm/);
  });
});
