import { useEffect, useRef, useState, type CSSProperties, type TouchEvent } from "react";
import { createPortal } from "react-dom";
import { useStore } from "../store";
import { tourById } from "../tours/tours";
import { MINI_GLOBE } from "../config";
import { CategoryBadge } from "./CategoryIcon";
import { creditLine, isAiCredit } from "./PictureNav";
import TourVideo from "./TourVideo";
import type { Entity } from "../types";
import type { Picture } from "../tours/tourPicture";
import "./picture-viewer.css";

const Chevron = ({ dir }: { dir: -1 | 1 }) => (
  <svg viewBox="0 0 12 12" width="18" height="18" aria-hidden="true">
    <path d={dir < 0 ? "M7.5 2 3.5 6l4 4" : "M4.5 2l4 4-4 4"} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * A card's pictures full screen: the picture shown whole over a blurred, darkened copy of itself,
 * with its caption and credit. Opened by tapping the picture on the info card.
 *
 * The viewer steps through the pictures (arrows, dots, keys, swipes). Outside a tour a tap beside
 * the picture closes it. During a tour the pictures change with the narration as on the card,
 * slowly drifting closer, until the viewer steps through them by hand: from then on, at this stop,
 * the pictures stay where they are put, and the narration plays on untouched. The viewer stays
 * on from stop to stop (the info card hides it while the globe travels); a small bar pauses the
 * tour (Space too) and steps the pictures. Escape closes the viewer, not the tour.
 *
 * `miniGlobe` (over the globe, on desktop): the globe shrinks into a small round window at the top
 * left (map/MapView.tsx), showing where the pictures belong; a tap on it goes back to the globe.
 */
export default function PictureViewer({
  entity,
  date,
  pictures,
  index,
  onIndex,
  miniGlobe = false,
}: {
  miniGlobe?: boolean;
  entity: Entity;
  date: string;
  pictures: Picture[];
  index: number;
  onIndex: (index: number) => void;
}) {
  const setOpen = useStore((s) => s.setPictureViewer);
  const tour = useStore((s) => s.tour);
  const touring = tour !== null;
  const count = pictures.length;
  // On a tour, a picture picked by hand (for this stop) overrides the narration's timing; the tour
  // itself is not touched. Outside a tour the card follows the viewer (`onIndex`).
  const [picked, setPicked] = useState<{ entity: string; index: number } | null>(null);
  const shownIndex = touring && picked?.entity === entity.id ? picked.index : index;
  const picture = pictures[Math.min(Math.max(0, shownIndex), count - 1)];
  const go = (i: number) => (touring ? setPicked({ entity: entity.id, index: i }) : onIndex(i));
  const step = (d: number) => go((shownIndex + d + count) % count);

  // Escape closes the viewer only (not the card, not the tour); the arrows step through the
  // pictures, rather than moving the time slider or the tour. Captured before the app's own keys.
  const keyState = useRef({ step, count });
  keyState.current = { step, count };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = keyState.current;
      if (e.key === "Escape") setOpen(false);
      // (Always kept here, even with one picture, so they never jump the tour to another stop.)
      else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        if (k.count > 1) k.step(e.key === "ArrowLeft" ? -1 : 1);
      }
      else return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [setOpen]);

  useEffect(() => {
    if (!miniGlobe) return;
    useStore.setState({ miniGlobe: true });
    return () => useStore.setState({ miniGlobe: false });
  }, [miniGlobe]);

  // Focus moves into the viewer and back to where it was when it closes.
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });
    return () => before?.focus?.({ preventScroll: true });
  }, []);

  // Touch: swipe sideways for the next picture, swipe down to close.
  const swipe = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || Date.now() - s.t > 600) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (count > 1 && Math.abs(dx) > 50 && Math.abs(dx) > 2 * Math.abs(dy)) step(dx < 0 ? 1 : -1);
    else if (dy > 80 && dy > 2 * Math.abs(dx)) setOpen(false);
  };

  if (!picture) return null;
  const tourInfo = tour ? tourById(tour.id) : undefined;
  const label = picture.caption ? `${entity.name}: ${picture.caption}` : entity.name;

  return createPortal(
    <>
    <div
      className={`pv${touring ? " pv-touring" : ""}${miniGlobe ? " pv-has-mini" : ""}`}
      style={{ "--mini-size": `${MINI_GLOBE.size}px` } as CSSProperties}
      role="dialog"
      aria-modal="true"
      aria-label={`${entity.name}: pictures`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* The picture again, blurred and dimmed, filling the screen around it. */}
      <div className="pv-ambient" aria-hidden="true">
        <img key={picture.url} className="picture-in" src={picture.url} alt="" />
      </div>
      <div
        className="pv-stage"
        // A tap beside the picture closes the viewer (outside a tour: there, taps are left alone).
        onClick={touring ? undefined : (e) => e.target === e.currentTarget && setOpen(false)}
      >
        <img
          key={picture.url}
          className={`pv-img picture-in${touring && !(shownIndex === 0 && entity.video) ? " pv-drift" : ""}`}
          src={picture.url}
          alt={label}
          style={touring && tour?.phase === "hold" ? ({ animationPlayState: tour.paused ? "running, paused" : "running, running" } as CSSProperties) : undefined}
        />
        {shownIndex === 0 && entity.video && <TourVideo key={entity.video.src} src={entity.video.src} />}
      </div>

      <header className="pv-head">
        <CategoryBadge category={entity.category} size={26} decorative />
        <div className="pv-title">
          <h2>{entity.name}</h2>
          <div className="pv-date">{date}{count > 1 && <> · {shownIndex + 1} of {count}</>}</div>
        </div>
      </header>
      <button ref={closeRef} className="pv-close" onClick={() => setOpen(false)} aria-label="Close pictures" title="Close (Esc)">
        <svg viewBox="0 0 12 12" width="14" height="14" aria-hidden="true">
          <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {!touring && count > 1 && (
        <>
          <button className="pv-arrow pv-prev" onClick={() => step(-1)} aria-label="Previous picture" title="Previous picture (←)">
            <Chevron dir={-1} />
          </button>
          <button className="pv-arrow pv-next" onClick={() => step(1)} aria-label="Next picture" title="Next picture (→)">
            <Chevron dir={1} />
          </button>
        </>
      )}

      <footer className="pv-foot">
        {(picture.caption || (picture.credit && !isAiCredit(picture.credit))) && (
          <div className="pv-caption" aria-live="polite">
            {picture.caption && <div className="pv-caption-text">{picture.caption}</div>}
            {picture.credit && !isAiCredit(picture.credit) && <div className="pv-credit">{creditLine(picture.credit, undefined, picture.source)}</div>}
          </div>
        )}
        {count > 1 && (
          <div className="pv-dots" role="tablist" aria-label="Pictures">
            {pictures.map((p, i) => (
              <button
                key={p.url + i}
                className={`pv-dot${i === shownIndex ? " active" : ""}`}
                onClick={() => go(i)}
                role="tab"
                aria-selected={i === shownIndex}
                aria-label={`Picture ${i + 1} of ${count}`}
              />
            ))}
          </div>
        )}
        {tour && tourInfo && (
          <div className="pv-tour">
            {count > 1 && (
              <button onClick={() => step(-1)} aria-label="Previous picture" title="Previous picture (←)">
                <Chevron dir={-1} />
              </button>
            )}
            <button
              className="pv-tour-play"
              onClick={() => useStore.getState().pauseTour(!tour.paused)}
              aria-label={tour.paused ? "Resume tour" : "Pause tour"}
              title={tour.paused ? "Resume (Space)" : "Pause (Space)"}
            >
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                {tour.paused ? <path fill="currentColor" d="M4.5 2.5v11L13.5 8z" /> : <path fill="currentColor" d="M4 2.5h3v11H4zM9 2.5h3v11H9z" />}
              </svg>
            </button>
            {count > 1 && (
              <button onClick={() => step(1)} aria-label="Next picture" title="Next picture (→)">
                <Chevron dir={1} />
              </button>
            )}
            <span className="pv-tour-text">
              {tourInfo.title} · {tour.index + 1} of {tourInfo.stops.length}
            </span>
            <span className="pv-tour-progress" aria-hidden="true">
              {tour.phase === "hold" && (
                <span
                  key={`${tour.id}:${tour.index}:${tour.holdMs}`}
                  style={{ animationDuration: `${tour.holdMs}ms`, animationPlayState: tour.paused ? "paused" : "running" } as CSSProperties}
                />
              )}
            </span>
          </div>
        )}
      </footer>
    </div>
    {/* A ring round the small globe (drawn by the map above the viewer); a tap goes back to it. */}
    {miniGlobe && (
      <button
        className="pv-mini"
        style={{ left: MINI_GLOBE.left, top: MINI_GLOBE.top, width: MINI_GLOBE.size, height: MINI_GLOBE.size }}
        onClick={() => setOpen(false)}
        aria-label="Back to the globe"
        title="Back to the globe"
      />
    )}
    </>,
    document.body,
  );
}
