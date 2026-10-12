import { describe, expect, it } from "vitest";
import { firstSentence } from "./layout";

describe("firstSentence", () => {
  it("stops at the first sentence end", () => expect(firstSentence("One. Two.")).toBe("One."));
  it("skips circa and similar abbreviations", () =>
    expect(firstSentence("Mesolithic culture of northern Europe, c. 9000 to 6000 BCE. Named after a bog.")).toBe(
      "Mesolithic culture of northern Europe, c. 9000 to 6000 BCE.",
    ));
  it("skips initials in species names", () =>
    expect(firstSentence("Often regarded as ancestral to A. afarensis. Known from Kenya.")).toBe("Often regarded as ancestral to A. afarensis."));
  it("returns the whole text without a sentence end", () => expect(firstSentence("No full stop")).toBe("No full stop"));
});
