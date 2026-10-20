import { beforeAll, describe, expect, it } from "vitest";
import { areaAt, loadAreas } from "./area";

describe("areaAt", () => {
  beforeAll(async () => {
    await loadAreas();
  });

  it("names the country and continent of a point, with the Americas apart", () => {
    expect(areaAt(-60, -10, "country")?.name).toBe("Brazil");
    expect(areaAt(-60, -10, "continent")?.name).toBe("South America");
    expect(areaAt(-99, 19, "continent")?.name).toBe("North America");
    expect(areaAt(116, 40, "country")?.name).toBe("China");
    expect(areaAt(37, 0, "continent")?.name).toBe("Africa");
  });

  it("cuts a country to the point's continent", () => {
    // Denisova Cave: Asian Russia, which doesn't reach Moscow.
    const siberia = areaAt(84.7, 51.4, "country")!;
    expect(siberia.name).toBe("Russia");
    expect(siberia.contains(83, 55)).toBe(true);
    expect(siberia.contains(37.6, 55.7)).toBe(false);
    // The contiguous US and Alaska, not Hawaii.
    const us = areaAt(-77, 39, "country")!;
    expect(us.contains(-150, 61)).toBe(true);
    expect(us.contains(-157, 21)).toBe(false);
  });

  it("counts coastal sites, not ones far out at sea", () => {
    const za = areaAt(22, -30, "country")!;
    expect(za.contains(21.42, -34.42)).toBe(true); // Blombos Cave
    expect(za.contains(20, -45)).toBe(false);
  });

  it("has nothing at sea", () => {
    expect(areaAt(-40, 25, "continent")).toBeNull();
  });
});
