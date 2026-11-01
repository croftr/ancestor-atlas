import { useEffect, useRef, type CSSProperties } from "react";
import { useStore } from "../store";
import NowStepper, { useNowKeys } from "../now/NowStepper";
import { SKY_EVENTS, SKY_KIND_NAME, SKY_PLACE, skyShownAt, type SkyEvent, type SkyKind } from "./sky";
import { useSkyOpen } from "./skyOpen";

const placeStyle = (e: SkyEvent) => {
  const [x, y] = SKY_PLACE[e.kind];
  return { "--sky-ox": `${x}%`, "--sky-oy": `${y}%` } as CSSProperties;
};

/**
 * Supernovae and comets of the slider's moment (sky.ts), on the star background (map/SpaceBackground.tsx):
 * plain elements drawn with CSS, faded in and out as the slider passes. The background is not a real sky,
 * so each kind has a fixed place in its upper part (`SKY_PLACE`), clear of the globe; the comet's tail
 * points away from the globe. A dated supernova shines steadily; one known only to a span of time flares
 * now and then (steady while its details are open). The background sits under the map and takes no
 * clicks: SkyHits, over the map, makes them clickable.
 */
export default function SkyObjects() {
  const year = useStore((s) => s.year);
  const open = useSkyOpen((s) => s.open);
  return (
    <div className="space-sky">
      {SKY_EVENTS.map((e) => {
        const on = skyShownAt(e, year);
        const cls =
          `sky-object sky-${e.kind}${e.span ? " sky-span" : ""}${e.annular ? " sky-annular" : ""}` +
          `${on ? " on" : ""}${on && open === e.id ? " open" : ""}`;
        return (
          <div key={e.id} className={cls} style={placeStyle(e)}>
            <SkyDrawing kind={e.kind} />
          </div>
        );
      })}
    </div>
  );
}

/** A line on how the drawing relates to what was seen. */
function panelNote(e: SkyEvent): string {
  if (e.span) return "Shown flaring now and then: when in this span the star exploded is not known.";
  if (e.kind === "eclipse") return "It happened by day; the atlas shows it against its night sky.";
  return "Drawn in the atlas's sky as a sign of the time; the stars behind it are not a map of the real sky.";
}

/** The parts of each kind's drawing; the look is all CSS (index.css, "sky-"). */
function SkyDrawing({ kind }: { kind: SkyKind }) {
  switch (kind) {
    case "comet":
      return (
        <>
          <span className="sky-comet-tail" />
          <span className="sky-comet-head" />
        </>
      );
    case "eclipse":
      return (
        <>
          <span className="sky-eclipse-corona" />
          <span className="sky-eclipse-moon" />
        </>
      );
    case "aurora":
      return (
        <>
          <span className="sky-aurora-curtain a" />
          <span className="sky-aurora-curtain b" />
        </>
      );
    case "conjunction":
      return (
        <>
          <span className="sky-planet venus" />
          <span className="sky-planet jupiter" />
        </>
      );
    default:
      return <span className="sky-supernova-glow" />;
  }
}

/**
 * Over the map (map/MapView.tsx): a round button on each sky object showing now, which opens a small panel
 * under it saying what it is, when, and the source. Closed by its button, Escape, a click elsewhere, or
 * the slider moving away from it.
 */
export function SkyHits() {
  const year = useStore((s) => s.year);
  const { open, setOpen } = useSkyOpen();
  const shown = SKY_EVENTS.filter((e) => skyShownAt(e, year));
  const current = shown.find((e) => e.id === open) ?? null;
  const panelRef = useRef<HTMLDivElement>(null);
  useNowKeys();

  // Gone from the sky: close its details.
  useEffect(() => {
    if (open && !current) setOpen(null);
  }, [open, current, setOpen]);

  useEffect(() => {
    if (!current) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setOpen(null);
    };
    const onDown = (ev: PointerEvent) => {
      const t = ev.target as Element | null;
      if (t && (panelRef.current?.contains(t) || t.closest(".sky-hit"))) return;
      setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown, true);
    };
  }, [current, setOpen]);

  return (
    <>
      {shown.map((e) => (
        <button
          key={e.id}
          type="button"
          className="sky-hit"
          style={placeStyle(e)}
          aria-label={`${e.name}, ${e.date_text}: what is this?`}
          aria-expanded={open === e.id}
          title={`${e.name} (${e.date_text})`}
          onClick={() => setOpen(open === e.id ? null : e.id)}
        />
      ))}
      {current && (
        <div ref={panelRef} className="panel sky-panel" style={placeStyle(current)} role="dialog" aria-label={current.name}>
          <button type="button" className="sky-panel-close" aria-label="Close" onClick={() => setOpen(null)}>
            ×
          </button>
          <NowStepper />
          <div className="sky-panel-kind">{SKY_KIND_NAME[current.kind]} · in the sky</div>
          <div className="sky-panel-name">{current.name}</div>
          <div className="sky-panel-date">
            {current.date_text}
            {current.certainty && <span className="sky-certainty">{current.certainty}</span>}
          </div>
          <p>{current.description}</p>
          <p className="sky-panel-note muted">{panelNote(current)}</p>
          <a className="sky-panel-source" href={current.source.url} target="_blank" rel="noreferrer">
            Source: {current.source.label}
          </a>
        </div>
      )}
    </>
  );
}
