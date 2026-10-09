import { describe, expect, it } from "vitest";
import { polygonAnchor } from "./anchor";

const inside = (p: [number, number], ring: number[][]) => {
  let r = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[i], [bx, by] = ring[j];
    if (ay > p[1] !== by > p[1] && p[0] < ((bx - ax) * (p[1] - ay)) / (by - ay) + ax) r = !r;
  }
  return r;
};

describe("polygonAnchor", () => {
  it("finds the middle of a square", () => {
    const sq = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
    const [x, y] = polygonAnchor({ type: "Polygon", coordinates: [sq] })!;
    expect(x).toBeCloseTo(5, 0);
    expect(y).toBeCloseTo(5, 0);
  });

  it("stays inside an L shape, whose bounding-box centre is outside", () => {
    const l = [[0, 0], [10, 0], [10, 2], [2, 2], [2, 10], [0, 10], [0, 0]];
    const p = polygonAnchor({ type: "Polygon", coordinates: [l] })!;
    expect(inside([5, 5], l)).toBe(false);
    expect(inside(p, l)).toBe(true);
  });

  it("uses the largest part of a multipolygon", () => {
    const island = [[20, 20], [21, 20], [21, 21], [20, 21], [20, 20]];
    const mainland = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
    const [x] = polygonAnchor({ type: "MultiPolygon", coordinates: [[island], [mainland]] })!;
    expect(x).toBeLessThan(10);
  });

  it("returns null for points or missing geometry", () => {
    expect(polygonAnchor(null)).toBeNull();
    expect(polygonAnchor({ type: "Point", coordinates: [1, 2] })).toBeNull();
  });
});
