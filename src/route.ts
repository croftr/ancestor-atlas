import { useEffect, useState } from "react";

/**
 * Two views, switched by the URL hash so a refresh or a shared link keeps the view without any
 * server rewrites: "" (or "#/") is the globe, "#/timeline" the timeline.
 */
export type View = "globe" | "timeline";

const viewOfHash = (hash: string): View => (hash.replace(/^#\/?/, "").startsWith("timeline") ? "timeline" : "globe");

export function useView(): View {
  const [view, setView] = useState<View>(() => viewOfHash(window.location.hash));
  useEffect(() => {
    const onHash = () => setView(viewOfHash(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return view;
}

/** Entity the timeline should zoom to when it next opens ("See on timeline" from the info card). */
let pendingFocus: string | null = null;
export const takePendingFocus = () => {
  const id = pendingFocus;
  pendingFocus = null;
  return id;
};

export function navigate(view: View, focusEntityId?: string) {
  if (focusEntityId) pendingFocus = focusEntityId;
  window.location.hash = view === "timeline" ? "#/timeline" : "#/";
}
