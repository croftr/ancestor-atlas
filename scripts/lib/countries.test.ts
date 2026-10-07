import { describe, expect, it } from "vitest";
import { countryCodes, outsideCountry } from "./countries.ts";

describe("countryCodes", () => {
  it("reads alpha-2 codes, alpha-3 codes, names and regions", () => {
    expect(countryCodes("DE")).toEqual(["DE"]);
    expect(countryCodes("CMR")).toEqual(["CM"]);
    expect(countryCodes("Espagne")).toEqual(["ES"]);
    expect(countryCodes("England/Wales")).toContain("GB");
  });
  it("does not judge labels that are not countries", () => {
    expect(countryCodes("North Sea")).toBeUndefined();
    expect(countryCodes("")).toBeUndefined();
  });
});

describe("outsideCountry", () => {
  it("keeps points inside their country", () => {
    expect(outsideCountry("DE", 51.27, 11.52)).toBe(false); // Nebra
    expect(outsideCountry("England/Wales", 51.18, -1.83)).toBe(false); // Stonehenge
  });
  it("keeps points near a border or on the coast", () => {
    expect(outsideCountry("DE", 47.6, 7.6)).toBe(false); // Basel edge
    expect(outsideCountry("DK", 56.95, 9.3)).toBe(false); // Limfjord shore
  });
  it("accepts former states, disputed areas and overseas territories", () => {
    expect(outsideCountry("SK", 50.08, 14.42)).toBe(false); // Prague coded as Czechoslovak
    expect(outsideCountry("UA", 44.95, 34.1)).toBe(false); // Crimea
    expect(outsideCountry("TC", 21.8, -71.74)).toBe(false); // Turks and Caicos
  });
  it("flags points that lie clearly in another country", () => {
    expect(outsideCountry("DE", 51.7667, 4.1497)).toBe(true); // Baalberge with a shifted longitude, in the Netherlands
    expect(outsideCountry("DE", 51.3, 29.25)).toBe(true); // Nebra with a shifted longitude, in Ukraine
  });
  it("does not judge points with every probe at sea", () => expect(outsideCountry("GB", 49.5, -12)).toBe(false));
});
