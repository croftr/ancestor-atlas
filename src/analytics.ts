import { useEffect } from "react";
import { useHash } from "./route";

type EventData = Record<string, string | number | boolean>;

interface UmamiPayload {
  website: string;
  hostname: string;
  screen: string;
  language: string;
  title: string;
  url: string;
  referrer: string;
}

interface Umami {
  track: {
    (eventName: string, eventData?: EventData): void;
    (mapper: (props: UmamiPayload) => UmamiPayload): void;
  };
}

declare global {
  interface Window {
    umami?: Umami;
  }
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

const pending: Array<() => void> = [];
let listeningForLoad = false;

function runOrQueue(fn: () => void) {
  if (typeof window === "undefined") return;
  if (window.umami) {
    fn();
    return;
  }
  pending.push(fn);
  if (listeningForLoad) return;
  listeningForLoad = true;
  const script = document.querySelector<HTMLScriptElement>('script[data-website-id]');
  const flush = () => {
    if (!window.umami) return;
    while (pending.length) pending.shift()?.();
  };
  script?.addEventListener("load", flush, { once: true });
  // Fallback if the script finished loading before the listener attached.
  window.addEventListener("load", flush, { once: true });
}

let lastTrackedPath: string | null = null;

/** Send a virtual pageview to Umami for the current hash route (deduplicated). */
export function trackPageView(hash = typeof window !== "undefined" ? window.location.hash : "") {
  const url = hashToPath(hash);
  if (url === lastTrackedPath) return;
  lastTrackedPath = url;
  runOrQueue(() => {
    window.umami?.track((props) => ({ ...props, url, title: document.title }));
  });
}

/** Send a custom event (e.g. tour_start, tour_complete, narration_play) to Umami. */
export function trackEvent(name: string, data?: EventData) {
  runOrQueue(() => {
    window.umami?.track(name, data);
  });
}

/** Reset internal deduplication state (for unit tests). */
export function _resetAnalyticsForTest() {
  lastTrackedPath = null;
  pending.length = 0;
  listeningForLoad = false;
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
