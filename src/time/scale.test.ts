import { describe, expect, it } from "vitest";
import { formatYear, posToYear, segmentOfBce, snapYear, stepYear, yearToPos } from "./scale";

describe("scale", () => {
  it("maps endpoints", () => {
    expect(posToYear(0)).toBe(-9_999_999);
    expect(posToYear(1)).toBe(1);
  });

  it("formats years", () => {
    expect(formatYear(1)).toBe("1 CE");
    expect(formatYear(-2999)).toBe("3,000 BCE");
    expect(formatYear(-1_799_999)).toBe("c. 1.8 million years ago");
    expect(formatYear(-9_999_999)).toBe("c. 10 million years ago");
    expect(formatYear(0)).toBe("1 BCE");
  });

  it("rounds deep-time dates for display, leaving round ones alone", () => {
    expect(formatYear(-347_050)).toBe("c. 347,000 BCE");
    expect(formatYear(-28_050)).toBe("c. 28,100 BCE");
    expect(formatYear(-100_550)).toBe("c. 101,000 BCE");
    expect(formatYear(-9_999)).toBe("10,000 BCE"); // already round
    expect(formatYear(-42_999)).toBe("43,000 BCE"); // a slider year
    expect(formatYear(-499_999)).toBe("500,000 BCE");
    expect(formatYear(-4_099)).toBe("4,100 BCE"); // under 10,000 BCE: exact
    expect(formatYear(-9_000)).toBe("9,001 BCE");
  });

  it("round-trips snapped years in every segment", () => {
    for (const y of [-4_999_999, -499_999, -42_999, -4_999, -1_549]) {
      expect(posToYear(yearToPos(y))).toBe(y);
    }
  });

  it("snaps per segment", () => {
    expect((1 - snapYear(-3_456_789)) % 100_000).toBe(0);
    expect((1 - snapYear(-1_234)) % 10).toBe(0);
    expect(segmentOfBce(3000)).toBe(4);
    expect(segmentOfBce(3001)).toBe(3);
  });

  it("steps and clamps", () => {
    expect(stepYear(1, 1)).toBe(1);
    expect(stepYear(-9_999_999, -1)).toBe(-9_999_999);
    expect(stepYear(-2999, 1)).toBe(-2989);
    expect(stepYear(-2999, -1)).toBe(-3099);
    expect(stepYear(-999_999, 1)).toBe(-989_999);
  });
});
