import { useEffect, useRef, useState } from "react";
import { climateColor, climateWords, kaOf, useClimate, valueAt } from "../time/climate";
import { formatYear, yearAtPos } from "../time/scale";

/**
 * A thin band under the time slider coloured by the LR04 δ18O stack: ice blue in ice ages, amber when
 * warm, along the slider's own (uneven) time scale. Blank before the record (5.32 Ma). Hovering says
 * what the climate was and, within the last 800,000 years, the sea level.
 */
export default function ClimateStrip() {
  const climate = useClimate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [tip, setTip] = useState("");

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

  const describe = (clientX: number) => {
    const el = canvasRef.current;
    if (!el || !climate) return "";
    const r = el.getBoundingClientRect();
    const year = yearAtPos(Math.min(1, Math.max(0, (clientX - r.left) / r.width)));
    const ka = kaOf(year);
    const v = valueAt(climate.d18o, ka);
    if (v === undefined) return `${formatYear(Math.round(year))}: before the climate record`;
    const sea = valueAt(climate.sea_level, ka);
    const seaText = sea === undefined ? "" : `, sea level about ${Math.abs(Math.round(sea / 5) * 5)} m ${sea < 0 ? "lower" : "higher"} than today`;
    return `${formatYear(Math.round(year))}: ${climateWords(v).toLowerCase()}${seaText}`;
  };

  return (
    <div className="climate-strip" title={tip || "Climate: ice blue in ice ages, amber when warm (LR04 δ18O)"}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        onPointerMove={(e) => setTip(describe(e.clientX))}
        onPointerLeave={() => setTip("")}
      />
    </div>
  );
}
