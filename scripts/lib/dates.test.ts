import { describe, expect, it } from "vitest";
import { fromCalBP, fromHistorical, fromKa, fromMa, minWindow } from "./dates.ts";

describe("dates", () => {
  it("converts Ma / ka / calibrated BP to astronomical years", () => {
    expect(fromMa(1.8)).toBe(-1_798_050);
    expect(fromMa(0)).toBe(1950);
    expect(fromKa(110)).toBe(-108_050);
    expect(fromCalBP(1950)).toBe(0); // 1 BCE
    expect(fromCalBP(11_950)).toBe(-10_000);
  });

  it("converts historical BCE (no year 0) to astronomical", () => {
    expect(fromHistorical(-1)).toBe(0);
    expect(fromHistorical(-330)).toBe(-329);
    expect(fromHistorical(14)).toBe(14);
  });

  it("widens short windows symmetrically", () => {
    expect(minWindow(-1000, -1000, 100)).toEqual([-1050, -950]);
    expect(minWindow(-1000, -800, 100)).toEqual([-1000, -800]);
  });

  it("keeps widened windows inside the slider range", () => {
    expect(minWindow(-9_999_999, -9_999_999, 100)).toEqual([-9_999_999, -9_999_899]);
    expect(minWindow(1, 1, 100)).toEqual([-99, 1]);
  });
});
