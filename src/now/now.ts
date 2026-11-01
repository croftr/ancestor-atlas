import { isActive, type Data } from "../map/data";
import { navOrder } from "../search/search";
import { SKY_EVENTS, skyShownAt, type SkyEvent } from "../sky/sky";
import { CATEGORIES, type Category, type Entity, type FeatureProps } from "../types";

/**
 * Everything on the globe at one moment, to step through one by one from the card (NowStepper.tsx): each
 * entity with a point or territory showing (in the legend's order: species, cultures, civilizations,
 * cities, events; oldest first within each), then what is in the sky. Layers switched off are left out,
 * as they are off the globe.
 */
export type NowItem =
  | { kind: "entity"; id: string; entity: Entity; features: FeatureProps[] }
  | { kind: "sky"; id: string; sky: SkyEvent };

const cache = new WeakMap<Data, Map<string, NowItem[]>>();

export function nowItems(data: Data, year: number, enabled: Record<Category, boolean>): NowItem[] {
  const key = `${year}|${CATEGORIES.map((c) => (enabled[c] ? 1 : 0)).join("")}`;
  let byKey = cache.get(data);
  if (!byKey) cache.set(data, (byKey = new Map()));
  const hit = byKey.get(key);
  if (hit) return hit;

  const byEntity = new Map<string, FeatureProps[]>();
  for (const f of data.features) {
    if (!enabled[f.category] || !isActive(f, year)) continue;
    const list = byEntity.get(f.entity_id);
    if (list) list.push(f);
    else byEntity.set(f.entity_id, [f]);
  }
  const entities: NowItem[] = [];
  for (const [id, features] of byEntity) {
    const entity = data.entityById.get(id);
    if (entity) entities.push({ kind: "entity", id, entity, features: navOrder(features, data.bboxOf) });
  }
  const rank = (c: Category) => CATEGORIES.indexOf(c);
  entities.sort((a, b) => {
    if (a.kind !== "entity" || b.kind !== "entity") return 0;
    return rank(a.entity.category) - rank(b.entity.category) || a.entity.start_year - b.entity.start_year || a.entity.name.localeCompare(b.entity.name);
  });
  const sky: NowItem[] = SKY_EVENTS.filter((e) => skyShownAt(e, year)).map((e) => ({ kind: "sky", id: e.id, sky: e }));
  const items = [...entities, ...sky];
  if (byKey.size > 50) byKey.clear();
  byKey.set(key, items);
  return items;
}

/** Where the open card (an entity's or a sky object's) is in the list: -1 when neither is (or a group's card is open). */
export function nowIndex(
  items: NowItem[],
  s: { selectedId: string | null; hits: FeatureProps[]; groupId: string | null },
  skyId: string | null,
): number {
  const f = s.selectedId ? s.hits.find((h) => h.id === s.selectedId) : undefined;
  if (f) return items.findIndex((i) => i.kind === "entity" && i.id === f.entity_id);
  if (s.groupId || !skyId) return -1;
  return items.findIndex((i) => i.kind === "sky" && i.id === skyId);
}
