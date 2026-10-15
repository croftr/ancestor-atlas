import type { Entity } from "../types";

/** Another species alive at the same time as one, and the years both were around. */
export interface Contemporary {
  entity: Entity;
  from: number;
  to: number;
}

/**
 * The other species whose span overlaps this species' span, oldest first. Only species (not
 * cultures or civilizations), and no group entities. Empty for anything that is not a species.
 */
export function contemporaries(entity: Entity, entities: Entity[]): Contemporary[] {
  if (entity.category !== "species") return [];
  return entities
    .filter((e) => e.category === "species" && !e.group && e.id !== entity.id)
    .map((e) => ({ entity: e, from: Math.max(e.start_year, entity.start_year), to: Math.min(e.end_year, entity.end_year) }))
    .filter((c) => c.from < c.to)
    .sort((a, b) => a.entity.start_year - b.entity.start_year);
}
