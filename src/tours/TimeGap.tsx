import { useEffect, useState } from "react";
import { useStore } from "../store";
import { gapWords } from "./epilogue";

/**
 * The caption stays this long after the slider arrives (through the globe's turn: the slider's trip
 * can be as short as 1.5 s), then fades out over LEAVE_MS.
 */
const LINGER_MS = 1_600;
const LEAVE_MS = 700;

/**
 * While a tour's slider travels from one stop to the next: how much time passes, over the globe, as
 * a film's intertitle would ("40,000 years later"). Fades in as the slider sets off and out once the
 * globe has turned to the stop. Not shown for a cut (Back / Next) or before the first stop.
 */
export default function TimeGap() {
  const gap = useStore((s) => (s.tour?.phase === "travel" ? s.tour.gap : undefined));
  const index = useStore((s) => s.tour?.index);
  const [shown, setShown] = useState<{ text: string; key: number; leaving: boolean } | null>(null);

  useEffect(() => {
    if (gap !== undefined) {
      setShown({ text: gapWords(gap), key: index ?? 0, leaving: false });
      return;
    }
    const leave = window.setTimeout(() => setShown((s) => (s && !s.leaving ? { ...s, leaving: true } : s)), LINGER_MS);
    const gone = window.setTimeout(() => setShown((s) => (s?.leaving ? null : s)), LINGER_MS + LEAVE_MS);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(gone);
    };
  }, [gap, index]);

  if (!shown) return null;
  return (
    <div className="tour-gap-wrap" aria-hidden="true">
      <div key={shown.key} className={`tour-gap${shown.leaving ? " leaving" : ""}`}>
        {shown.text}
      </div>
    </div>
  );
}
