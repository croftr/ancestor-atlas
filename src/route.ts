import { useEffect, useState } from "react";

/**
 * Views, switched by the URL hash so a refresh or a shared link keeps the view without any
 * server rewrites: "" (or "#/") is the globe, "#/timeline" the timeline, and "#/events",
 * "#/species", "#/cultures" and "#/civilizations" the browse pages, with "#/<page>/<id>" one entry open on it.
 */
export type View = "globe" | "timeline" | BrowseView;
/** Pages that list one category and open an entry in a detail view. */
export type BrowseView = "events" | "species" | "cultures" | "civilizations";
const BROWSE_VIEWS: BrowseView[] = ["events", "species", "cultures", "civilizations"];
export const isBrowseView = (v: View): v is BrowseView => (BROWSE_VIEWS as View[]).includes(v);

const pathOf = (hash: string) => hash.replace(/^#\/?/, "");

const viewOfHash = (hash: string): View => {
  const page = pathOf(hash).split(/[/?#]/)[0];
  if (page === "timeline") return "timeline";
  if ((BROWSE_VIEWS as string[]).includes(page)) return page as BrowseView;
  return "globe";
};

/** The entry open on a browse page ("#/<page>/<id>"), if any. */
const itemOfHash = (hash: string): string | null => {
  if (!isBrowseView(viewOfHash(hash))) return null;
  const m = pathOf(hash).match(/^[^/]+\/([^/?#]+)/);
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
/** The entry open on the current browse page, if any. */
export const useOpenItem = (): string | null => itemOfHash(useHash());
export const useOpenEvent = (): string | null => {
  const hash = useHash();
  return viewOfHash(hash) === "events" ? itemOfHash(hash) : null;
};

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

/** Switch view. For the timeline, `entityId` is zoomed to; on a browse page, that entry is opened. */
export function navigate(view: View, entityId?: string) {
  if (isBrowseView(view)) {
    window.location.hash = entityId ? `#/${view}/${encodeURIComponent(entityId)}` : `#/${view}`;
    return;
  }
  if (entityId) pendingFocus = entityId;
  if (view === "timeline" && entityId) pendingShrunkCard = true;
  window.location.hash = view === "timeline" ? "#/timeline" : "#/";
}
