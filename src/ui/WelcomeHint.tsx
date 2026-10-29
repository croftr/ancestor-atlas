import { useEffect, useState } from "react";
import { useStore } from "../store";
import { useData } from "../map/data";
import { navigate } from "../route";
import { tourById, TOURS } from "../tours/tours";
import { beginTour } from "../tours/TourPlayer";
import { minutes } from "../tours/summary";

/** The tour offered to first-time visitors: the globe opens in its era. */
const FEATURED_TOUR = "out-of-africa";

const SEEN_KEY = "history-globe.welcome-seen";

const seen = () => {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false; // storage unavailable: show it, it's harmless
  }
};

/**
 * First visit to the globe: a guided tour to start with, or a few tips. Shown once per browser; goes away
 * with "Got it" or as soon as the visitor starts exploring (moves through time, presses play,
 * or picks something).
 */
export default function WelcomeHint() {
  const [open, setOpen] = useState(() => !seen());
  const setIntroOpen = useStore((s) => s.setIntroOpen);
  const data = useData();
  const tour = tourById(FEATURED_TOUR);

  useEffect(() => {
    if (!open) return;
    return useStore.subscribe((s, prev) => {
      if (
        s.year !== prev.year ||
        s.playing !== prev.playing ||
        s.selectedId !== prev.selectedId ||
        s.groupId !== prev.groupId ||
        s.place !== prev.place
      )
        setOpen(false);
    });
  }, [open]);

  useEffect(() => {
    if (open) return;
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* storage unavailable */
    }
  }, [open]);

  if (!open) return null;
  const tap = window.matchMedia?.("(pointer: coarse)").matches ? "Tap" : "Click";
  return (
    <div className="panel welcome-hint" role="region" aria-label="Getting started">
      <div className="welcome-title">Explore 7 million years of human history</div>
      {tour && (
        <div className="welcome-tour">
          <button
            className="welcome-tour-btn"
            onClick={() => {
              setOpen(false);
              beginTour(() => useStore.getState().startTour(tour.id));
            }}
          >
            <span className="welcome-tour-play" aria-hidden>
              <svg viewBox="0 0 16 16" width="14" height="14">
                <path d="M4.5 2.5v11L13.5 8z" fill="currentColor" />
              </svg>
            </span>
            <span>
              <strong>Take a guided tour: {tour.title}</strong>
              <span className="welcome-tour-meta">
                {tour.stops.length} narrated stops{data ? ` · about ${minutes(tour, data)} min` : ""}
              </span>
            </span>
          </button>
          <button
            className="welcome-tour-all"
            onClick={() => {
              setOpen(false);
              navigate("tours");
            }}
          >
            or choose from all {TOURS.length} tours
          </button>
        </div>
      )}
      <div className="welcome-or">Or explore on your own:</div>
      <ul>
        <li>
          <strong>Travel through time</strong> with the slider below, or press {"▶\uFE0E"} to watch it unfold.
        </li>
        <li>
          <strong>{tap} a marker</strong> on the globe to learn about it.
        </li>
        <li>
          <strong>{tap === "Click" ? "Right-click" : "Long-press"} any place</strong> (or use the pin in the search bar) to see everything that lived there across 7 million years.
        </li>
        {tap === "Click" && (
          <li>
            <strong>Right-drag</strong> (or Shift+drag) to move the globe aside.
          </li>
        )}
      </ul>
      <div className="welcome-actions">
        <button
          className="welcome-video-btn"
          onClick={() => {
            setIntroOpen(true);
            setOpen(false);
          }}
        >
          <span aria-hidden>▶</span> Watch intro video
        </button>
        <button className="welcome-ok" onClick={() => setOpen(false)}>
          Got it
        </button>
      </div>
    </div>
  );
}
