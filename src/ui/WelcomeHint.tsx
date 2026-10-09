import { useEffect, useState } from "react";
import { useStore } from "../store";

const SEEN_KEY = "history-globe.welcome-seen";

const seen = () => {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false; // storage unavailable: show it, it's harmless
  }
};

/**
 * First visit to the globe: how to get going, in two lines. Shown once per browser; goes away
 * with "Got it" or as soon as the visitor starts exploring (moves through time, presses play,
 * or picks something).
 */
export default function WelcomeHint() {
  const [open, setOpen] = useState(() => !seen());

  useEffect(() => {
    if (!open) return;
    return useStore.subscribe((s, prev) => {
      if (s.year !== prev.year || s.playing !== prev.playing || s.selectedId !== prev.selectedId || s.groupId !== prev.groupId)
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
      <ul>
        <li>
          <strong>Travel through time</strong> with the slider below, or press {"▶\uFE0E"} to watch it unfold.
        </li>
        <li>
          <strong>{tap} a marker</strong> on the globe to learn about it.
        </li>
      </ul>
      <button className="welcome-ok" onClick={() => setOpen(false)}>
        Got it
      </button>
    </div>
  );
}
