import type { ReactNode } from "react";
import { CATEGORY_STYLE } from "../config";
import type { Category } from "../types";

/**
 * One icon per category, shared by the side menu and the badge before an entity's name, so the
 * two always match. Line drawings on a 24×24 grid, kept simple enough to read at 14px.
 */
export const CATEGORY_GLYPH: Record<Category, ReactNode> = {
  // An early hominin's head in profile: low forehead, heavy brow ridge, jutting muzzle, no chin.
  species: (
    <>
      <path d="M16 21v-3.5c3-1.2 4.5-3.9 4.2-6.9-.4-4.2-3.7-6.8-7.7-6.8-3.2 0-5.3 1.6-6 3.8L3.8 9.2c-.2 1.2 1.2 1.4 1.2 1.4l.2.8L3 14.2c0 1.4 1.6 1.4 1.6 1.4h1c.4 2 2.9 2 2.9 2l2.3-.2.4 3.6" />
      <path d="M14.3 9.8c1.2 0 1.7 1.8.6 2.6" />
      <path d="M7 10.2h.01" strokeWidth="2.8" />
    </>
  ),
  // A clay pot with a band of decoration.
  culture: (
    <>
      <path d="M9.2 3.8h5.6M10.2 3.8v2.6C7.1 7.7 5.2 10.4 5.6 13.8c.5 3.9 3.3 6.7 6.4 6.7s5.9-2.8 6.4-6.7c.4-3.4-1.5-6.1-4.6-7.4V3.8" />
      <path d="M6.2 12.4h11.6" strokeOpacity="0.65" />
    </>
  ),
  // A temple front: pediment over columns.
  civilization: (
    <>
      <path d="M3.5 20.5h17M5 20.5V10M9.7 20.5V10M14.3 20.5V10M19 20.5V10" />
      <path d="M3 9.5 12 4l9 5.5z" />
    </>
  ),
  // A starburst: a moment in time.
  event: (
    <>
      <circle cx="12" cy="12" r="2.6" />
      <path d="M12 2.8v4M12 17.2v4M2.8 12h4M17.2 12h4M5.5 5.5l2.8 2.8M15.7 15.7l2.8 2.8M5.5 18.5l2.8-2.8M15.7 8.3l2.8-2.8" />
    </>
  ),
};

export const CategoryIcon = ({ category, size = 22, strokeWidth = 1.7 }: { category: Category; size?: number; strokeWidth?: number }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    {CATEGORY_GLYPH[category]}
  </svg>
);

const SINGULAR: Record<Category, string> = { species: "Species", culture: "Culture", civilization: "Civilization", event: "Event" };

/**
 * The category as a round badge in its colour, set before an entity's name in place of a
 * "Species" / "Cultures" chip on a line of its own. The word stays as its tooltip and label.
 */
export const CategoryBadge = ({ category }: { category: Category }) => {
  const style = CATEGORY_STYLE[category];
  const word = SINGULAR[category];
  return (
    <span className="cat-badge" style={{ background: style.color }} role="img" aria-label={word} title={word}>
      <CategoryIcon category={category} size={18} strokeWidth={2} />
    </span>
  );
};
