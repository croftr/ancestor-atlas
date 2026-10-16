import { useStore } from "../store";
import { STACKED_QUERY } from "../config";
import { useClimate } from "../time/climate";
import { ClimateFacts } from "./ClimatePopover";
import { useMediaQuery } from "./useMediaQuery";

/**
 * The climate popover's details kept open under the legend, following the slider as time plays and
 * through tours. Turned on in Settings; desktop only (small screens have no room for it).
 */
export default function ClimatePanel() {
  const on = useStore((s) => s.climatePanel);
  const setOn = useStore((s) => s.setClimatePanel);
  const year = useStore((s) => s.year);
  const stacked = useMediaQuery(STACKED_QUERY);
  const climate = useClimate();
  if (!on || stacked || !climate) return null;
  return (
    <section className="panel climate-panel" aria-label="Climate">
      <button className="cp-close" onClick={() => setOn(false)} aria-label="Close the climate panel" title="Close (turn back on in Settings)">
        ✕
      </button>
      <ClimateFacts climate={climate} year={year} />
    </section>
  );
}
