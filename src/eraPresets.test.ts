import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ERA_PRESETS } from "./config";
import { isActive } from "./map/data";
import { snapYear } from "./time/scale";
import type { Entity } from "./types";

const entities: Entity[] = JSON.parse(readFileSync("public/data/entities.json", "utf8"));
const byId = new Map(entities.map((e) => [e.id, e]));

describe("era chips", () => {
  it.each(ERA_PRESETS)("$label lands on its event", ({ event }) => {
    const ev = byId.get(event);
    expect(ev?.category).toBe("event");
    expect(isActive({ ...ev!, category: "event" }, snapYear(ev!.year ?? ev!.start_year))).toBe(true);
  });

  it("runs oldest first", () => {
    const years = ERA_PRESETS.map((p) => byId.get(p.event)?.year ?? 0);
    expect(years).toEqual([...years].sort((a, b) => a - b));
  });
});
