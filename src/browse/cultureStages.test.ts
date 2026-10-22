import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CULTURE_STAGES } from "./cultureStages";

// The committed data the app loads.
const entities = JSON.parse(readFileSync("public/data/entities.json", "utf8")) as { id: string; category: string }[];
const cultures = entities.filter((e) => e.category === "culture").map((e) => e.id);

describe("CULTURE_STAGES", () => {
  it("places every culture exactly once, and only cultures", () => {
    const members = CULTURE_STAGES.flatMap((s) => s.members);
    expect(new Set(members).size).toBe(members.length);
    expect([...members].sort()).toEqual([...cultures].sort());
  });

  it("has unique ids and existing banner pictures (both sizes)", () => {
    expect(new Set(CULTURE_STAGES.map((s) => s.id)).size).toBe(CULTURE_STAGES.length);
    for (const s of CULTURE_STAGES) {
      if (!s.picture) continue;
      expect(existsSync(`public${s.picture.url}`), s.picture.url).toBe(true);
      expect(existsSync(`public${s.picture.url.replace(/\.webp$/, "-600.webp")}`), s.picture.url).toBe(true);
    }
  });
});
