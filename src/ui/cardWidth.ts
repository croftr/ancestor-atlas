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

/**
 * The room kept clear on the right for the open card, when centring the globe and the time slider:
 * that of a card of the default width, however wide the card is dragged, so they stay put while it
 * is resized and a wider card covers the space beside the globe. Only when the card's edge would
 * come within half of CARD_LEAVE of their centre do they move left, just enough to keep that gap.
 * The CSS does the same for the slider (`--stage-r` in ui/sidenav.css).
 */
export const stageInset = (cardWidth: number | null) =>
  Math.max(cardWidthPx(null), 2 * cardWidthPx(cardWidth) + CARD_LEAVE + navWidth() - window.innerWidth);
