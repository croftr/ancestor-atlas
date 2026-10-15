import { useEffect, useRef, useState } from "react";
import { climateColor, climateWords, kaOf, useClimate, valueAt } from "../time/climate";
import { formatYear, yearAtPos } from "../time/scale";

/**
 * A band under the time slider coloured by the LR04 δ18O stack: ice blue in ice ages, amber when warm,
 * along the slider's own (uneven) time scale. Blank before the record (5.32 Ma). Hovering marks the spot
 * and says what the climate was; a click (`onPick`: the year there and its position, 0–1) opens the
 * climate popover. From the keyboard it opens on the slider's year.
 */
export default function ClimateStrip({ onPick }: { onPick: (year: number | null, pos: number) => void }) {
  const climate = useClimate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [tip, setTip] = useState("");
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx || !climate || width === 0) return;
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    el.width = width * dpr;
    el.height = 1;
    ctx.clearRect(0, 0, el.width, 1);
    for (let x = 0; x < el.width; x++) {
      const v = valueAt(climate.d18o, kaOf(yearAtPos((x + 0.5) / el.width)));
      if (v === undefined) continue;
      ctx.fillStyle = climateColor(v);
      ctx.fillRect(x, 0, 1, 1);
    }
  }, [climate, width]);

  const posOf = (clientX: number) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  };
  const describe = (clientX: number) => {
    const el = canvasRef.current;
    if (!el || !climate) return "";
    const year = yearAtPos(posOf(clientX));
    const ka = kaOf(year);
    const v = valueAt(climate.d18o, ka);
    if (v === undefined) return `${formatYear(Math.round(year))}: before the climate record`;
    const sea = valueAt(climate.sea_level, ka);
    const seaText = sea === undefined ? "" : `, sea level about ${Math.abs(Math.round(sea / 5) * 5)} m ${sea < 0 ? "lower" : "higher"} than today`;
    return `${formatYear(Math.round(year))}: ${climateWords(v).toLowerCase()}${seaText}`;
  };

  return (
    <button
      type="button"
      className="climate-strip"
      title={tip ? `${tip}. Click for more.` : "Climate: ice blue in ice ages, amber when warm. Click for details."}
      aria-label="Climate through time: open details for the slider's year"
      onPointerMove={(e) => {
        setTip(describe(e.clientX));
        setHover(posOf(e.clientX));
      }}
      onPointerLeave={() => {
        setTip("");
        setHover(null);
      }}
      onClick={(e) => {
        // A real click points at a moment; Enter/Space (detail 0) opens on the slider's year.
        if (e.detail === 0) onPick(null, -1);
        else {
          const pos = posOf(e.clientX);
          onPick(yearAtPos(pos), pos);
        }
      }}
    >
      <canvas ref={canvasRef} aria-hidden="true" />
      {/* In the stretch before the record begins (5.32 Ma). */}
      <span className="climate-label" aria-hidden="true">Climate</span>
      {hover !== null && <span className="climate-hover" style={{ left: `${hover * 100}%` }} aria-hidden="true" />}
    </button>
  );
}
