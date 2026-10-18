import { describe, expect, it } from "vitest";
import {
  CLIMATE_RECORD_START,
  computeStagesInView,
  stageLabel,
} from "./ClimateRibbon";

describe("ClimateRibbon - computeStagesInView", () => {
  const sampleMis: [number, number, string][] = [
    [0, 14, "1"],
    [14, 29, "2"],
    [29, 57, "3"],
    [57, 71, "4"],
    [71, 130, "5"],
    [130, 191, "6"],
    [5315, 5320, "TG6"],
  ];

  it("identifies stages in the visible time window", () => {
    // Window: -30,000 to -10,000 BCE (covers MIS 1, 2, 3)
    const stages = computeStagesInView(sampleMis, -30_000, -10_000);
    const names = stages.map((s) => s.stage);
    expect(names).toEqual(["1", "2", "3"]);
  });

  it("calculates startYear and endYear in astronomical years", () => {
    const stages = computeStagesInView(sampleMis, -30_000, -10_000);
    const mis2 = stages.find((s) => s.stage === "2")!;
    expect(mis2).toBeDefined();
    // MIS 2: 14 ka to 29 ka
    // startYear: 1950 - 29 * 1000 = -27050
    // endYear: 1950 - 14 * 1000 = -12050
    expect(mis2.startYear).toBe(-27_050);
    expect(mis2.endYear).toBe(-12_050);
    expect(mis2.cold).toBe(true); // MIS 2 is even -> cold (glacial)
  });

  it("distinguishes glacial (cold, even) from interglacial (warm, odd) stages", () => {
    const stages = computeStagesInView(sampleMis, -200_000, 2000);
    const stage1 = stages.find((s) => s.stage === "1")!;
    const stage2 = stages.find((s) => s.stage === "2")!;
    const stage3 = stages.find((s) => s.stage === "3")!;
    const stage4 = stages.find((s) => s.stage === "4")!;
    const stage5 = stages.find((s) => s.stage === "5")!;
    const stage6 = stages.find((s) => s.stage === "6")!;

    expect(stage1.cold).toBe(false); // Holocene (warm)
    expect(stage2.cold).toBe(true);  // Last Glacial Maximum (cold)
    expect(stage3.cold).toBe(false); // Mild interstadial (warm)
    expect(stage4.cold).toBe(true);  // Early glacial (cold)
    expect(stage5.cold).toBe(false); // Eemian interglacial (warm)
    expect(stage6.cold).toBe(true);  // Penultimate glacial (cold)
  });

  it("attaches notes for well-known stages", () => {
    const stages = computeStagesInView(sampleMis, -50_000, 2000);
    const mis1 = stages.find((s) => s.stage === "1")!;
    const mis2 = stages.find((s) => s.stage === "2")!;
    expect(mis1.note).toContain("Holocene");
    expect(mis2.note).toContain("Last Glacial Maximum");
  });

  it("extends MIS 1 (Holocene) forward to the present day", () => {
    const stages = computeStagesInView(sampleMis, -10_000, 2026);
    const mis1 = stages.find((s) => s.stage === "1")!;
    expect(mis1.endYear).toBeGreaterThanOrEqual(2026);
  });

  it("filters out stages strictly outside the window", () => {
    // Window: -2000 to 2000 CE (MIS 1 only)
    const stages = computeStagesInView(sampleMis, -2000, 2000);
    expect(stages.map((s) => s.stage)).toEqual(["1"]);
  });
});

describe("ClimateRibbon - stageLabel", () => {
  it("formats full label with glacial/warm note when wide", () => {
    expect(stageLabel("2", 120, true)).toBe("MIS 2 (glacial)");
    expect(stageLabel("1", 110, false)).toBe("MIS 1 (warm)");
  });

  it("formats standard MIS label when medium width", () => {
    expect(stageLabel("2", 60, true)).toBe("MIS 2");
    expect(stageLabel("M2", 42, true)).toBe("MIS M2");
  });

  it("formats short stage number when narrow", () => {
    expect(stageLabel("2", 25, true)).toBe("2");
    expect(stageLabel("104", 18, true)).toBe("104");
  });

  it("returns empty string when too narrow to fit text", () => {
    expect(stageLabel("2", 15, true)).toBe("");
    expect(stageLabel("2", 5, true)).toBe("");
  });
});

describe("ClimateRibbon - CLIMATE_RECORD_START", () => {
  it("is at 5,320 ka (-5,318,050 BCE)", () => {
    expect(CLIMATE_RECORD_START).toBe(1950 - 5320 * 1000);
  });
});
