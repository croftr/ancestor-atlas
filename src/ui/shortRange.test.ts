import { describe, expect, it } from "vitest";
import { shortRange } from "./InfoPanel";

describe("shortRange", () => {
  it("says the unit once", () => {
    expect(shortRange(1 - 2_300_000, 1 - 1_400_000)).toBe("c. 2.3–1.4 million years ago");
    expect(shortRange(1 - 3100, 1 - 2686)).toBe("3,100 – 2,686 BCE");
    expect(shortRange(100, 476)).toBe("100 – 476 CE");
  });
  it("keeps mixed ranges whole", () => {
    expect(shortRange(1 - 1_200_000, 1 - 300_000)).toBe("c. 1.2 million years ago – 300,000 BCE");
    expect(shortRange(1 - 27, 476)).toBe("27 BCE – 476 CE");
  });
});
