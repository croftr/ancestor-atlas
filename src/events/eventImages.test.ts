import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Entity } from "../types";
import { smallEventImage } from "./EventImage";

const entities: Entity[] = JSON.parse(readFileSync("public/data/entities.json", "utf8"));

describe("event pictures", () => {
  it("every title card has its 500 px copy for the Events page tiles", () => {
    const missing = entities
      .filter((e) => e.category === "event" && e.image_url)
      .map((e) => smallEventImage(e.image_url!))
      .filter((url): url is string => !!url && !existsSync(`public${url}`));
    // Make one: ffmpeg -i x.webp -vf "scale=500:500:flags=lanczos" -c:v libwebp -quality 82 x-500.webp
    expect(missing).toEqual([]);
  });
});
