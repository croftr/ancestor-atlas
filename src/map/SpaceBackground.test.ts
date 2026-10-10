import { describe, expect, it } from "vitest";
import { generateStars, STAR_COLORS } from "./SpaceBackground";

describe("generateStars", () => {
  it("generates the requested number of stars", () => {
    const stars = generateStars(100);
    expect(stars).toHaveLength(100);
  });

  it("is deterministic across multiple runs with the same seed", () => {
    const run1 = generateStars(50);
    const run2 = generateStars(50);
    expect(run1).toEqual(run2);
  });

  it("keeps all normalized coordinates within [0, 1]", () => {
    const stars = generateStars(500);
    for (const star of stars) {
      expect(star.u).toBeGreaterThanOrEqual(0);
      expect(star.u).toBeLessThanOrEqual(1);
      expect(star.v).toBeGreaterThanOrEqual(0);
      expect(star.v).toBeLessThanOrEqual(1);
    }
  });

  it("assigns valid colors from the star palette", () => {
    const stars = generateStars(200);
    for (const star of stars) {
      expect(STAR_COLORS).toContain(star.color);
    }
  });

  it("includes all layers (static, twinkleA, twinkleB) and hero stars with spikes", () => {
    const stars = generateStars(750);
    const staticStars = stars.filter((s) => s.layer === 0);
    const twinkleAStars = stars.filter((s) => s.layer === 1);
    const twinkleBStars = stars.filter((s) => s.layer === 2);
    const heroStars = stars.filter((s) => s.hasSpike);

    expect(staticStars.length).toBeGreaterThan(300);
    expect(twinkleAStars.length).toBeGreaterThan(40);
    expect(twinkleBStars.length).toBeGreaterThan(40);
    expect(heroStars.length).toBeGreaterThan(3);
  });
});
