import { describe, expect, it } from "vitest";
import { agoText, chartWindow } from "./ClimatePopover";

describe("agoText", () => {
  it("rounds ages to the records' precision", () => {
    expect(agoText(21.949)).toBe("21,900 years ago");
    expect(agoText(327.803)).toBe("328,000 years ago");
    expect(agoText(524.485, true)).toBe("520,000 years ago");
    expect(agoText(1240)).toBe("1.24 million years ago");
    expect(agoText(0.1)).toBe("today");
  });
});

describe("chartWindow", () => {
  it("centres a window on the moment, kept within the record", () => {
    expect(chartWindow(20, 5320)).toEqual([0, 40]);
    expect(chartWindow(300, 5320)).toEqual([120, 480]);
    expect(chartWindow(5300, 5320)).toEqual([4120, 5320]);
  });
});
