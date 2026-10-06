import { describe, expect, it } from "vitest";
import { civColors, hash, hslToHex } from "./colors.ts";

describe("colors", () => {
  it("is deterministic", () => {
    expect(hash("egypt")).toBe(hash("egypt"));
    expect(civColors("a", "b")).toEqual(civColors("a", "b"));
  });
  it("converts hsl to hex", () => {
    expect(hslToHex(0, 100, 50)).toBe("#ff0000");
    expect(hslToHex(120, 100, 50)).toBe("#00ff00");
  });
  it("gives group children the same hue family", () => {
    const hueOf = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
      const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return Math.round(((h * 60) + 360) % 360);
    };
    const a = hueOf(civColors("ancient-egypt", "old-kingdom").color);
    const b = hueOf(civColors("ancient-egypt", "new-kingdom").color);
    expect(Math.abs(a - b)).toBeLessThanOrEqual(3);
  });
});
