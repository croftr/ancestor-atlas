import { useMemo } from "react";
import { STAGE_NOTES, isColdStage, kaOf, stageAt, stageName, type Climate, type Stage } from "../time/climate";
import { agoText } from "../ui/ClimatePopover";
import type { Window } from "./layout";

/** The LR04 benthic δ18O stack record starts at 5.32 Ma (5,320 ka). */
export const CLIMATE_RECORD_START = -5_318_050;

export interface ClimateRibbonStage {
  stage: string;
  fromKa: number;
  toKa: number;
  startYear: number;
  endYear: number;
  cold: boolean;
  note?: string;
}

/** Pure helper: Marine Isotope Stages that intersect the given time window. */
export function computeStagesInView(
  mis: [number, number, string][],
  winStart: number,
  winEnd: number,
): ClimateRibbonStage[] {
  const result: ClimateRibbonStage[] = [];
  for (const [fromKa, toKa, s] of mis) {
    const startYear = 1950 - toKa * 1000;
    // MIS 1 (Holocene) continues through the present day.
    const endYear = s === "1" ? Math.max(1950, winEnd) : 1950 - fromKa * 1000;
    if (endYear >= winStart && startYear <= winEnd) {
      result.push({
        stage: s,
        fromKa,
        toKa,
        startYear,
        endYear,
        cold: isColdStage(s),
        note: STAGE_NOTES[s],
      });
    }
  }
  return result;
}

/** Formats a stage label according to available pixel width. */
export function stageLabel(stageNameStr: string, width: number, isCold: boolean): string {
  if (width >= 110) return `${stageName(stageNameStr)} (${isCold ? "glacial" : "warm"})`;
  if (width >= 42) return stageName(stageNameStr);
  if (width >= 18) return stageNameStr;
  return "";
}

/**
 * A thin colour-coded glacial/interglacial ribbon along the top axis of TimelinePage.
 * Even-numbered Marine Isotope Stages are cold (glacial, ice blue); odd-numbered are warm (amber).
 * Hovering highlights the stage and scrubs time; clicking opens the paleoclimate popover for that moment.
 */
export default function ClimateRibbon({
  climate,
  win,
  trackW,
  x,
  hoverYear,
  onPickStage,
}: {
  climate: Climate | null;
  win: Window;
  trackW: number;
  x: (year: number) => number;
  hoverYear: number | null;
  onPickStage?: (stage: ClimateRibbonStage, midYear: number, clickYear: number) => void;
}) {
  const stages = useMemo(() => {
    if (!climate) return [];
    return computeStagesInView(climate.mis, win.start, win.end);
  }, [climate, win.start, win.end]);

  const activeStage = useMemo(() => {
    if (!climate || hoverYear === null) return null;
    return stageAt(climate.mis, Math.max(0, kaOf(hoverYear)));
  }, [climate, hoverYear]);

  if (!climate || trackW <= 0) {
    return <div className="tl-climate-ribbon" aria-hidden="true" />;
  }

  // Region before the LR04 benthic record starts (5.32 Ma).
  const beforeRight = win.start < CLIMATE_RECORD_START ? Math.min(trackW, Math.max(0, x(CLIMATE_RECORD_START))) : 0;

  return (
    <div
      className="tl-climate-ribbon"
      role="region"
      aria-label="Marine Isotope Stages paleoclimate ribbon (ice blue: glacial cold; amber: interglacial warm)"
    >
      {beforeRight > 0 && (
        <div
          className="tl-climate-stage before-record"
          style={{ left: 0, width: beforeRight }}
          title="Before the LR04 climate record (0–5.32 Ma)"
          aria-hidden="true"
        >
          {beforeRight >= 80 && <span className="tl-climate-stage-label muted">Before 5.32 Ma</span>}
        </div>
      )}
      {stages.map((s) => {
        const rawLeft = x(s.startYear);
        const rawRight = x(s.endYear);
        const left = Math.max(0, rawLeft);
        const right = Math.min(trackW, rawRight);
        const width = Math.max(1, right - left);
        if (width <= 0) return null;

        const isActive = activeStage?.stage === s.stage;
        const kind = s.cold ? "glacial / cold" : "interglacial / warm";
        const range = `${agoText(s.toKa, true).replace(" ago", "")} to ${agoText(s.fromKa, true)}`;
        const title = `${stageName(s.stage)} (${kind}): ${range}${s.note ? `\n${s.note}` : ""}\nClick for paleoclimate details.`;
        const midYear = Math.round((s.startYear + s.endYear) / 2);
        const label = stageLabel(s.stage, width, s.cold);

        return (
          <button
            key={s.stage}
            type="button"
            className={`tl-climate-stage ${s.cold ? "cold" : "warm"}${isActive ? " active" : ""} climate-open`}
            style={{ left, width }}
            title={title}
            aria-label={`${stageName(s.stage)}, ${kind}, ${range}`}
            tabIndex={width >= 18 ? 0 : -1}
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              const clickFraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / Math.max(1, rect.width)));
              const clickYear = Math.round(s.startYear + clickFraction * (s.endYear - s.startYear));
              onPickStage?.(s, midYear, clickYear);
            }}
          >
            {label && <span className="tl-climate-stage-label">{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
