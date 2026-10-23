import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildInputProblems, dirStore, pull, push, RAW_SOURCES, readLock, status, writeLock } from "./raw-store.ts";

const temp = () => mkdtempSync(join(tmpdir(), "raw-"));
const xronos = RAW_SOURCES.find((s) => s.id === "xronos")!;
const road = RAW_SOURCES.find((s) => s.id === "road")!;

function machine(files: Record<string, string>) {
  const root = temp();
  mkdirSync(join(root, "data"), { recursive: true });
  for (const [p, content] of Object.entries(files)) {
    mkdirSync(join(root, p, ".."), { recursive: true });
    writeFileSync(join(root, p), content);
  }
  return root;
}

describe("raw store", () => {
  it("pushes from one machine and pulls onto another", () => {
    const store = dirStore(temp());
    const a = machine({ "data/raw/road/localities.csv": "id\n1\n", "data/raw/road/dates.csv": "d\n" });
    const lock = { road: push(road, store, { root: a, log: () => {} }) };
    expect(lock.road.files.map((f) => f.path)).toEqual(["data/raw/road/dates.csv", "data/raw/road/localities.csv"]);
    expect(lock.road.files[0].key).toMatch(/^raw\/road\/[0-9a-f]{16}\/dates\.csv$/);
    writeLock(lock, a);

    const b = machine({});
    writeLock(readLock(a), b);
    expect(status(road, readLock(b), b).files.map((f) => f.state)).toEqual(["missing", "missing"]);
    expect(pull(status(road, readLock(b), b), store, { root: b, log: () => {} }).fetched).toBe(2);
    expect(readFileSync(join(b, "data/raw/road/localities.csv"), "utf8")).toBe("id\n1\n");
    expect(status(road, readLock(b), b).files.every((f) => f.state === "match")).toBe(true);
  });

  it("stores the same file once and leaves differing local files alone unless forced", () => {
    const store = dirStore(temp());
    const a = machine({ "data/raw/xronos/data.csv": "old\n" });
    const entry = push(xronos, store, { root: a, log: () => {} });
    const logged: string[] = [];
    push(xronos, store, { root: a, log: (s) => logged.push(s) });
    expect(logged[0]).toMatch(/already stored/);

    const b = machine({ "data/raw/xronos/data.csv": "new\n" });
    const st = status(xronos, { xronos: entry }, b);
    expect(st.files[0].state).toBe("differs");
    expect(pull(st, store, { root: b, log: () => {} })).toEqual({ fetched: 0, kept: ["data/raw/xronos/data.csv"] });
    pull(st, store, { root: b, force: true, log: () => {} });
    expect(readFileSync(join(b, "data/raw/xronos/data.csv"), "utf8")).toBe("old\n");
  });

  it("refuses a download that does not match the lock", () => {
    const storeDir = temp();
    const store = dirStore(storeDir);
    const a = machine({ "data/raw/xronos/data.csv": "good\n" });
    const entry = push(xronos, store, { root: a, log: () => {} });
    writeFileSync(join(storeDir, entry.files[0].key), "tampered\n");
    const b = machine({});
    expect(() => pull(status(xronos, { xronos: entry }, b), store, { root: b, log: () => {} })).toThrow(/does not match/);
  });

  it("flags build inputs that are missing, different or not locked", () => {
    const store = dirStore(temp());
    const a = machine({ "data/raw/xronos/data.csv": "x\n", "data/raw/wikidata/descriptions.json": "{}" });
    writeLock({ xronos: push(xronos, store, { root: a, log: () => {} }) }, a);
    expect(buildInputProblems(a)).toEqual({ errors: [], warnings: [expect.stringMatching(/descriptions\.json is not in/)] });
    writeFileSync(join(a, "data/raw/xronos/data.csv"), "y\n");
    expect(buildInputProblems(a).errors).toEqual(["data/raw/xronos/data.csv is not the locked version"]);
  });
});
