import { useEffect, useRef, type CSSProperties } from "react";
import { useStore } from "../store";
import { CATEGORY_STYLE, ERA_PRESETS } from "../config";
import { useData } from "../map/data";
import {
  MAX_YEAR,
  MIN_YEAR,
  POS_BREAKS,
  STEPS,
  formatRange,
  formatYear,
  posToYear,
  segmentOfBce,
  stepYear,
  yearToPos,
} from "../time/scale";

const TICK_LABELS = ["10 Ma", "1 Ma", "100 ka", "10,000 BCE", "3,000 BCE", "1 CE"];
/** Narrow screens: the same ticks, shortened so neighbours don't run together. */
const TICK_SHORT = ["10 Ma", "1 Ma", "100 ka", "10k BCE", "3k BCE", "1 CE"];

/** Transport icons as SVG: emoji glyphs render inconsistently, and ▶ (play) and ▶ (step) look the same. */
const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
    <path d={d} fill="currentColor" />
  </svg>
);
const ICON = {
  start: "M3 3h2v10H3zM13 3v10L6 8z",
  back: "M11 3v10L4 8z",
  play: "M4.5 2.5v11L13.5 8z",
  pause: "M4 3h3v10H4zM9 3h3v10H9z",
  forward: "M5 3v10l7-5z",
  end: "M11 3h2v10h-2zM3 3v10l7-5z",
};

export default function TimeSlider() {
  const year = useStore((s) => s.year);
  const playing = useStore((s) => s.playing);
  const setYear = useStore((s) => s.setYear);
  const setPlaying = useStore((s) => s.setPlaying);

  // Lifespan of whatever is selected, drawn as a band under the slider.
  const data = useData();
  const selectedId = useStore((s) => s.selectedId);
  const groupId = useStore((s) => s.groupId);
  const hits = useStore((s) => s.hits);
  const entityId = groupId ?? hits.find((h) => h.id === selectedId)?.entity_id;
  const spanEntity = entityId ? data?.entityById.get(entityId) : undefined;
  const spanLeft = spanEntity ? yearToPos(spanEntity.start_year) : 0;
  const spanRight = spanEntity ? yearToPos(spanEntity.end_year) : 0;

  const resolution = STEPS[segmentOfBce(1 - year)];

  // Play loop
  const posRef = useRef(0);
  useEffect(() => {
    if (!playing) return;
    const start = useStore.getState().year;
    if (start >= MAX_YEAR) {
      setYear(MIN_YEAR);
      posRef.current = 0;
    } else {
      posRef.current = yearToPos(start);
    }
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      posRef.current += dt / 60000;
      if (posRef.current >= 1) {
        setYear(MAX_YEAR);
        setPlaying(false);
        return;
      }
      setYear(posToYear(posRef.current));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, setYear, setPlaying]);

  // Keyboard
  useEffect(() => {
    const isTextInput = (t: EventTarget | null) => {
      if (!(t instanceof HTMLElement)) return false;
      if (t.tagName === "TEXTAREA" || t.isContentEditable) return true;
      if (t instanceof HTMLInputElement) return t.type !== "range" && t.type !== "checkbox";
      return false;
    };
    const onDown = (e: KeyboardEvent) => {
      if (isTextInput(e.target)) return;
      const s = useStore.getState();
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        s.setYear(stepYear(s.year, -1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        s.setYear(stepYear(s.year, 1));
      } else if (e.key === " ") {
        e.preventDefault();
        s.setPlaying(!s.playing);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === " " && !isTextInput(e.target)) e.preventDefault(); // avoid button click on Space
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  return (
    <div className="panel time-slider">
      <div className="year-readout">{formatYear(year)}</div>
      <div className="muted resolution">Resolution: {resolution.toLocaleString("en-US")} years</div>
      <div className="controls">
        <button className="ctl-start" onClick={() => setYear(MIN_YEAR)} title="Start" aria-label="Start"><Icon d={ICON.start} /></button>
        <button onClick={() => setYear(stepYear(year, -1))} title="Step back" aria-label="Step back"><Icon d={ICON.back} /></button>
        <button className="ctl-play" onClick={() => setPlaying(!playing)} title="Play / pause" aria-label={playing ? "Pause" : "Play"}>
          <Icon d={playing ? ICON.pause : ICON.play} />
        </button>
        <button onClick={() => setYear(stepYear(year, 1))} title="Step forward" aria-label="Step forward"><Icon d={ICON.forward} /></button>
        <button className="ctl-end" onClick={() => setYear(MAX_YEAR)} title="End" aria-label="End"><Icon d={ICON.end} /></button>
      </div>
      <input
        className="range"
        type="range"
        min={0}
        max={10000}
        step={1}
        value={Math.round(yearToPos(year) * 10000)}
        aria-label="Year"
        // Drives the filled part of the slider track (index.css).
        style={{ "--pos": `${yearToPos(year) * 100}%` } as CSSProperties}
        onChange={(e) => setYear(posToYear(Number(e.target.value) / 10000))}
      />
      <div className="span-track">
        {spanEntity && (
          <div
            className="span-band"
            title={`${spanEntity.name}: ${formatRange(spanEntity.start_year, spanEntity.end_year)}`}
            style={{
              left: `${spanLeft * 100}%`,
              width: `${(spanRight - spanLeft) * 100}%`,
              background: spanEntity.color ?? CATEGORY_STYLE[spanEntity.category].color,
            }}
          />
        )}
      </div>
      <div className="ticks">
        {POS_BREAKS.map((p, i) => (
          <span key={i} className="tick" style={{ left: `${p * 100}%` }}>
            <span className="tick-long">{TICK_LABELS[i]}</span>
            <span className="tick-short">{TICK_SHORT[i]}</span>
          </span>
        ))}
      </div>
      <div className="chips">
        {ERA_PRESETS.map((e) => (
          <button key={e.label} className="chip" onClick={() => setYear(e.year)}>
            {e.label}
          </button>
        ))}
      </div>
    </div>
  );
}
