import { useStore } from "../store";
import { SKY_EVENTS, skyShownAt, type SkyEvent } from "./sky";

/**
 * Supernovae and comets of the slider's moment (sky.ts), on the star background (map/SpaceBackground.tsx):
 * plain elements drawn with CSS, faded in and out as the slider passes. The background is not a real sky,
 * so each kind has a fixed place in its upper part, clear of the globe; the comet's tail points away from
 * the globe. A dated supernova shines steadily; one known only to a span of time flares now and then.
 * Hidden from assistive tech with the background; the climate panel names them ("In the sky").
 */
export default function SkyObjects() {
  const year = useStore((s) => s.year);
  return (
    <div className="space-sky">
      {SKY_EVENTS.map((e) => (
        <SkyObject key={e.id} e={e} on={skyShownAt(e, year)} />
      ))}
    </div>
  );
}

function SkyObject({ e, on }: { e: SkyEvent; on: boolean }) {
  const cls = `sky-object sky-${e.kind}${e.span ? " sky-span" : ""}${on ? " on" : ""}`;
  if (e.kind === "comet")
    return (
      <div className={cls}>
        <span className="sky-comet-tail" />
        <span className="sky-comet-head" />
      </div>
    );
  return (
    <div className={cls}>
      <span className="sky-supernova-glow" />
    </div>
  );
}
