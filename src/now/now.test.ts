import { describe, expect, it } from "vitest";
import type { Data } from "../map/data";
import type { Category, Entity, FeatureProps } from "../types";
import { nowIndex, nowItems } from "./now";

const entity = (id: string, category: Category, start: number): Entity =>
  ({ id, name: id, category, start_year: start, end_year: 1 }) as unknown as Entity;
const feature = (id: string, entity_id: string, category: Category, start: number, end: number): FeatureProps =>
  ({ id, entity_id, category, start_year: start, end_year: end }) as unknown as FeatureProps;

const entities = [
  entity("rome", "civilization", -752),
  entity("sapiens", "species", -300_000),
  entity("ur", "city", -3800),
  entity("writing", "event", -3400),
  entity("old", "culture", -9000),
];
const features = [
  feature("rome@1", "rome", "civilization", -500, 1),
  feature("sapiens@1", "sapiens", "species", -300_000, 1),
  feature("sapiens@2", "sapiens", "species", -50_000, 1),
  feature("ur@1", "ur", "city", -3800, -500),
  feature("writing@1", "writing", "event", -3400, -3400),
  feature("old@1", "old", "culture", -9000, -8000),
];
const data = {
  entities,
  entityById: new Map(entities.map((e) => [e.id, e])),
  features,
  bboxOf: new Map(),
} as unknown as Data;
const all = { species: true, culture: true, civilization: true, city: true, event: true };

describe("nowItems", () => {
  it("lists each entity on the globe once, in the legend's order, then the sky", () => {
    const items = nowItems(data, -9, all); // 10 BCE: Halley's Comet, the Han new star, Jupiter and Venus
    expect(items.map((i) => i.id)).toEqual(["sapiens", "rome", "halley-12-bce", "han-new-stars", "jupiter-venus-2-bce"]);
    const sapiens = items[0];
    expect(sapiens.kind === "entity" && sapiens.features.map((f) => f.id)).toEqual(["sapiens@1", "sapiens@2"]);
  });

  it("leaves out layers that are switched off", () => {
    expect(nowItems(data, -9, { ...all, species: false }).map((i) => i.id)).not.toContain("sapiens");
  });

  it("finds the open card or sky panel in the list", () => {
    const items = nowItems(data, -9, all);
    const rome = features[0];
    expect(nowIndex(items, { selectedId: rome.id, hits: [rome], groupId: null }, null)).toBe(1);
    expect(nowIndex(items, { selectedId: null, hits: [], groupId: null }, "han-new-stars")).toBe(3);
    expect(nowIndex(items, { selectedId: null, hits: [], groupId: null }, null)).toBe(-1);
  });
});
