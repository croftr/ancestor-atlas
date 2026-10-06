import { describe, expect, it } from "vitest";
import { calibrate, loadCurve } from "./calibrate.ts";

const curve = loadCurve();

describe("calibrate (IntCal20)", () => {
  // Reference values from iosacal 0.6 with the same IntCal20 curve (95.4% HPD, outer bounds).
  it.each([
    [10705, 35, 12744, 12677],
    [26350, 550, 31336, 29298],
    [4500, 40, 5306, 4982],
  ])("matches iosacal for %i ± %i BP", (bp, err, from, to) => {
    const c = calibrate(curve, bp, err)!;
    expect(Math.abs(c.from - from)).toBeLessThanOrEqual(2);
    expect(Math.abs(c.to - to)).toBeLessThanOrEqual(2);
  });
  it("returns older-first ranges with the median inside", () => {
    const c = calibrate(curve, 5000, 30)!;
    expect(c.from).toBeGreaterThan(c.to);
    expect(c.median).toBeLessThanOrEqual(c.from);
    expect(c.median).toBeGreaterThanOrEqual(c.to);
  });
  it("rejects ages beyond the curve", () => {
    expect(calibrate(curve, 60000, 500)).toBeUndefined();
    expect(calibrate(curve, 100, 0)).toBeUndefined();
  });
});
