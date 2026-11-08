import { useEffect, useState, type CSSProperties } from "react";
import { useStore } from "../store";
import { STACKED_QUERY } from "../config";
import ListenButton from "../audio/ListenButton";
import NowStepper from "../now/NowStepper";
import TourStopLinks from "../tours/TourStopLinks";
import { CardAction, CardIcon, SourcesDisclosure } from "../ui/CardParts";
import CardResizer from "../ui/CardResizer";
import TourVideo from "../ui/TourVideo";
import { useMediaQuery } from "../ui/useMediaQuery";
import { SkyDrawing } from "./SkyObjects";
import { SKY_KIND_NAME, SKY_STYLE, skyById, skyShownAt, type SkyEvent, type SkyKind } from "./sky";

const SKY_VIDEO: Record<SkyKind, string> = {
  supernova: "video/sky/supernova-v1.mp4",
  nova: "video/sky/nova-v1.mp4",
  comet: "video/sky/comet-v1.mp4",
  eclipse: "video/sky/eclipse-v1.mp4",
  aurora: "video/sky/aurora-v1.mp4",
  conjunction: "video/sky/conjunction-v1.mp4",
};

/** A line on how the drawing relates to what was seen. */
export function skyNote(e: SkyEvent): string {
  if (e.span) return "Shown flaring now and then: when in this span the star exploded is not known.";
  if (e.kind === "eclipse") return "It happened by day; the atlas shows it against its night sky.";
  return "Drawn in the atlas's sky as a sign of the time; the stars behind it are not a map of the real sky.";
}

/** The sky's round badge (a four-pointed star), in the place a category's badge takes. */
export function SkyBadge({ size = 40 }: { size?: number }) {
  return (
    <span className="cat-badge" aria-hidden="true" style={{ background: SKY_STYLE.color, color: SKY_STYLE.ink, boxShadow: `0 0 0 1.5px ${SKY_STYLE.ink}`, width: size, height: size }}>
      <SkyIcon size={Math.round(size * 0.62)} />
    </span>
  );
}

export const SkyIcon = ({ size = 22 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
    <path d="M12 1.5 14.1 9.9 22.5 12 14.1 14.1 12 22.5 9.9 14.1 1.5 12 9.9 9.9Z" />
    <path d="M19 2.5 19.7 4.3 21.5 5 19.7 5.7 19 7.5 18.3 5.7 16.5 5 18.3 4.3Z" />
  </svg>
);

/** The drawing from the sky, large, on a patch of night: the card's picture. */
export function SkyPicture({ e, animated = false }: { e: SkyEvent; animated?: boolean }) {
  const video = animated ? SKY_VIDEO[e.kind] : undefined;
  return (
    <div className={`sky-picture sky-${e.kind}${e.annular ? " sky-annular" : ""}`} role="img" aria-label={`${SKY_KIND_NAME[e.kind]}, as drawn in the atlas's sky`}>
      <div className={`sky-object sky-${e.kind}${e.annular ? " sky-annular" : ""} on`} style={{ "--sky-ox": "50%", "--sky-oy": "50%" } as CSSProperties}>
        <SkyDrawing kind={e.kind} />
      </div>
      {video && <TourVideo key={`${e.id}:${video}`} src={video} />}
    </div>
  );
}

/**
 * The card for a sky object (sky.ts), in the info card's place and made of the same parts (ui/CardParts.tsx):
 * the step-through bar, head, an action to its page, the drawing, the description, how sure the date is,
 * and the source. Shown while no other card is open; closes when the slider leaves its time.
 */
export default function SkyCard() {
  const id = useStore((s) => s.skyId);
  const covered = useStore((s) => s.selectedId !== null || s.groupId !== null || s.place !== null || s.dnaSite !== null);
  const year = useStore((s) => s.year);
  const isTouring = useStore((s) => s.tour !== null);
  const openSky = useStore((s) => s.openSky);
  const stacked = useMediaQuery(STACKED_QUERY);
  const [panelEl, setPanelEl] = useState<HTMLDivElement | null>(null);
  const e = skyById(id);
  const shown = !!e && skyShownAt(e, year);

  useEffect(() => {
    if (id && !covered && e && !shown) openSky(null);
  }, [id, covered, e, shown, openSky]);
  useEffect(() => {
    if (!id || covered) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") openSky(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, covered, openSky]);

  if (!e || covered || !shown) return null;
  return (
    <>
    {!stacked && <CardResizer panel={panelEl} />}
    <div ref={setPanelEl} className="panel info-panel sky-card" role="dialog" aria-labelledby="sky-card-title">
      <div className="info-head">
        <NowStepper />
        <div className="card-head" style={{ "--cat": SKY_STYLE.color } as CSSProperties}>
          <SkyBadge />
          <div className="card-head-text">
            <div className="card-eyebrow-row">
              <div className="card-eyebrow">
                <span>In the sky</span>
                <span className="card-eyebrow-sep" aria-hidden="true">·</span>
                <span>{SKY_KIND_NAME[e.kind]}</span>
              </div>
              <div className="card-tools">
                <button className="card-tool close" onClick={() => openSky(null)} aria-label="Close card" title="Close (Esc)">
                  <CardIcon name="close" size={16} />
                </button>
              </div>
            </div>
            <h2 id="sky-card-title" className="card-title">{e.name}</h2>
            <div className="card-sub">
              <span>{e.date_text}</span>
              {e.certainty && <span className="sky-certainty">{e.certainty}</span>}
            </div>
          </div>
        </div>
      </div>
      <div className="card-actions">
        <CardAction icon="page" label="Sky page" title="Everything in the sky, on its own page" onClick={() => (window.location.hash = `#/sky/${encodeURIComponent(e.id)}`)} />
      </div>
      <SkyPicture e={e} animated />
      <ListenButton entity={e} />
      <p className="card-desc">{e.description}</p>
      <section className="card-site" aria-label="How it is shown">
        <h3 className="card-section-title">In the atlas</h3>
        <div className="card-site-note">{skyNote(e)}</div>
      </section>
      {!isTouring && <TourStopLinks entityId={e.id} />}
      <SourcesDisclosure>
        <div className="card-ref-group">
          <div className="card-ref-title">{e.name}</div>
          <div>
            <a href={e.source.url} target="_blank" rel="noreferrer">
              {e.source.label}
            </a>
          </div>
        </div>
      </SourcesDisclosure>
    </div>
    </>
  );
}
