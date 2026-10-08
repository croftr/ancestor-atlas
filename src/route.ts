import { useEffect, useState } from "react";

/**
 * Views, switched by the URL hash so a refresh or a shared link keeps the view without any
 * server rewrites: "" (or "#/") is the globe, "#/timeline" the timeline, "#/events" the events
 * page and "#/events/<id>" one event open on it.
 */
export type View = "globe" | "timeline" | "events";

const pathOf = (hash: string) => hash.replace(/^#\/?/, "");

const viewOfHash = (hash: string): View => {
  const p = pathOf(hash);
  if (p.startsWith("timeline")) return "timeline";
  if (p.startsWith("events")) return "events";
  return "globe";
};

/** The event open on the events page ("#/events/<id>"), if any. */
const eventOfHash = (hash: string): string | null => {
  const m = pathOf(hash).match(/^events\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
};

function useHash(): string {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return hash;
}

export const useView = (): View => viewOfHash(useHash());
export const useOpenEvent = (): string | null => eventOfHash(useHash());

/** Entity the timeline should zoom to when it next opens ("See on timeline" from the info card). */
let pendingFocus: string | null = null;
export const takePendingFocus = () => {
  const id = pendingFocus;
  pendingFocus = null;
  return id;
};

/**
 * Set by "See on timeline": the timeline's info card opens shrunk (on small screens, a thumbnail
 * over the chart), so you land on the timeline itself rather than a full-screen card.
 */
let pendingShrunkCard = false;
/** Read in the card's initial state (which StrictMode may run twice); cleared after mounting. */
export const peekShrunkCard = () => pendingShrunkCard;
export const clearShrunkCard = () => {
  pendingShrunkCard = false;
};

/** Switch view. For the timeline, `entityId` is zoomed to; for events, that event is opened. */
export function navigate(view: View, entityId?: string) {
  if (view === "events") {
    window.location.hash = entityId ? `#/events/${encodeURIComponent(entityId)}` : "#/events";
    return;
  }
  if (entityId) pendingFocus = entityId;
  if (view === "timeline" && entityId) pendingShrunkCard = true;
  window.location.hash = view === "timeline" ? "#/timeline" : "#/";
}
