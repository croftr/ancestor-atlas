import type { ReactNode } from "react";

/**
 * Small pictograms for the jump-to chips under the time slider. Drawn on a 16×16 grid in
 * currentColor, so each chip can tint its icon (stone grey, ochre, wheat gold, bronze…).
 */
export type EraIconName =
  | "skull"
  | "footprints"
  | "handaxe"
  | "migration"
  | "fire"
  | "cave-animal"
  | "wheat"
  | "dagger"
  | "pyramid"
  | "coin";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.3, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const ICONS: Record<EraIconName, ReactNode> = {
  // Early hominin skull in profile: brow ridge, eye socket, jutting face.
  skull: (
    <>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M2.6 8.6C2.6 4.9 5.2 2.6 8.6 2.6c3 0 5 2 5 4.8 0 .9-.3 1.6-.8 2.1l.5 1.4-1 .4v1.4c0 .5-.4.9-.9.9H9.6l-.4-1.3H7.5c-.6 1-1.6 1.4-2.6 1.1C3.5 13 2.6 11.2 2.6 8.6zM10.6 6.6a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5z"
      />
    </>
  ),
  // Laetoli-style footprints, for the first modern humans.
  footprints: (
    <g fill="currentColor">
      <ellipse cx="5.2" cy="10.4" rx="1.7" ry="2.9" transform="rotate(-12 5.2 10.4)" />
      <circle cx="5.9" cy="6.5" r="0.75" />
      <ellipse cx="10.8" cy="6" rx="1.7" ry="2.9" transform="rotate(12 10.8 6)" />
      <circle cx="10.1" cy="2.1" r="0.75" />
    </g>
  ),
  // Knapped hand axe with flake scars.
  handaxe: (
    <g {...stroke}>
      <path d="M8 1.6c2.5 2.4 4.1 5.7 4.1 8.4 0 2.5-1.8 4.3-4.1 4.3s-4.1-1.8-4.1-4.3c0-2.7 1.6-6 4.1-8.4z" />
      <path d="M8 1.6 7.2 6l1.3 3.2-.7 5.1M5.1 7.3l2.1-1.3M10.9 7.8 8.5 9.2M4.1 11.2l3.9-1.4" strokeWidth="1" />
    </g>
  ),
  // A dotted route heading out and away.
  migration: (
    <g {...stroke}>
      <circle cx="3" cy="13" r="1.4" fill="currentColor" stroke="none" />
      <path d="M4.6 11.6C6 8 8.6 5.2 12.6 3.6" strokeDasharray="1.5 1.9" />
      <path d="M10 2.6l3.2.9-1.2 3" />
    </g>
  ),
  // Hearth fire, with an inner tongue cut out.
  fire: (
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M8 1.2c.5 2.6 3.9 4 3.9 7.8a3.9 3.9 0 0 1-7.8 0c0-1.9 1-3 1.9-4 .2 1.3.8 2.1 1.6 2.4C7.2 5.5 7.3 3.3 8 1.2zM8 9.2c-.9 1-1.5 1.7-1.5 2.7a1.5 1.5 0 0 0 3 0c0-1-.6-1.8-1.5-2.7z"
    />
  ),
  // A painted bison, Lascaux style: big shoulder hump, head low, short horn.
  "cave-animal": (
    <g fill="currentColor">
      <path d="M2.6 7.6C3 6.4 4.3 5.7 6 5.4c1-1.4 2.6-2 4.2-1.8 1.4.2 2.4 1 2.9 2.2l1 2.7-.8.7-1.2-.3-.4 1.3.3 2.9h-1.2l-.8-2.6c-1.2.4-2.6.5-4 .2l-.5 2.4H4.4l.1-2.9c-1.2-.5-1.9-1.4-1.9-2.6z" />
      <path d="M12.6 5.1c.2-.8.7-1.2 1.4-1.3-.2.5-.3.9-.2 1.5z" />
      <path d="M2.7 7.4c-.7.2-1.1.8-1.2 1.6" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
    </g>
  ),
  // An ear of wheat.
  wheat: (
    <g fill="currentColor">
      <path d="M8 1.1c1 .9 1 2.5 0 3.4-1-.9-1-2.5 0-3.4z" />
      {[0, 2.8, 5.6].map((dy) => (
        <g key={dy} transform={`translate(0 ${dy})`}>
          <path d="M7.6 6.6C5.9 6.7 4.7 5.8 4.5 4.2c1.7-.1 2.9.8 3.1 2.4z" />
          <path d="M8.4 6.6c1.7.1 2.9-.8 3.1-2.4-1.7-.1-2.9.8-3.1 2.4z" />
        </g>
      ))}
      <path d="M8 4.8v10" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </g>
  ),
  // Cast bronze dagger.
  dagger: (
    <g>
      <path fill="currentColor" d="M8 1.2l1.5 2V10h-3V3.2z" />
      <path d="M8 2.8v6.6" stroke="rgba(0,0,0,0.35)" strokeWidth="0.7" />
      <path {...stroke} d="M4.8 10.5h6.4M8 10.8v2.4" strokeWidth="1.4" />
      <circle cx="8" cy="14.1" r="1" fill="currentColor" />
    </g>
  ),
  // The Great Pyramid with its shaded face.
  pyramid: (
    <>
      <path {...stroke} d="M1.8 13.2h12.4M8 2.8 2.6 13.2h10.8z" />
      <path fill="currentColor" d="M8 2.8l5.4 10.4H9.4z" />
    </>
  ),
  // A stamped coin: rim and a lion-head blob, as on Lydian electrum.
  coin: (
    <>
      <circle {...stroke} cx="8" cy="8" r="5.6" />
      <circle fill="currentColor" cx="8" cy="8" r="2.6" />
    </>
  ),
};

export default function EraIcon({ name, size = 15 }: { name: EraIconName; size?: number }) {
  return (
    <svg className="era-icon" viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}
