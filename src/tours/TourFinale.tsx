import { useEffect, useState } from "react";
import { useStore } from "../store";

/** Once the tour has ended, the title stays this long while the view goes back to normal, then fades out over LEAVE_MS. */
const LINGER_MS = 900;
const LEAVE_MS = 700;

/**
 * The tour's title over the globe at the very end, in the style of the "40,000 years later" captions
 * (TimeGap.tsx): it comes up on the outro's last note (TourPlayer.tsx) and fades away as the tour ends
 * and the time bar, climate panels and end card go back to how they are outside a tour.
 */
export default function TourFinale() {
  const finale = useStore((s) => s.tourFinale);
  const touring = useStore((s) => s.tour !== null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => setLeaving(false), [finale?.key]);
  useEffect(() => {
    if (!finale || touring) return;
    const leave = window.setTimeout(() => setLeaving(true), LINGER_MS);
    const gone = window.setTimeout(() => useStore.setState({ tourFinale: null }), LINGER_MS + LEAVE_MS);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(gone);
    };
  }, [finale, touring]);

  if (!finale) return null;
  return (
    <div className="tour-gap-wrap tour-finale-wrap" aria-hidden="true">
      <div key={finale.key} className={`tour-gap tour-finale${leaving ? " leaving" : ""}`}>
        {finale.title}
      </div>
    </div>
  );
}
