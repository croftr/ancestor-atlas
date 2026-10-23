import { describe, expect, it } from "vitest";
import type { LogEntry, LogSite } from "./types";
import { describeChange, entryChips, formatDay, groupByEntity } from "./updates";

const entry = (o: Partial<LogEntry> = {}): LogEntry => ({
  id: "2026-10-23", date: "2026-10-23", sources: [], added: {}, removed: {}, changed: 0, entitiesAdded: 0, genomesAdded: 0, genomesRemoved: 0, held: 0, ...o,
});
const site = (id: string, entity_id: string, label?: string): LogSite => ({ id, entity_id, entity: entity_id.toUpperCase(), category: "culture", source_id: "xronos", ...(label && { label }) });

describe("data updates page", () => {
  it("sums an entry up in chips, added first", () => {
    const chips = entryChips(entry({ added: { culture: 37, species: 1 }, removed: { culture: 2 }, changed: 5, held: 10, genomesAdded: 1200 }));
    expect(chips.map((c) => c.text)).toEqual(["+1 fossil site", "+37 culture sites", "+1,200 ancient genomes", "−2 culture sites", "5 changed", "10 held back"]);
    expect(entryChips(entry())).toEqual([]);
  });
  it("groups sites by entity, biggest group first, sites by name", () => {
    const groups = groupByEntity([site("a@x:2", "a", "Zug"), site("b@x:1", "b"), site("a@x:1", "a", "Arbon")]);
    expect(groups.map((g) => [g.entity_id, g.sites.map((s) => s.label ?? s.id)])).toEqual([["a", ["Arbon", "Zug"]], ["b", ["b@x:1"]]]);
  });
  it("says what changed in words", () => {
    expect(describeChange(["merged", "dates"], "El Castillo")).toBe("merged with El Castillo, new dates");
    expect(describeChange(["name"], "Old name")).toBe("was Old name");
    expect(describeChange(["place"])).toBe("moved");
  });
  it("reads an entry's date as a calendar day", () => expect(formatDay("2026-10-03")).toBe("3 October 2026"));
});
