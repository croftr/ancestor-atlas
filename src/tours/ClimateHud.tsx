import { useId } from "react";
import { useStore } from "../store";
import { STACKED_QUERY } from "../config";
import { climateAt, climateColor, climateWords, useClimate } from "../time/climate";
import { signed } from "../ui/ClimatePopover";
import { useMediaQuery } from "../ui/useMediaQuery";

/** The thermometer's scale (°C against pre-industrial): the records here run from −7.4 to +1. */
const T_MIN = -8;
const T_MAX = 2;
/** The sea-level section's scale (m against today): the records run from −126 to +19. */
const SEA_MIN = -130;
const SEA_MAX = 20;

/**
 * While a tour plays (desktop), the climate of the slider's moment takes the search bar's place at the
 * top: a thermometer and a cross-section of a coast with the sea of the time. The climate panel then
 * leaves those facts out (ClimatePanel.tsx). Shown at every stop of every tour (Rob's call), not only
 * during the title card or behind the "Start tour" gate; where a record doesn't reach (temperature
 * before 783,000 years ago, sea level before 798,000) its gauge dims and says so.
 */
export function useClimateHud(): boolean {
  const showing = useStore((s) => !!s.tour && !s.tour.intro && !s.tour.gate);
  const stacked = useMediaQuery(STACKED_QUERY);
  const climate = useClimate();
  return showing && !stacked && !!climate;
}

/** Ice blue (cold) through slate to amber (warm), by °C against pre-industrial. */
function tempColor(t: number): string {
  const stops: [number, [number, number, number]][] = [
    [-7, [150, 205, 255]],
    [-3, [120, 140, 190]],
    [1, [240, 150, 72]],
  ];
  const v = Math.min(stops[2][0], Math.max(stops[0][0], t));
  const i = v <= stops[1][0] ? 0 : 1;
  const [s0, c0] = stops[i];
  const [s1, c1] = stops[i + 1];
  const k = (v - s0) / (s1 - s0);
  const c = c0.map((x, j) => Math.round(x + (c1[j] - x) * k));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function Thermometer({ t }: { t: number | undefined }) {
  // Tube from y 6 to 54 (48 units), bulb below it.
  const top = 6;
  const len = 48;
  const ty = (v: number) => top + len * (1 - (v - T_MIN) / (T_MAX - T_MIN));
  const f = t === undefined ? 0 : Math.min(1, Math.max(0.02, (t - T_MIN) / (T_MAX - T_MIN)));
  const color = t === undefined ? "rgba(255, 255, 255, 0.25)" : tempColor(t);
  const ticks = [-8, -6, -4, -2, 0, 2];
  return (
    <svg className="hud-thermo" viewBox="0 0 34 72" aria-hidden="true">
      <rect className="hud-glass" x="8" y="2" width="10" height="58" rx="5" />
      <circle className="hud-glass" cx="13" cy="62" r="8" />
      {/* The column: drawn full length and scaled from the bulb up, so it rises and falls smoothly. */}
      <rect
        className="hud-thermo-fill"
        x="10.5"
        y={top}
        width="5"
        height={len + 4}
        rx="2.5"
        style={{ transform: `scaleY(${f})`, fill: color }}
      />
      <circle cx="13" cy="62" r="6" style={{ fill: color }} className="hud-thermo-bulb" />
      {ticks.map((v) => (
        <line key={v} className={v === 0 ? "hud-tick zero" : "hud-tick"} x1="20" x2={v === 0 ? 27 : 24} y1={ty(v)} y2={ty(v)} />
      ))}
      <text className="hud-tick-label" x="28" y={ty(0) + 3}>0</text>
    </svg>
  );
}

function SeaSection({ m }: { m: number | undefined }) {
  const clip = useId();
  // Height in the section: today's sea near the top, the Ice Age's lowest near the bottom.
  const sy = (v: number) => 14 + ((SEA_MAX - v) * 52) / (SEA_MAX - SEA_MIN);
  const today = sy(0);
  const level = m === undefined ? today : sy(Math.min(SEA_MAX, Math.max(SEA_MIN, m)));
  // A coast: hills on the right, the continental shelf sloping gently out under today's sea, then the deep.
  const surface = "M140,6 C126,6 114,10 104,17 C100,20 96,21 90,22 L34,58 C26,63 16,68 0,70";
  const land = `${surface} L0,72 L140,72 Z`;
  return (
    <svg className="hud-sea" viewBox="0 0 140 72" aria-hidden="true">
      {/* The band of heights between today's sea and the sea of the time. */}
      <defs>
        <clipPath id={clip}>
          <rect x="0" y={Math.min(level, today)} width="140" height={Math.abs(level - today)} />
        </clipPath>
      </defs>
      {/* The sea of the time: moved as a whole, so it rises and falls smoothly. */}
      <g className="hud-water" style={{ transform: `translateY(${level - today}px)` }}>
        <rect className="hud-water-body" x="-10" y={today} width="160" height="90" />
        <path className="hud-wave" d={`M-20,${today} q5,-1.6 10,0 t10,0 t10,0 t10,0 t10,0 t10,0 t10,0 t10,0 t10,0 t10,0 t10,0 t10,0 t10,0 t10,0 t10,0 t10,0 t10,0 t10,0`} />
      </g>
      <path className="hud-land" d={land} />
      {/* The shore that was dry then and is under the sea today (the exposed shelf), or the reverse. */}
      {m !== undefined && <path className={m < 0 ? "hud-shelf" : "hud-flooded"} d={surface} clipPath={`url(#${clip})`} />}
      <line className="hud-today" x1="0" x2="140" y1={today} y2={today} />
      <text className="hud-today-label" x="136" y={today - 3} textAnchor="end">today</text>
    </svg>
  );
}

export default function ClimateHud() {
  const on = useClimateHud();
  const year = useStore((s) => s.year);
  const climate = useClimate();
  if (!on || !climate) return null;
  const at = climateAt(climate, year);
  const t = at.temperature;
  const m = at.sea?.m;
  return (
    <div className="climate-hud" role="group" aria-label="Climate at this moment">
      <div className={`hud-gauge${t === undefined ? " no-record" : ""}`}>
        <Thermometer t={t} />
        <div className="hud-read">
          <span className="hud-label">Global temperature</span>
          <strong className="hud-value" style={t !== undefined ? { color: tempColor(t) } : undefined}>
            {t !== undefined ? signed(t, "°C", 1) : "—"}
          </strong>
          <span className="hud-sub">{t !== undefined ? "vs pre-industrial" : "no record this far back"}</span>
        </div>
      </div>
      {at.d18o !== undefined && (
        <div className="hud-state">
          <span className="hud-swatch" style={{ background: climateColor(at.d18o) }} />
          {climateWords(at.d18o)}
        </div>
      )}
      <div className={`hud-gauge${m === undefined ? " no-record" : ""}`}>
        <SeaSection m={m} />
        <div className="hud-read">
          <span className="hud-label">Sea level</span>
          <strong className="hud-value sea">{m !== undefined ? signed(Math.round(m), "m") : "—"}</strong>
          <span className="hud-sub">{m !== undefined ? "vs today" : "no record this far back"}</span>
        </div>
      </div>
    </div>
  );
}
