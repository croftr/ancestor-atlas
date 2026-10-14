import { describe, expect, it } from "vitest";
import { pictureIndexAt, pictureTimes } from "./tourPicture";

const x = (at?: number) => ({ url: "/images/x.webp", credit: "c", at });

describe("pictureTimes", () => {
  it("shares the hold evenly when nothing is timed", () => {
    expect(pictureTimes([x()], 20_000)).toEqual([0, 10_000]);
    expect(pictureTimes([x(), x()], 30_000)).toEqual([0, 10_000, 20_000]);
  });
  it("uses `at` (seconds) and spreads untimed pictures around it", () => {
    expect(pictureTimes([x(4), x(12)], 30_000)).toEqual([0, 4_000, 12_000]);
    expect(pictureTimes([x(), x(10)], 30_000)).toEqual([0, 5_000, 10_000]);
    expect(pictureTimes([x(10), x()], 30_000)).toEqual([0, 10_000, 20_000]);
  });
});

describe("pictureIndexAt", () => {
  it("is the main picture without extras", () => expect(pictureIndexAt(undefined, 50_000, 20_000)).toBe(0));
  it("moves on at each start time", () => {
    const extras = [x(), x(8)];
    expect(pictureIndexAt(extras, 0, 20_000)).toBe(0);
    expect(pictureIndexAt(extras, 3_999, 20_000)).toBe(0);
    expect(pictureIndexAt(extras, 4_000, 20_000)).toBe(1);
    expect(pictureIndexAt(extras, 9_000, 20_000)).toBe(2);
  });
});
