import { describe, expect, it } from "vitest";
import { gapWords, greatCircle, pathSoFar, reachedAt, spanWords, trail, TRAIL_DELAY_MS, unwrap, type LngLat } from "./epilogue";

describe("greatCircle", () => {
  it("runs from a to b along the shorter way round", () => {
    const line = greatCircle([170, 0], [-170, 0]);
    expect(line[0][0]).toBeCloseTo(170);
    expect(line[line.length - 1][0]).toBeCloseTo(-170);
    // Through the antimeridian, not back across Africa.
    for (const [lon] of line) expect(Math.abs(lon)).toBeGreaterThan(169);
  });
  it("bends towards the pole between two northern places", () => {
    const line = greatCircle([0, 50], [100, 50]);
    expect(Math.max(...line.map((p) => p[1]))).toBeGreaterThan(60);
  });
  it("copes with two stops in the same place", () => {
    expect(greatCircle([10, 10], [10, 10])).toEqual([
      [10, 10],
      [10, 10],
    ]);
  });
});

describe("unwrap", () => {
  it("keeps longitudes continuous across the antimeridian", () => {
    expect(unwrap([[179, 0], [-179, 0], [-177, 1]])).toEqual([[179, 0], [181, 0], [183, 1]]);
  });
});

describe("trail", () => {
  const points: LngLat[] = [
    [0, 0],
    [40, 0],
    [40, 30],
  ];
  const t = trail(points);
  it("draws nothing before the delay", () => {
    expect(t.at(0)).toEqual({ line: [], head: null, reached: [] });
  });
  it("reaches each stop on its beat, and ends at the last", () => {
    const mid = t.at((reachedAt(0, 3) + reachedAt(1, 3)) / 2);
    expect(mid.reached.map((r) => r.index)).toEqual([0]);
    expect(mid.head).not.toBeNull();
    const done = t.at(t.end + 1);
    expect(done.reached.map((r) => r.index)).toEqual([0, 1, 2]);
    expect(done.head).toBeNull();
    expect(done.line[done.line.length - 1][0]).toBeCloseTo(40);
    expect(done.line[done.line.length - 1][1]).toBeCloseTo(30);
  });
  it("starts the thread at the first stop", () => {
    expect(t.at(TRAIL_DELAY_MS).line[0]).toEqual([0, 0]);
  });
});

describe("spanWords", () => {
  it("rounds deep time and recent time sensibly", () => {
    expect(spanWords(6_999_500)).toBe("7 million years");
    expect(spanWords(3_300_000)).toBe("3.3 million years");
    expect(spanWords(46_000)).toBe("46,000 years");
    expect(spanWords(287_400)).toBe("290,000 years");
    expect(spanWords(3_449)).toBe("3,400 years");
    expect(spanWords(1)).toBe("1 year");
  });
});

describe("pathSoFar", () => {
  const points: LngLat[] = [
    [0, 0],
    [40, 0],
    [40, 30],
  ];
  it("is empty before the first stop, a lone stop after it", () => {
    expect(pathSoFar(points, 0)).toEqual({ line: [], head: null, stops: [] });
    expect(pathSoFar(points, 1)).toEqual({ line: [[0, 0]], head: null, stops: [[0, 0]] });
  });
  it("draws the newest leg part way, its stop not yet marked", () => {
    const half = pathSoFar(points, 2, 0.5);
    expect(half.stops).toEqual([[0, 0]]);
    expect(half.head![0]).toBeCloseTo(20, 0);
    const done = pathSoFar(points, 3);
    expect(done.head).toBeNull();
    expect(done.stops).toHaveLength(3);
    expect(done.line[done.line.length - 1][1]).toBeCloseTo(30);
  });
});

describe("gapWords", () => {
  it("says how much time passes", () => {
    expect(gapWords(40_000)).toBe("40,000 years later");
    expect(gapWords(1_200_000)).toBe("1.2 million years later");
    expect(gapWords(0)).toBe("Meanwhile");
  });
});
