import { useEffect, useRef } from "react";
import { useStore } from "../store";
import { STAGE_NOTES, climateAt, climateColor, climateWords, stageName, type Climate } from "../time/climate";
import { formatYear, snapYear } from "../time/scale";

/** Rounds to `n` significant figures. */
const sig = (v: number, n: number) => {
  const unit = 10 ** (Math.floor(Math.log10(Math.abs(v))) - n + 1);
  return Math.round(v / unit) * unit;
};

/**
 * "22,000 years ago", "1.24 million years ago": ages in ka as plain words, to the precision the
 * records have (3 significant figures; 2 for `short`, as on the chart's axis).
 */
export function agoText(ka: number, short = false): string {
  if (ka < 0.5) return "today";
  const years = sig(ka * 1000, short ? 2 : 3);
  if (years >= 1_000_000) return `${+(years / 1e6).toFixed(short ? 1 : 2)} million years ago`;
  return `${years.toLocaleString("en-US")} years ago`;
}

const signed = (v: number, unit: string, digits = 0) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)} ${unit}`;

/**
 * The chart's window around an age (ka): wide enough to show a few stages either side, so the
 * moment sits inside its glacial cycle.
 */
export function chartWindow(ka: number, max: number): [number, number] {
  const width = Math.min(1200, Math.max(40, ka * 1.2));
  let from = Math.max(0, ka - width / 2);
  const to = Math.min(max, from + width);
  from = Math.max(0, to - width);
  return [from, to];
}

const W = 300, H = 84, PAD = { l: 30, r: 6, t: 6, b: 16 };

/**
 * A small chart around the moment: global temperature where it is reconstructed, otherwise δ18O
 * (drawn upside down, so up is still warmer), over the cold stages shaded blue, with the moment marked.
 */
function MiniChart({ climate, ka }: { climate: Climate; ka: number }) {
  const max = climate.d18o.at(-1)![0];
  const [from, to] = chartWindow(ka, max);
  const tRows = climate.temperature.filter(([k]) => k >= from && k <= to);
  const useT = tRows.length > 5 && to <= climate.temperature.at(-1)![0];
  const rows = useT ? tRows : climate.d18o.filter(([k]) => k >= from && k <= to);
  if (rows.length < 2) return null;
  // Up is warmer: temperature as is, δ18O negated.
  const vals = rows.map(([, v]) => (useT ? v : -v));
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi - lo < 1e-6) (lo -= 1), (hi += 1);
  const x = (k: number) => PAD.l + ((to - k) / (to - from)) * (W - PAD.l - PAD.r); // older on the left
  const y = (v: number) => PAD.t + ((hi - v) / (hi - lo)) * (H - PAD.t - PAD.b);
  const path = rows.map(([k], i) => `${i ? "L" : "M"}${x(k).toFixed(1)},${y(vals[i]).toFixed(1)}`).join("");
  const cold = climate.mis.filter(([a, b, s]) => b > from && a < to && Number(s.match(/\d+$/)?.[0] ?? 1) % 2 === 0);
  const unit = useT ? "°C" : "δ18O";
  const tick = (v: number) => {
    if (!useT) return (-v).toFixed(1);
    const r = Math.round(v);
    return `${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r)}`;
  };
  return (
    <svg className="cp-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${useT ? "Global temperature" : "δ18O"} from ${agoText(to)} to ${agoText(from)}`}>
      {cold.map(([a, b, s]) => (
        <rect key={s} className="cp-cold" x={x(Math.min(b, to))} y={PAD.t} width={Math.max(0, x(Math.max(a, from)) - x(Math.min(b, to)))} height={H - PAD.t - PAD.b} />
      ))}
      {useT && lo < 0 && hi > 0 && <line className="cp-zero" x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} />}
      <path className="cp-line" d={path} />
      <line className="cp-now" x1={x(ka)} x2={x(ka)} y1={PAD.t - 2} y2={H - PAD.b + 2} />
      <text className="cp-axis" x={PAD.l - 4} y={PAD.t + 8} textAnchor="end">{tick(hi)}</text>
      <text className="cp-axis" x={PAD.l - 4} y={H - PAD.b} textAnchor="end">{tick(lo)}</text>
      <text className="cp-axis" x={2} y={(H - PAD.b) / 2 + 4}>{unit}</text>
      <text className="cp-axis" x={PAD.l} y={H - 3}>{agoText(to, true)}</text>
      <text className="cp-axis" x={W - PAD.r} y={H - 3} textAnchor="end">{agoText(from, true)}</text>
    </svg>
  );
}

