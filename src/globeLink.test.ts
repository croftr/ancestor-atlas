import { describe, expect, it } from "vitest";
import { globeHash, readGlobeHash } from "./globeLink";

describe("globe links", () => {
  it("writes the year and the selected site", () => {
    expect(globeHash({ year: -4099, selectedId: "site-1", groupId: null })).toBe("#/?year=-4099&site=site-1");
  });

  it("writes a group when no site is selected", () => {
    expect(globeHash({ year: 1, selectedId: null, groupId: "ancient-egypt" })).toBe("#/?year=1&group=ancient-egypt");
  });

  it("reads back what it writes", () => {
    const hash = globeHash({ year: -1_799_999, selectedId: "a b/c", groupId: null });
    expect(readGlobeHash(hash)).toEqual({ year: -1_799_999, site: "a b/c", group: undefined });
  });

  it("ignores other pages and plain globe links", () => {
    expect(readGlobeHash("#/timeline")).toBeNull();
    expect(readGlobeHash("#/events/fire")).toBeNull();
    expect(readGlobeHash("")).toBeNull();
    expect(readGlobeHash("#/")).toBeNull();
  });

  it("drops a year that isn't a number", () => {
    expect(readGlobeHash("#/?year=soon&site=x")?.year).toBeUndefined();
  });
});
