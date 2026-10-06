import { describe, expect, it } from "vitest";
import { labNumbers, refLink } from "./refs";

describe("refLink", () => {
  it("links Wikidata items", () =>
    expect(refLink("wikidata:Q217043#P625")).toEqual({ label: "Wikidata Q217043", href: "https://www.wikidata.org/wiki/Q217043" }));
  it("links the exact Wikipedia revision, any language", () => {
    expect(refLink("wikipedia:Dmanisi_hominins@1378502810")).toEqual({
      label: "Wikipedia: Dmanisi hominins",
      href: "https://en.wikipedia.org/w/index.php?oldid=1378502810",
    });
    expect(refLink("wikipedia:de:Unterkiefer_von_Mauer@264035047")?.href).toBe("https://de.wikipedia.org/w/index.php?oldid=264035047");
    expect(refLink("wikipedia:de:Unterkiefer_von_Mauer@264035047")?.label).toBe("Wikipedia (de): Unterkiefer von Mauer");
  });
  it("links DOIs and XRONOS", () => {
    expect(refLink("doi:10.1038/nature13025")?.href).toBe("https://doi.org/10.1038/nature13025");
    expect(refLink("xronos:IntCal20")?.label).toMatch(/IntCal20/);
  });
  it("handles titles with colons-free parentheses and missing refs", () => {
    expect(refLink("wikipedia:Selam_(Australopithecus)@1354128849")?.label).toBe("Wikipedia: Selam (Australopithecus)");
    expect(refLink(undefined)).toBeUndefined();
  });
});

it("lists XRONOS lab numbers", () => expect(labNumbers("xronos:OxA-1,KN-2,…")).toBe("OxA-1, KN-2, …"));
