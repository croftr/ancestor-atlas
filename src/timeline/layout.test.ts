import { describe, expect, it } from "vitest";
import type { Entity } from "../types";
import {
  AXIS_END,
  eraIndexOf,
  resolveEras,
  stepEra,
  MIN_SPAN,
  buildRows,
  clampWindow,
  fitWindow,
  formatDuration,
  tickLabel,
  ticks,
  zoomWindow,
} from "./layout";

const ent = (id: string, category: Entity["category"], start_year: number, end_year: number, extra: Partial<Entity> = {}): Entity => ({
  id,
  name: id,
  category,
  start_year,
  end_year,
  description: "",
  source_ids: [],
  ...extra,
});

const MIN = -7_500_000;

describe("window maths", () => {
  it("clamps to the axis and a minimum span", () => {
    expect(clampWindow({ start: -100, end: 500 }, MIN)).toEqual({ start: -599, end: AXIS_END });
    const tiny = clampWindow({ start: -1000, end: -999 }, MIN);
    expect(tiny.end - tiny.start).toBe(MIN_SPAN);
    expect(clampWindow({ start: -9e9, end: 9e9 }, MIN)).toEqual({ start: MIN, end: AXIS_END });
  });

  it("zooms around the pointer", () => {
    const w = zoomWindow({ start: -10_000, end: 0 }, 0.5, 0.5, MIN);
    expect(w).toEqual({ start: -7_500, end: -2_500 });
  });

  it("fits an entity with a margin", () => {
    const w = fitWindow(-3_000, -2_000, MIN, 0.1);
    expect(w).toEqual({ start: -3_100, end: -1_900 });
  });
});

describe("ticks", () => {
  it("fall on round BCE values", () => {
    const t = ticks({ start: -3_500, end: 1 }, 8);
    expect(t.map((y) => 1 - y)).toEqual([3_500, 3_000, 2_500, 2_000, 1_500, 1_000, 500, 0]);
    expect(tickLabel(-2_999, 500)).toBe("3,000 BCE");
    expect(tickLabel(1, 500)).toBe("1 CE");
    expect(tickLabel(1 - 2_500_000, 500_000)).toBe("2.5 Ma");
    expect(tickLabel(1 - 300_000, 50_000)).toBe("300 ka");
  });
});

describe("durations", () => {
  it("reads naturally", () => {
    expect(formatDuration(1_912_345)).toBe("1.91 million years");
    expect(formatDuration(430_200)).toBe("430,000 years");
    expect(formatDuration(1_234)).toBe("1,230 years");
    expect(formatDuration(165)).toBe("170 years");
    expect(formatDuration(99)).toBe("99 years");
    expect(formatDuration(0)).toBe("under a year");
  });
});

describe("rows", () => {
  const entities = [
    ent("sp-old", "species", -3_000_000, -2_000_000),
    ent("sp-new", "species", -300_000, -10_000),
    ent("egypt", "civilization", -3_100, -30, { group: true }),
    ent("old-kingdom", "civilization", -2_686, -2_181, { parent_id: "egypt" }),
    ent("new-kingdom", "civilization", -1_550, -1_069, { parent_id: "egypt" }),
    ent("akkad", "civilization", -2_334, -2_154),
  ];
  const base = { collapsedLanes: new Set<never>(), expandedGroups: new Set<string>() };

  it("lists only entities in view, by start, with groups collapsed", () => {
    const rows = buildRows(entities, { ...base, window: { start: -5_000, end: 1 } });
    const shape = rows.map((r) => (r.kind === "lane" ? `[${r.category} ${r.inView}/${r.total}]` : r.entity.id));
    expect(shape).toEqual(["[species 0/2]", "[civilization 2/2]", "egypt", "akkad"]);
  });

  it("expands a group to its children in view", () => {
    const rows = buildRows(entities, {
      ...base,
      window: { start: -3_000, end: -2_000 },
      expandedGroups: new Set(["egypt"]),
    });
    expect(rows.filter((r) => r.kind === "entity").map((r) => r.kind === "entity" && `${r.depth}:${r.entity.id}`)).toEqual([
      "0:egypt",
      "1:old-kingdom",
      "0:akkad",
    ]);
  });
});

describe("eras", () => {
  const eras = resolveEras(
    [
      { label: "Deep", start: null },
      { label: "Late Ice Age", start: -49_999 },
      { label: "Neolithic", start: -9_999 },
      { label: "Civilizations", start: -3_499 },
    ],
    MIN,
  );
  const win = (i: number) => ({ start: eras[i].start, end: eras[i].end });

  it("are contiguous from the axis start to 1 CE", () => {
    expect(eras[0].start).toBe(MIN);
    expect(eras.at(-1)!.end).toBe(AXIS_END);
    for (let i = 1; i < eras.length; i++) expect(eras[i].start).toBe(eras[i - 1].end);
  });

  it("step to the neighbouring era and stop at the ends", () => {
    expect(stepEra(eras, win(3), -1)?.label).toBe("Neolithic");
    expect(stepEra(eras, win(2), 1)?.label).toBe("Civilizations");
    expect(stepEra(eras, win(3), 1)).toBeNull();
    expect(stepEra(eras, win(0), -1)).toBeNull();
  });

  it("work from any zoom", () => {
    // Zoomed into 2,000-1,000 BCE (inside Civilizations): Earlier goes to Neolithic, Later snaps
    // to the whole Civilizations era.
    const zoomed = { start: -1_999, end: -999 };
    expect(eraIndexOf(eras, zoomed)).toBe(3);
    expect(stepEra(eras, zoomed, -1)?.label).toBe("Neolithic");
    expect(stepEra(eras, zoomed, 1)?.label).toBe("Civilizations");
  });
});
