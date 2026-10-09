import { useEffect } from "react";
import { useStore } from "./store";
import { getData, isActive, loadData } from "./map/data";
import { sliderYearFor } from "./search/search";
import { snapYear } from "./time/scale";
import type { View } from "./route";

/**
 * Links to a moment on the globe: "#/?year=-4099&site=<feature id>" (or "&group=<entity id>" for
 * a group such as Ancient Egypt). The address bar keeps up as you explore, so copying it, or the
 * card's Share button, gives a link that opens on the same year and card.
 */
interface GlobeLink {
  year?: number;
  site?: string;
  group?: string;
}

export function globeHash(s: { year: number; selectedId: string | null; groupId: string | null }): string {
  const p = new URLSearchParams({ year: String(s.year) });
  if (s.selectedId) p.set("site", s.selectedId);
  else if (s.groupId) p.set("group", s.groupId);
  return `#/?${p}`;
}

export function readGlobeHash(hash: string): GlobeLink | null {
  const m = hash.match(/^#\/?\?(.*)$/);
  if (!m) return null;
  const p = new URLSearchParams(m[1]);
  const year = Number(p.get("year"));
  return {
    year: p.has("year") && Number.isFinite(year) ? year : undefined,
    site: p.get("site") ?? undefined,
    group: p.get("group") ?? undefined,
  };
}

/** The full URL of the globe as it is now (for sharing). */
export const globeUrl = () => {
  const { origin, pathname } = window.location;
  return origin + pathname + globeHash(useStore.getState());
};

/** Open the link the page was loaded with, then keep the address bar in step with the globe. */
export function useGlobeLink(view: View) {
  useEffect(() => {
    const link = readGlobeHash(window.location.hash);
    if (!link) return;
    loadData().then((d) => {
      if (!d) return;
      const s = useStore.getState();
      const site = link.site ? d.features.find((f) => f.id === link.site) : undefined;
      if (site) {
        const year = link.year !== undefined && isActive(site, snapYear(link.year)) ? snapYear(link.year) : sliderYearFor(site);
        const bbox = getData()?.bboxOf.get(site.id);
        useStore.setState({
          year,
          enabled: { ...s.enabled, [site.category]: true },
          selectedId: site.id,
          hits: [site],
          groupId: null,
          flyTo: bbox ? { bbox } : s.flyTo,
        });
      } else if (link.group && d.entityById.has(link.group)) {
        s.focusEntity(link.group);
      } else if (link.year !== undefined) {
        s.setYear(link.year);
      }
    });
  }, []);

  useEffect(() => {
    if (view !== "globe") return;
    let timer = 0;
    // Replace (not push) so moving the slider doesn't fill the back button's history; wait for
    // a pause in playback.
    const write = () => {
      const s = useStore.getState();
      if (s.playing) return;
      const hash = globeHash(s);
      if (hash !== window.location.hash) history.replaceState(null, "", hash);
    };
    const unsubscribe = useStore.subscribe((s, prev) => {
      if (s.year !== prev.year || s.selectedId !== prev.selectedId || s.groupId !== prev.groupId || s.playing !== prev.playing) {
        window.clearTimeout(timer);
        timer = window.setTimeout(write, 400);
      }
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, [view]);
}
