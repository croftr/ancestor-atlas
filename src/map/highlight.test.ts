import { describe, expect, it } from "vitest";
import { ARRIVAL_MS, PULSES, highlightFrame } from "./highlight";

const kinds = (elapsed: number | null) =>
  highlightFrame([10, 20], elapsed).features.map((f) => f.properties?.kind);
const boost = (elapsed: number | null) =>
  highlightFrame([10, 20], elapsed).features.find((f) => f.properties?.kind === "ring")?.properties?.boost;

describe("highlightFrame", () => {
  it("shows the steady glow and ring while travelling", () => {
    expect(kinds(null)).toEqual(["glow", "ring"]);
    expect(boost(null)).toBe(0);
  });

  it("flares on arrival and ripples, then settles", () => {
    expect(boost(0)).toBe(1);
    expect(kinds(0)).toContain("pulse");
    expect(kinds(PULSES[2] + 10).filter((k) => k === "pulse").length).toBeGreaterThanOrEqual(2);
    expect(boost(ARRIVAL_MS)).toBe(0);
    expect(kinds(ARRIVAL_MS)).toEqual(["glow", "ring"]);
  });
});
