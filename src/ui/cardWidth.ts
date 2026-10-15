/**
 * The info card's width on desktop, as the CSS sets it (`--card-w` in ui/sidenav.css): 352px, or
 * the width dragged with its handle (CardResizer.tsx), kept between 300px and the window less
 * the nav rail and 480px left for the globe or chart.
 */
export const CARD_DEFAULT = 352;
export const CARD_MIN = 300;
/** Room always left beside the card for the globe or the timeline chart. */
export const CARD_LEAVE = 480;

/** The nav rail's width (`--nav-w`), 0 where it is hidden. */
export function navWidth(): number {
  const app = document.querySelector(".app");
  return app ? parseFloat(getComputedStyle(app).getPropertyValue("--nav-w")) || 0 : 0;
}

/** The widest the card may be in this window. */
export const maxCardWidth = () => Math.max(CARD_MIN, window.innerWidth - navWidth() - CARD_LEAVE);

/** A width kept within the card's limits. */
export const clampCardWidth = (w: number) => Math.round(Math.min(maxCardWidth(), Math.max(CARD_MIN, w)));

/** The card's width now: as dragged (`cardWidth` in the store) or the default, within the limits. */
export const cardWidthPx = (cardWidth: number | null) => clampCardWidth(cardWidth ?? CARD_DEFAULT);
