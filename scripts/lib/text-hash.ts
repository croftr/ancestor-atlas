import { createHash } from "node:crypto";

/** Short fingerprint of a text as read aloud: changes when the words do, not with spacing. */
export const textHash = (text: string) =>
  createHash("sha1").update(text.trim().replace(/\s+/g, " ")).digest("hex").slice(0, 10);

/** Bucket folder for each category's narration: narration/<folder>/<id>-v<n>.mp3. */
export const NARRATION_FOLDER = { event: "events", species: "species", culture: "cultures", civilization: "civilizations" } as const;
