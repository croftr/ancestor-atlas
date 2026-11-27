import { beforeEach, describe, expect, it, vi } from "vitest";
import { _resetAnalyticsForTest, hashToPath, trackEvent, trackPageView } from "./analytics";

describe("hashToPath", () => {
  it("normalizes globe hashes and query params to /", () => {
    expect(hashToPath("")).toBe("/");
    expect(hashToPath("#")).toBe("/");
    expect(hashToPath("#/")).toBe("/");
    expect(hashToPath("#/?year=-4099&site=uruk")).toBe("/");
    expect(hashToPath("#/?year=-1799999&group=homo-erectus")).toBe("/");
  });

  it("normalizes views, browse items, and tours", () => {
    expect(hashToPath("#/timeline")).toBe("/timeline");
    expect(hashToPath("#/tours/")).toBe("/tours");
    expect(hashToPath("#/species/neanderthal")).toBe("/species/neanderthal");
    expect(hashToPath("#/tour/human-evolution")).toBe("/tour/human-evolution");
    expect(hashToPath("#/cities/gobekli%20tepe")).toBe("/cities/gobekli tepe");
  });
});

describe("Umami tracking", () => {
  beforeEach(() => {
    _resetAnalyticsForTest();
    vi.stubGlobal("window", {
      location: { hash: "" },
      umami: { track: vi.fn() },
      addEventListener: vi.fn(),
    });
    vi.stubGlobal("document", { title: "Ancestor Atlas", querySelector: vi.fn() });
  });

  it("deduplicates consecutive identical page views", () => {
    trackPageView("#/?year=-1000");
    trackPageView("#/?year=-500");
    trackPageView("#/tours");
    expect(window.umami?.track).toHaveBeenCalledTimes(2);
  });

  it("forwards custom events with properties", () => {
    trackEvent("tour_start", { tour: "human-evolution", title: "Human evolution" });
    expect(window.umami?.track).toHaveBeenCalledWith("tour_start", {
      tour: "human-evolution",
      title: "Human evolution",
    });
  });
});
