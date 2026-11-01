import { useEffect } from "react";
import { useData } from "../map/data";
import { useSkyOpen } from "../sky/skyOpen";
import { useStore } from "../store";
import { formatYear } from "../time/scale";
import { nowIndex, nowItems } from "./now";

/**
 * "‹ 4 of 37 at this time ›": steps through everything on the globe at the slider's year, sky objects
 * included (now/now.ts, store `stepNow`), from the top of the card (ui/InfoPanel.tsx) or of a sky object's
 * panel (sky/SkyObjects.tsx). The slider stays where it is. Hidden in a tour, which owns the card, and when
 * only one thing is showing. Keys: , and . (useNowKeys).
 */
export default function NowStepper() {
  const data = useData();
  const year = useStore((s) => s.year);
  const enabled = useStore((s) => s.enabled);
  const selectedId = useStore((s) => s.selectedId);
  const hits = useStore((s) => s.hits);
  const groupId = useStore((s) => s.groupId);
  const touring = useStore((s) => s.tour !== null);
  const stepNow = useStore((s) => s.stepNow);
  const skyOpen = useSkyOpen((s) => s.open);
  if (!data || touring) return null;
  const items = nowItems(data, year, enabled);
  if (items.length < 2) return null;
  const i = nowIndex(items, { selectedId, hits, groupId }, skyOpen);
  const when = formatYear(year);
  return (
    <div className="now-stepper" role="group" aria-label={`Everything on the globe in ${when}`}>
      <button type="button" className="now-step" onClick={() => stepNow(-1)} aria-label="Previous thing on the globe now" title="Previous on the globe now ( , )">
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <path d="M7.5 2 3.5 6l4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <span className="now-count" aria-live="polite" title={`Everything on the globe and in the sky in ${when}`}>
        {i >= 0 ? (
          <>
            <strong>{i + 1}</strong> of {items.length} at this time
          </>
        ) : (
          <>
            {items.length} things at this time
          </>
        )}
      </span>
      <button type="button" className="now-step" onClick={() => stepNow(1)} aria-label="Next thing on the globe now" title="Next on the globe now ( . )">
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <path d="M4.5 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

/**
 * , and . step through everything on the globe now, with or without a card open (globe only, not in a
 * tour or while typing). Mounted once, by the globe (map/MapView.tsx).
 */
export function useNowKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "," && e.key !== ".") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (!document.querySelector(".app.view-globe")) return;
      e.preventDefault();
      useStore.getState().stepNow(e.key === "." ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
