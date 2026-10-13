import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useStore } from "../store";
import { useData } from "../map/data";
import { yearToPos } from "../time/scale";
import { TOURS, tourById, type Tour } from "./tours";
import { beginTour, holdSeconds, stopYear } from "./TourPlayer";
import { setMusicMuted, useMusicMuted } from "../audio/music";
import type { Data } from "../map/data";
import "./tours.css";

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
    <path d={d} fill="currentColor" fillRule="evenodd" />
  </svg>
);
const ICON = {
  prev: "M3 3h2v10H3zM13 3v10L6 8z",
  next: "M11 3h2v10h-2zM3 3v10l7-5z",
  play: "M4.5 2.5v11L13.5 8z",
  pause: "M4 3h3v10H4zM9 3h3v10H9z",
  // A note, and the same struck through: music on / off.
  music: "M6 2.5 13 1v9.2a2.3 2.3 0 1 1-1.4-2.1V4.1L7.4 5v6.7A2.3 2.3 0 1 1 6 9.6z",
  musicOff: "M6 2.5 13 1v9.2a2.3 2.3 0 1 1-1.4-2.1V4.1L7.4 5v6.7A2.3 2.3 0 1 1 6 9.6zM1.7 2.6l.9-.9 11.7 11.7-.9.9z",
  close: "M4.2 3 8 6.8 11.8 3 13 4.2 9.2 8l3.8 3.8-1.2 1.2L8 9.2 4.2 13 3 11.8 6.8 8 3 4.2z",
  // A film frame: the "watch a tour" button.
  film: "M2 3h12v10H2zM3.3 4.2v1.3h1.3V4.2zm0 3.1v1.4h1.3V7.3zm0 3.2v1.3h1.3v-1.3zm8.1-6.3v1.3h1.3V4.2zm0 3.1v1.4h1.3V7.3zm0 3.2v1.3h1.3v-1.3zM5.8 4.2v7.6h4.4V4.2z",
};

/** Rough running time of a tour in minutes: the holds plus the slider travel between stops. */
function minutes(tour: Tour, d: Data): number {
  let ms = 0;
  let pos = 0;
  for (const stop of tour.stops) {
    const e = d.entityById.get(stop.entity);
    const y = stopYear(stop, d);
    if (!e || y === null) continue;
    ms += holdSeconds(stop, e.description) * 1000;
    const to = yearToPos(y);
    if (to > pos) ms += Math.min(6000, Math.max(1500, (to - pos) * 60_000));
    pos = to;
  }
  return Math.max(1, Math.round(ms / 60_000));
}

/** The "Tours" button on the time bar and its list of tours. */
export function TourPicker() {
  const data = useData();
  const startTour = useStore((s) => s.startTour);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="tour-picker" ref={ref}>
      <button
        className="ctl-tour"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        title="Watch a guided tour"
      >
        <Icon d={ICON.film} />
        <span>Tours</span>
      </button>
      {open && (
        <div className="tour-menu" role="menu">
          <div className="tour-menu-head">Sit back and watch</div>
          {TOURS.map((t) => (
            <button
              key={t.id}
              role="menuitem"
              className="tour-item"
              onClick={() => {
                setOpen(false);
                beginTour(() => startTour(t.id));
              }}
            >
              <span className="tour-item-title">{t.title}</span>
              <span className="tour-item-blurb">{t.blurb}</span>
              <span className="tour-item-meta">
                {t.stops.length} stops{data && ` · about ${minutes(t, data)} min`}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Tour controls, in place of the transport buttons while a tour plays. */
export default function TourBar() {
  const data = useData();
  const tour = useStore((s) => s.tour);
  const pauseTour = useStore((s) => s.pauseTour);
  const tourGo = useStore((s) => s.tourGo);
  const stopTour = useStore((s) => s.stopTour);
  const openGate = useStore((s) => s.openGate);
  const musicMuted = useMusicMuted();
  const t = tour && tourById(tour.id);
  if (!tour || !t) return null;
  const stop = t.stops[tour.index];
  const name = data?.entityById.get(stop.entity)?.name ?? "";
  const last = t.stops.length - 1;

  return (
    <div className="tour-bar">
      <div className="tour-bar-text">
        <span className="tour-bar-title">{t.title}</span>
        <span className="tour-bar-stop" aria-live="polite">
          {tour.index + 1} of {t.stops.length}: {name}
        </span>
      </div>
      <div className="controls tour-controls">
        <button onClick={() => tourGo(tour.index - 1)} disabled={tour.index === 0} title="Previous stop" aria-label="Previous stop">
          <Icon d={ICON.prev} />
        </button>
        <button className="ctl-play" onClick={() => (tour.gate ? beginTour(openGate) : pauseTour(!tour.paused))} title={tour.paused ? "Resume" : "Pause"} aria-label={tour.paused ? "Resume tour" : "Pause tour"}>
          <Icon d={tour.paused ? ICON.play : ICON.pause} />
        </button>
        <button onClick={() => tourGo(tour.index + 1)} disabled={tour.index === last} title="Next stop" aria-label="Next stop">
          <Icon d={ICON.next} />
        </button>
        {t.music && (
          <button
            onClick={() => setMusicMuted(!musicMuted)}
            aria-pressed={!musicMuted}
            title={musicMuted ? "Music off" : "Music on"}
            aria-label="Background music"
          >
            <Icon d={musicMuted ? ICON.musicOff : ICON.music} />
          </button>
        )}
        <button className="tour-exit" onClick={stopTour} title="End tour" aria-label="End tour">
          <Icon d={ICON.close} />
        </button>
      </div>
      {/* How long the card stays up: a bar that fills while it holds, frozen while paused. */}
      <div className="tour-progress" aria-hidden="true">
        {tour.phase === "hold" && (
          <span
            key={`${tour.id}:${tour.index}:${tour.holdMs}`}
            style={{ animationDuration: `${tour.holdMs}ms`, animationPlayState: tour.paused ? "paused" : "running" } as CSSProperties}
          />
        )}
      </div>
      {t.music && <div className="tour-credit muted">{t.music.credit}</div>}
    </div>
  );
}
