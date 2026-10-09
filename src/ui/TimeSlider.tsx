import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useStore } from "../store";
import { CATEGORY_STYLE, ERA_PRESETS, STACKED_QUERY, TIMELINE_ERAS } from "../config";
import { erasFor } from "../timeline/layout";
import { useMediaQuery } from "./useMediaQuery";
import { useData } from "../map/data";
import EraIcon from "./EraIcon";
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

// Plain words, not geologists' "Ma" / "ka".
const TICK_LABELS = ["10M yrs ago", "1M yrs ago", "100k yrs ago", "10,000 BCE", "3,000 BCE", "1 CE"];
/** Narrow screens: the same ticks, shortened so neighbours don't run together. */
const TICK_SHORT = ["10M yrs", "1M yrs", "100k yrs", "10k BCE", "3k BCE", "1 CE"];

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

  // The era the year falls in ("Early Homo"), as on the timeline and Events page. On small
  // screens it's also the button that opens the jump-to shortcuts (hidden there for space).
  const eras = useMemo(() => (data ? erasFor(data.entities, TIMELINE_ERAS) : []), [data]);
  const era = eras.find((e) => year < e.end) ?? eras.at(-1);
  const stacked = useMediaQuery(STACKED_QUERY);
  // The latest shortcut the slider has reached, lit up in the chip row and on the track.
  const activePreset = [...ERA_PRESETS].reverse().find((p) => p.year <= year)?.label;
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

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
      <div className="year-sub">
        {era &&
          (stacked ? (
            <button
              className="era-btn"
              onClick={() => setShortcutsOpen((o) => !o)}
              aria-expanded={shortcutsOpen}
              aria-controls="era-shortcuts"
              title="Jump to a moment"
            >
              {era.label}
              <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
                <path d={shortcutsOpen ? "M2.5 7.5 6 4l3.5 3.5" : "M2.5 4.5 6 8l3.5-3.5"} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : (
            <span className="era-name">{era.label}</span>
          ))}
        <span className="muted resolution">Each step: {resolution.toLocaleString("en-US")} years</span>
      </div>
      <div className="controls">
        <button className="ctl-start" onClick={() => setYear(MIN_YEAR)} title="Start" aria-label="Start"><Icon d={ICON.start} /></button>
        <button onClick={() => setYear(stepYear(year, -1))} title="Step back" aria-label="Step back"><Icon d={ICON.back} /></button>
        <button className="ctl-play" onClick={() => setPlaying(!playing)} title="Play / pause" aria-label={playing ? "Pause" : "Play"}>
          <Icon d={playing ? ICON.pause : ICON.play} />
        </button>
        <button onClick={() => setYear(stepYear(year, 1))} title="Step forward" aria-label="Step forward"><Icon d={ICON.forward} /></button>
        <button className="ctl-end" onClick={() => setYear(MAX_YEAR)} title="End" aria-label="End"><Icon d={ICON.end} /></button>
      </div>
      <div className="range-wrap">
        <div className="preset-marks" aria-hidden="true">
          {ERA_PRESETS.map((p) => (
            <span
              key={p.label}
              className={`preset-mark${p.label === activePreset ? " active" : ""}`}
              style={{ left: `${yearToPos(p.year) * 100}%`, "--tint": p.tint } as CSSProperties}
            />
          ))}
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
      </div>
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
      <div id="era-shortcuts" className={`chips${shortcutsOpen ? " open" : ""}`}>
        {ERA_PRESETS.map((e) => (
          <button
            key={e.label}
            className={`chip era-chip${e.label === activePreset ? " active" : ""}`}
            style={{ "--tint": e.tint } as CSSProperties}
            title={formatYear(e.year)}
            aria-pressed={e.label === activePreset}
            onClick={() => {
              setYear(e.year);
              setShortcutsOpen(false);
            }}
          >
            <span className="era-chip-icon">
              <EraIcon name={e.icon} />
            </span>
            {e.label}
          </button>
        ))}
      </div>
    </div>
  );
}
