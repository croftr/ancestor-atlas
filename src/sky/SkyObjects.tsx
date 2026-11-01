import { type CSSProperties } from "react";
import { useStore } from "../store";
import { useNowKeys } from "../now/NowStepper";
import { SKY_EVENTS, SKY_PLACE, skyShownAt, type SkyEvent, type SkyKind } from "./sky";

const placeStyle = (e: SkyEvent) => {
  const [x, y] = SKY_PLACE[e.kind];
  return { "--sky-ox": `${x}%`, "--sky-oy": `${y}%` } as CSSProperties;
};

/**
 * Sky objects of the slider's moment (sky.ts) on the star background (map/SpaceBackground.tsx): plain
 * elements drawn with CSS, faded in and out as the slider passes. The background is not a real sky, so
 * each kind has a fixed place in its upper part (`SKY_PLACE`), clear of the globe; the comet's tail points
 * away from the globe. A dated supernova shines steadily; one known only to a span of time flares now and
 * then (steady while its card is open). The background sits under the map and takes no clicks: SkyHits,
 * over the map, makes them clickable, opening the sky object's card (SkyCard.tsx).
 */
export default function SkyObjects() {
  const year = useStore((s) => s.year);
  const open = useStore((s) => s.skyId);
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

/** The parts of each kind's drawing; the look is all CSS (index.css, "sky-"). Also the Sky page's thumbnails. */
export function SkyDrawing({ kind }: { kind: SkyKind }) {
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
 * Over the map (map/MapView.tsx): a round button on each sky object showing now, opening its card in the
 * card's usual place (SkyCard.tsx). Also listens for , and . (stepping through everything at this time).
 */
export function SkyHits() {
  const year = useStore((s) => s.year);
  const open = useStore((s) => s.skyId);
  const openSky = useStore((s) => s.openSky);
  useNowKeys();
  return (
    <>
      {SKY_EVENTS.filter((e) => skyShownAt(e, year)).map((e) => (
        <button
          key={e.id}
          type="button"
          className="sky-hit"
          style={placeStyle(e)}
          aria-label={`${e.name}, ${e.date_text}: open its card`}
          aria-pressed={open === e.id}
          title={`${e.name} (${e.date_text})`}
          onClick={() => openSky(e.id)}
        />
      ))}
    </>
  );
}
