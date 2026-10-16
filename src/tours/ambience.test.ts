import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AMBIENCE } from "./ambience";
import { textHash } from "../../scripts/lib/text-hash";
import type { Entity } from "../types";

const entities: Entity[] = JSON.parse(readFileSync("public/data/entities.json", "utf8"));
const byId = new Map(entities.map((e) => [e.id, e]));
const FOLDER: Record<string, string> = { event: "events", species: "species", culture: "cultures", civilization: "civilizations" };

describe.each(Object.entries(AMBIENCE))("ambience %s", (id, entry) => {
  it("belongs to an entity", () => {
    expect(byId.has(id)).toBe(true);
  });

  it("has a prompt", () => {
    expect(entry.prompt.length).toBeGreaterThan(20);
  });

  it("names its sound by the bucket convention, with a credit", () => {
    if (!entry.sound) return;
    expect(entry.sound.src).toMatch(new RegExp(`^ambience/${FOLDER[byId.get(id)!.category]}/${id}-v\\d+\\.mp3$`));
    expect(entry.sound.credit).toBeTruthy();
    // An edited prompt leaves the sound behind (npm run audio:ambience makes it again).
    if (entry.sound.prompt_hash !== textHash(entry.prompt)) console.warn(`ambience ${id}: the sound no longer matches its prompt`);
  });
});
