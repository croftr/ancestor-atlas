import { PLAIN_COLOR } from "./haplogroups";

/** A double helix on a 24×24 grid: two strands crossing twice, with four base-pair rungs. */
export const DnaIcon = ({ size = 22 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden>
    <path strokeWidth={2.2} d="M7 2C7 7 17 7 17 12S7 17 7 22M17 2C17 7 7 7 7 12S17 17 17 22" />
    <path strokeWidth={1.6} d="M8.3 4H15.7M8.3 10H15.7M8.3 14H15.7M8.3 20H15.7" />
  </svg>
);

/** The ancient DNA layer as a round badge, matching the category badges in the legend and on cards. */
export const DnaBadge = ({ size = 22 }: { size?: number }) => (
  <span className="cat-badge" style={{ background: PLAIN_COLOR, color: "#241a5c", boxShadow: "0 0 0 1.5px #241a5c", width: size, height: size }} aria-hidden>
    <DnaIcon size={Math.round(size * 0.66)} />
  </span>
);
