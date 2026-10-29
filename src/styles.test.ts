import { globSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const posix = (f: string) => f.replace(/\\/g, "/");

describe("stylesheets", () => {
  const files = globSync("src/**/*.{ts,tsx}").map(posix);
  const listed = [...readFileSync("src/styles.ts", "utf8").matchAll(/^import "\.\/([^"]+)";/gm)].map((m) => `src/${m[1]}`);

  it("are imported only from styles.ts, so their order is the cascade's", () => {
    const strays = files.filter((f) => f !== "src/styles.ts" && /^import "[^"]+\.css";/m.test(readFileSync(f, "utf8")));
    expect(strays).toEqual([]);
  });
  it("are all listed, with the small-screen layout last", () => {
    expect([...listed].sort()).toEqual(globSync("src/**/*.css").map(posix).sort());
    expect(listed.at(-1)).toBe("src/ui/stacked.css");
  });
});
