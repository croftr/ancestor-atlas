import { describe, expect, it } from "vitest";
import { pageTitleFor } from "./pageTitle";

describe("pageTitleFor", () => {
  it("returns default site name on the globe with nothing selected", () => {
    expect(pageTitleFor({ view: "globe" })).toBe("Ancestor Atlas");
  });

  it("prioritizes active tour title on the globe", () => {
    expect(
      pageTitleFor({
        view: "globe",
        tourTitle: "Out of the steppe",
        selectedEntityName: "Yamnaya culture",
      }),
    ).toBe("Out of the steppe · Ancestor Atlas");
  });

  it("shows selected entity, DNA site, or regional explorer on the globe", () => {
    expect(pageTitleFor({ view: "globe", selectedEntityName: "Homo erectus" })).toBe("Homo erectus · Ancestor Atlas");
    expect(pageTitleFor({ view: "globe", dnaSiteName: "Denisova Cave" })).toBe("Denisova Cave (Ancient DNA) · Ancestor Atlas");
    expect(pageTitleFor({ view: "globe", placeLabel: "32.7°N, 35.0°E" })).toBe(
      "32.7°N, 35.0°E (Regional History) · Ancestor Atlas",
    );
  });

  it("formats timeline titles with or without an open card", () => {
    expect(pageTitleFor({ view: "timeline" })).toBe("Timeline · Ancestor Atlas");
    expect(pageTitleFor({ view: "timeline", selectedEntityName: "Ancient Egypt" })).toBe("Ancient Egypt · Timeline · Ancestor Atlas");
  });

  it("formats browse and tours pages with or without an open detail item", () => {
    expect(pageTitleFor({ view: "tours" })).toBe("Guided Tours · Ancestor Atlas");
    expect(pageTitleFor({ view: "species" })).toBe("Species · Ancestor Atlas");
    expect(pageTitleFor({ view: "species", openItemName: "Homo neanderthalensis" })).toBe(
      "Homo neanderthalensis · Species · Ancestor Atlas",
    );
    expect(pageTitleFor({ view: "events", openItemName: "Control of fire" })).toBe("Control of fire · Events · Ancestor Atlas");
  });
});
