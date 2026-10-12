import { describe, expect, it } from "vitest";
import { cultureName, formatRange, siteWindow } from "./road.ts";

describe("siteWindow", () => {
  const span: [number, number] = [-1_908_050, -100_550]; // H. erectus
  it("keeps a bracket inside the species span", () =>
    expect(siteWindow(780_000, 400_000, span)).toEqual({ start: -778_050, end: -398_050, clipped: false }));
  it("clips a bracket that runs past the span", () => {
    const w = siteWindow(2_500_000, 1_500_000, span)!;
    expect([w.start, w.end, w.clipped]).toEqual([-1_908_050, -1_498_050, true]);
  });
  it("drops a bracket that misses the span", () => expect(siteWindow(40_000, 30_000, span)).toBeUndefined());
  it("widens a narrow bracket but not past the span", () => {
    const w = siteWindow(102_600, 102_200, span)!;
    expect(w.end).toBe(-100_550);
    expect(w.end - w.start).toBeGreaterThanOrEqual(20_000);
  });
});

describe("formatRange", () => {
  it("shares the unit when both ends use it", () => expect(formatRange(644_000, 220_000)).toBe("644–220 ka"));
  it("mixes units across a million years", () => expect(formatRange(1_803_000, 437_000)).toBe("1.8 Ma–437 ka"));
});

describe("cultureName", () => {
  it("drops the period prefix and puts the region in brackets", () => {
    expect(cultureName("MP/ Mousterian - Eurasia")).toBe("Mousterian (Eurasia)");
    expect(cultureName("LP/MP Middle Pleistocene - E Asia")).toBe("Middle Pleistocene (E Asia)");
    expect(cultureName("ESA/ Oldowan")).toBe("Oldowan");
  });
  it("spells out Stone Age abbreviations", () => {
    expect(cultureName("MSA")).toBe("Middle Stone Age");
    expect(cultureName("MSA/LSA")).toBe("Middle Stone Age/Later Stone Age");
    expect(cultureName("MSA/ MSA 2b")).toBe("Middle Stone Age 2b");
  });
});
