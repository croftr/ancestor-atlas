import { beforeEach, describe, expect, it, vi } from "vitest";
import { _flushAnalyticsForTest, _resetAnalyticsForTest, hashToPath, trackEvent, trackPageView } from "./analytics";

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
  let store: Map<string, string>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    _resetAnalyticsForTest();
    store = new Map();
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ cache: "tok-123" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      location: { hostname: "ancestoratlas.org", origin: "https://ancestoratlas.org", hash: "" },
      screen: { width: 1440, height: 900 },
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
      },
    });
    vi.stubGlobal("navigator", { language: "en-GB" });
    vi.stubGlobal("document", { title: "Ancestor Atlas", referrer: "https://www.google.com/" });
  });

  it("deduplicates consecutive identical page views and persists x-umami-cache", async () => {
    trackPageView("#/?year=-1000");
    trackPageView("#/?year=-500");
    trackPageView("#/tours");
    await _flushAnalyticsForTest();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(store.get("umami.cache")).toBe("tok-123");
    // Second request carries the cached token from the first response
    expect(fetchMock.mock.calls[1][1].headers["x-umami-cache"]).toBe("tok-123");
  });

  it("reuses persisted x-umami-cache across refreshes", async () => {
    store.set("umami.cache", "existing-tok");
    trackEvent("tour_start", { tour: "human-evolution", title: "Human evolution" });
    await _flushAnalyticsForTest();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/a/api/send");
    expect(init.headers["x-umami-cache"]).toBe("existing-tok");
    const body = JSON.parse(init.body);
    expect(body.payload.name).toBe("tour_start");
    expect(body.payload.data).toEqual({ tour: "human-evolution", title: "Human evolution" });
  });

  it("does not send events on localhost", async () => {
    window.location.hostname = "localhost";
    trackPageView("#/tours");
    await _flushAnalyticsForTest();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
