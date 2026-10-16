import { useEffect, useRef } from "react";
import { pauseNarration, playNarration, resumeNarration, stopNarration, useNarration } from "./narration";
import { pauseAmbience, startAmbience, stopAmbience } from "./ambience";
import { primeMusic } from "./music";
import { AMBIENCE } from "../tours/ambience";
import type { Entity } from "../types";
import { useStore } from "../store";
import "./listen.css";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** If the narration ends before the sound's short burst does, the sound plays on this long, then fades out over AMBIENCE_FADE_S. */
const AMBIENCE_AFTER_MS = 1_500;
const AMBIENCE_FADE_S = 3;

/**
 * "Listen": plays the entity's narration (pause and resume on the same button), with its ambient sound
 * under it if it has one (tours/ambience.ts), as in a tour. Nothing loads until pressed. Hidden while a
 * tour plays: the tour reads each stop itself.
 */
export default function ListenButton({ entity }: { entity: Entity }) {
  const n = useNarration();
  const narration = entity.narration;
  const started = useRef(false);
  const mine = narration !== undefined && n.src === narration.src;
  const touring = useStore((s) => s.tour !== null);
  const sound = AMBIENCE[entity.id]?.sound;

  // Leaving the card stops a clip this button started (a tour stops its own), and its sound.
  useEffect(
    () => () => {
      if (!started.current) return;
      stopNarration();
      stopAmbience();
      started.current = false;
    },
    [narration?.src],
  );

  // The sound's burst follows the narration: paused with it, and fading away a moment after it ends.
  useEffect(() => {
    if (!started.current || !sound || !mine) return;
    if (n.playing) return pauseAmbience(false);
    if (!n.ended) return pauseAmbience(true);
    const t = window.setTimeout(() => stopAmbience(AMBIENCE_FADE_S), AMBIENCE_AFTER_MS);
    return () => window.clearTimeout(t);
  }, [sound, mine, n.playing, n.ended]);

  if (!narration || touring) return null;
  const playing = mine && n.playing;
  const onClick = () => {
    if (playing) return pauseNarration();
    started.current = true;
    if (mine && n.time > 0 && !n.ended) return resumeNarration(); // the sound (if still to come) resumes with it
    if (sound) {
      primeMusic(); // the sound plays through Web Audio, which needs this tap to start
      stopAmbience(0.3); // a replay starts the burst again
      pauseAmbience(false);
      startAmbience(sound.src, { muteable: false });
    }
    playNarration(narration.src).catch(() => {});
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
