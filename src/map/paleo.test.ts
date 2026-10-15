import { describe, expect, it } from "vitest";
import { snapshotAt, type PaleoIndex } from "./paleo";

const index: PaleoIndex = {
  snapshots: {},
  ranges: [
    [0, 1.25, "gowan-000"],
    [1.25, 3.75, "gowan-025"],
    [78.75, 81.25, "gowan-800"],
    [81.25, 90.5, "slm060"],
  ],
  sources: [],
};
const yearOfKa = (ka: number) => 1950 - ka * 1000;

describe("snapshotAt", () => {
  it("finds the snapshot covering an age", () => {
    expect(snapshotAt(index, 1950)).toBe("gowan-000");
    expect(snapshotAt(index, 1)).toBe("gowan-025"); // 1 CE: 1.949 ka
    expect(snapshotAt(index, yearOfKa(2))).toBe("gowan-025");
    expect(snapshotAt(index, yearOfKa(80))).toBe("gowan-800");
    expect(snapshotAt(index, yearOfKa(85))).toBe("slm060");
  });

  it("is null beyond the records", () => {
    expect(snapshotAt(index, yearOfKa(95))).toBeNull();
  });
});