/**
 * The climate at one moment, over the time slider: global temperature, sea level, the Marine Isotope
 * Stage, and a small chart of the glacial cycles around it. Opened from the climate strip (a fixed
 * moment) or the stage readout under the year (`year` null: follows the slider).
 */
export default function ClimatePopover({
  climate,
  year: fixedYear,
  left,
  onClose,
}: {
  climate: Climate;
  year: number | null;
  /** Where to point, as a fraction of the slider's width. */
  left: number;
  onClose: () => void;
}) {
  const sliderYear = useStore((s) => s.year);
  const setYear = useStore((s) => s.setYear);
  const year = fixedYear ?? sliderYear;
  const at = climateAt(climate, year);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (e.stopPropagation(), onClose());
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (ref.current?.contains(t) || t?.closest(".climate-strip, .climate-open")) return;
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onDown);
    ref.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [onClose]);

  const stage = at.stage;
  const note = stage && STAGE_NOTES[stage.stage];
  const target = snapYear(Math.round(year));

  return (
    <div
      ref={ref}
      className="climate-popover"
      role="dialog"
      aria-label={`Climate ${formatYear(Math.round(year))}`}
      tabIndex={-1}
      style={{ "--at": `${Math.min(92, Math.max(8, left * 100))}%` } as React.CSSProperties}
    >
      <button className="cp-close" onClick={onClose} aria-label="Close">✕</button>
      <div className="cp-when">
        {formatYear(Math.round(year))}
        {/* Deep time already reads "… million years ago". */}
        {at.ka < 1000 && <span className="muted"> · {agoText(at.ka)}</span>}
      </div>
      {at.d18o !== undefined && (
        <div className="cp-state">
          <span className="cp-swatch" style={{ background: climateColor(at.d18o) }} />
          {climateWords(at.d18o)}
        </div>
      )}

      <dl className="cp-facts">
        <div>
          <dt>Global temperature</dt>
          {at.temperature !== undefined ? (
            <dd>
              <strong>{signed(at.temperature, "°C", 1)}</strong>
              <span className="muted">compared with pre-industrial times</span>
            </dd>
          ) : (
            <dd className="muted">Not reconstructed this far back (the records used here reach 783,000 years).</dd>
          )}
        </div>
        <div>
          <dt>Sea level</dt>
          {at.sea ? (
            <dd>
              <strong>{signed(Math.round(at.sea.m), "m")}</strong>
              <span className="muted">
                {at.sea.lo !== undefined && at.sea.hi !== undefined
                  ? `compared with today (95% range ${signed(Math.round(at.sea.lo), "m")} to ${signed(Math.round(at.sea.hi), "m")})`
                  : "compared with today, as drawn on the globe"}
              </span>
            </dd>
          ) : (
            <dd className="muted">Not reconstructed this far back (the record used here reaches 798,000 years).</dd>
          )}
        </div>
        {stage && (
          <div>
            <dt>Marine Isotope Stage</dt>
            <dd>
              <strong>{stageName(stage.stage)}</strong>
              <span className={`cp-stage-kind ${stage.cold ? "cold" : "warm"}`}>{stage.cold ? "cold (glacial)" : "warm"}</span>
              <span className="muted">
                {agoText(stage.to).replace(" ago", "")} to {agoText(stage.from)}
              </span>
              {note && <span className="cp-note">{note}</span>}
            </dd>
          </div>
        )}
      </dl>

      <MiniChart climate={climate} ka={at.ka} />
      <div className="cp-legend muted">
        <span className="cp-key cold" /> cold stages · up is warmer
      </div>

      <div className="cp-foot">
        {fixedYear !== null && target !== sliderYear && (
          <button className="tl-btn" onClick={() => (setYear(target), onClose())}>
            Go to {formatYear(target)}
          </button>
        )}
        <span className="muted cp-src">
          Marine Isotope Stages split the record by ice volume in deep-sea cores: even numbers cold, odd warm. Sources in
          the side menu's Sources.
        </span>
      </div>
    </div>
  );
}
