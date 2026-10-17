import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cladesOf, layoutTree, leavesOf, PHYLOGENY, REFS } from "./phylogeny";

// The committed data the app loads.
const entities = JSON.parse(readFileSync("public/data/entities.json", "utf8")) as {
  id: string;
  category: string;
  start_year: number;
  group?: boolean;
}[];
const species = entities.filter((e) => e.category === "species" && !e.group);
const startOf = new Map(species.map((s) => [s.id, s.start_year]));

describe("PHYLOGENY", () => {
  it("places every species exactly once, and only species", () => {
    const leaves = leavesOf();
    expect(new Set(leaves).size).toBe(leaves.length);
    expect([...leaves].sort()).toEqual(species.map((s) => s.id).sort());
  });

  it("has unique clade ids, two or more children each, and known references", () => {
    const clades = cladesOf();
    expect(new Set(clades.map((c) => c.id)).size).toBe(clades.length);
    for (const c of clades) {
      expect(c.children.length, c.id).toBeGreaterThanOrEqual(2);
      expect(c.refs.length, c.id).toBeGreaterThan(0);
      for (const r of c.refs) expect(REFS[r], `${c.id}: ${r}`).toBeDefined();
    }
  });
});

describe("layoutTree", () => {
  const { rows, nodes } = layoutTree((id) => startOf.get(id)!);

  it("gives every species one row, the oldest at the top and us near the bottom", () => {
    expect(rows.map((r) => r.row)).toEqual(rows.map((_, i) => i));
    expect(rows[0].id).toBe("sahelanthropus");
    expect(rows.findIndex((r) => r.id === "homo-sapiens")).toBeGreaterThan(rows.length - 4);
  });

  it("puts each branching point between its children, no later than its oldest member", () => {
    for (const n of nodes) {
      const childRows = n.children.map((c) => c.row);
      expect(n.row).toBeGreaterThanOrEqual(Math.min(...childRows));
      expect(n.row).toBeLessThanOrEqual(Math.max(...childRows));
      expect(n.year).toBe(Math.min(...leavesOf(n.clade).map((id) => startOf.get(id)!)));
    }
    expect(nodes[0].clade).toBe(PHYLOGENY);
  });
});
