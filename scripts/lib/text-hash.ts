import { createHash } from "node:crypto";

/** Short fingerprint of a text as read aloud: changes when the words do, not with spacing. */
export const textHash = (text: string) =>
  createHash("sha1").update(text.trim().replace(/\s+/g, " ")).digest("hex").slice(0, 10);
