import { describe, expect, it } from "vitest";
import type { Entity } from "../types";
import { contemporaries } from "./contemporaries";

const sp = (id: string, start_year: number, end_year: number, extra: Partial<Entity> = {}): Entity => ({
  id,
  name: id,
  category: "species",
  start_year,
  end_year,
  description: "",
  source_ids: [],
  ...extra,
});

describe("contemporaries", () => {
  const all = [
    sp("sapiens", -300_000, -10_000),
    sp("neanderthal", -430_000, -40_000),
    sp("floresiensis", -100_000, -60_000),
    sp("erectus", -2_000_000, -110_000),
    sp("afarensis", -3_800_000, -2_900_000),
    sp("hominins", -7_000_000, 0, { group: true }),
    { ...sp("mousterian", -300_000, -40_000), category: "culture" as const },
  ];

  it("lists overlapping species, oldest first, with the shared years", () => {
    const got = contemporaries(all[0], all);
    expect(got.map((c) => c.entity.id)).toEqual(["erectus", "neanderthal", "floresiensis"]);
    expect(got[1]).toMatchObject({ from: -300_000, to: -40_000 });
  });

  it("leaves out groups, other categories and itself", () => {
    const ids = contemporaries(all[1], all).map((c) => c.entity.id);
    expect(ids).not.toContain("hominins");
    expect(ids).not.toContain("mousterian");
    expect(ids).not.toContain("neanderthal");
  });

  it("is empty for species alone in their time, and for non-species", () => {
    expect(contemporaries(all[4], all)).toEqual([]);
    expect(contemporaries(all[6], all)).toEqual([]);
  });
});
