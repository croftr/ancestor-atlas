import { useEffect, useRef } from "react";
import { pauseNarration, playNarration, resumeNarration, stopNarration, useNarration } from "./narration";
import type { Entity } from "../types";
import { useStore } from "../store";
import "./listen.css";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * "Listen": plays the entity's narration (pause and resume on the same button). Nothing loads until pressed.
 * Hidden while a tour plays: the tour reads each stop itself.
 */
export default function ListenButton({ entity }: { entity: Entity }) {
  const n = useNarration();
  const narration = entity.narration;
  const started = useRef(false);
  const mine = narration !== undefined && n.src === narration.src;
  const touring = useStore((s) => s.tour !== null);

  // Leaving the card stops a clip this button started (a tour stops its own).
  useEffect(
    () => () => {
      if (started.current) stopNarration();
    },
    [narration?.src],
  );

  if (!narration || touring) return null;
  const playing = mine && n.playing;
  const onClick = () => {
    if (playing) return pauseNarration();
    started.current = true;
    if (mine && n.time > 0 && !n.ended) resumeNarration();
    else playNarration(narration.src).catch(() => {});
  };
  const label = mine && n.failed ? "Narration unavailable" : playing ? "Pause" : mine && n.time > 0 && !n.ended ? "Resume" : "Listen";

  return (
    <div className="listen">
      <button className="listen-btn" onClick={onClick} disabled={mine && n.failed} aria-label={`${label}: narration of ${entity.name}`}>
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path fill="currentColor" d={playing ? "M4 3h3v10H4zM9 3h3v10H9z" : "M4.5 2.5v11L13.5 8z"} />
        </svg>
        {label}
        {mine && n.duration > 0 && (
          <span className="listen-time">
            {fmt(n.time)} / {fmt(n.duration)}
          </span>
        )}
      </button>
      {mine && n.duration > 0 && (
        <span className="listen-progress" aria-hidden="true">
          <span style={{ width: `${(100 * n.time) / n.duration}%` }} />
        </span>
      )}
      <span className="muted listen-credit">{narration.credit}</span>
    </div>
  );
}
