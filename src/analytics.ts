import { useEffect } from "react";
import { useHash } from "./route";

const WEBSITE_ID = "3c0a7573-e048-4cc0-ad2d-fdbd4c6314e4";
const ENDPOINT = "/a/api/send";
const ALLOWED_HOST = "ancestoratlas.org";
const CACHE_KEY = "umami.cache";

type EventData = Record<string, string | number | boolean>;

interface UmamiPayload {
  website: string;
  hostname: string;
  screen: string;
  language: string;
  title: string;
  url: string;
  referrer: string;
  name?: string;
  data?: EventData;
}

/**
 * Turn the SPA's hash route into a clean path for analytics:
 *   "" | "#/" | "#/?year=-4099&site=..." -> "/"
 *   "#/timeline"                         -> "/timeline"
 *   "#/species/neanderthal"              -> "/species/neanderthal"
 *   "#/tour/human-evolution"             -> "/tour/human-evolution"
 */
export function hashToPath(hash: string): string {
  const clean = hash.replace(/^#\/?/, "").split(/[?#]/)[0].replace(/\/+$/, "");
  if (!clean) return "/";
  try {
    return "/" + clean.split("/").map(decodeURIComponent).join("/");
  } catch {
    return "/" + clean;
  }
}

let disabled = false;
let cache: string | undefined;
let lastTrackedPath: string | null = null;
let referrer: string | null = null;
let sendChain: Promise<void> = Promise.resolve();

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private browsing or storage blocked — fall back to in-memory cache only.
  }
}

function isEnabled(): boolean {
  if (disabled || typeof window === "undefined") return false;
  if (window.location.hostname !== ALLOWED_HOST) return false;
  if (readStorage("umami.disabled")) return false;
  return true;
}

function initialReferrer(): string {
  const ref = document.referrer || "";
  const origin = window.location.origin;
  if (ref === origin || ref.startsWith(`${origin}/`)) return ref.slice(origin.length) || "/";
  return ref;
}

function buildPayload(url: string, name?: string, data?: EventData): UmamiPayload {
  const payload: UmamiPayload = {
    website: WEBSITE_ID,
    hostname: window.location.hostname,
    screen: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language,
    title: document.title,
    url,
    referrer: referrer ?? initialReferrer(),
  };
  if (name) payload.name = name;
  if (data) payload.data = data;
  return payload;
}

function send(payload: UmamiPayload) {
  // Chain requests so the first request's returned x-umami-cache token is persisted before
  // any subsequent event fires, keeping all activity on the same unique visitor.
  sendChain = sendChain.then(async () => {
    if (!isEnabled()) return;
    if (cache === undefined) {
      cache = readStorage(CACHE_KEY) ?? undefined;
    }
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-umami-website-id": WEBSITE_ID,
      "x-umami-hostname": payload.hostname,
    };
    if (cache) headers["x-umami-cache"] = cache;
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        keepalive: true,
        credentials: "omit",
        headers,
        body: JSON.stringify({ type: "event", payload }),
      });
      if (!res.ok) return;
      const json = (await res.json()) as { cache?: string; disabled?: boolean };
      if (json.disabled) disabled = true;
      if (json.cache) {
        cache = json.cache;
        writeStorage(CACHE_KEY, json.cache);
      }
    } catch {
      // Ignore network errors — analytics must never disrupt the app.
    }
  });
}

/** Send a virtual pageview to Umami for the current hash route (deduplicated). */
export function trackPageView(hash = typeof window !== "undefined" ? window.location.hash : "") {
  if (!isEnabled()) return;
  const url = hashToPath(hash);
  if (url === lastTrackedPath) return;
  const payload = buildPayload(url);
  referrer = url;
  lastTrackedPath = url;
  send(payload);
}

/** Send a custom event (e.g. tour_start, tour_complete, narration_play) to Umami. */
export function trackEvent(name: string, data?: EventData) {
  if (!isEnabled()) return;
  const url = lastTrackedPath ?? hashToPath(window.location.hash);
  send(buildPayload(url, name, data));
}

/** Wait for any queued analytics requests (for unit tests). */
export function _flushAnalyticsForTest() {
  return sendChain;
}

/** Reset internal state (for unit tests). */
export function _resetAnalyticsForTest() {
  disabled = false;
  cache = undefined;
  lastTrackedPath = null;
  referrer = null;
  sendChain = Promise.resolve();
}

/** Track initial load and every hash-based page change in the SPA. */
export function useAnalytics() {
  const hash = useHash();
  useEffect(() => {
    // Wait a microtask so usePageTitle() has updated document.title first.
    const id = window.setTimeout(() => trackPageView(hash), 0);
    return () => window.clearTimeout(id);
  }, [hash]);
}
