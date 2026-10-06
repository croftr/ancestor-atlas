import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fingerprint, FINGERPRINT_INPUTS } from "./fingerprint.ts";

function tree(content: string) {
  const root = mkdtempSync(join(tmpdir(), "fp-"));
  for (const p of FINGERPRINT_INPUTS) {
    const isFile = p.endsWith(".ts");
    const dir = join(root, isFile ? p.split("/").slice(0, -1).join("/") : p);
    mkdirSync(dir, { recursive: true });
    writeFileSync(isFile ? join(root, p) : join(dir, "a.txt"), content);
  }
  return root;
}

describe("fingerprint", () => {
  it("ignores line endings", () => expect(fingerprint(tree("a\nb\n")).hash).toBe(fingerprint(tree("a\r\nb\r\n")).hash));
  it("changes when content changes", () => expect(fingerprint(tree("a\n")).hash).not.toBe(fingerprint(tree("b\n")).hash));
});
