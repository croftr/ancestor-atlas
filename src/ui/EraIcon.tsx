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
  | "hut"
  | "wheat"
  | "dagger"
  | "column"
  | "amphora";

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
  // Laetoli-style footprints: Lucy's kind walked upright.
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
  // Round house, as in the first Natufian villages.
  hut: (
    <g {...stroke}>
      <path d="M3.5 13V9.6a4.5 4.5 0 0 1 9 0V13" />
      <path d="M2 13h12M6.9 13v-2.3a1.1 1.1 0 0 1 2.2 0V13M3.9 7.9h8.2" />
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
  // A column of Persepolis.
  column: (
    <g {...stroke}>
      <path d="M3 3.3c1.2 0 1.6-1.2 2.5-1.2h5c.9 0 1.3 1.2 2.5 1.2M4.5 4.6h7M5.8 4.6v8.3M8 4.6v8.3M10.2 4.6v8.3M3.8 13.4h8.4" />
    </g>
  ),
  // Roman amphora.
  amphora: (
    <g {...stroke}>
      <path d="M6.6 1.8h2.8M7.1 1.8v2.1C5.5 4.8 4.7 6.4 4.7 8.6c0 2.3 1.3 4 3.3 5.6 2-1.6 3.3-3.3 3.3-5.6 0-2.2-.8-3.8-2.4-4.7V1.8" />
      <path d="M7.1 3.3 5.4 3c-.5 0-.8.5-.6 1l.8 1.8M8.9 3.3l1.7-.3c.5 0 .8.5.6 1l-.8 1.8" strokeWidth="1" />
    </g>
  ),
};

export default function EraIcon({ name, size = 15 }: { name: EraIconName; size?: number }) {
  return (
    <svg className="era-icon" viewBox="0 0 16 16" width={size} height={size} aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}
