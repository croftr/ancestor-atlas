import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useStore } from "../store";
import { CARD_MIN, clampCardWidth, maxCardWidth } from "./cardWidth";
import "./card-resizer.css";

const STEP = 24;
const clamp = clampCardWidth;

/**
 * A drag handle on the info card's left edge (desktop only; hidden where the card stacks): drag to
 * make the card wider or narrower, double-click to put it back. Arrow keys work when it has focus.
 * The width is kept in the store for the visit (`cardWidth`), not across reloads. It sits beside
 * the card rather than in it (the card scrolls), matched to the card's height.
 */
export default function CardResizer({ panel }: { panel: HTMLElement | null }) {
  const cardWidth = useStore((s) => s.cardWidth);
  const setCardWidth = useStore((s) => s.setCardWidth);
  const [height, setHeight] = useState<number>();
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; w: number } | null>(null);

  // Follow the card's height (it changes with its content).
  useLayoutEffect(() => {
    if (!panel) return;
    const ro = new ResizeObserver(() => setHeight(panel.offsetHeight));
    ro.observe(panel);
    setHeight(panel.offsetHeight);
    return () => ro.disconnect();
  }, [panel]);

  const current = () => panel?.getBoundingClientRect().width ?? cardWidth ?? 352;
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, w: current() };
    setDragging(true);
    document.body.classList.add("card-resizing");
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d) setCardWidth(clamp(d.w + d.x - e.clientX)); // the card's left edge: left is wider
  };
  const end = () => {
    drag.current = null;
    setDragging(false);
    document.body.classList.remove("card-resizing");
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? STEP * 4 : STEP;
    if (e.key === "ArrowLeft") setCardWidth(clamp(current() + step));
    else if (e.key === "ArrowRight") setCardWidth(clamp(current() - step));
    else if (e.key === "Home") setCardWidth(null);
    else return;
    // Keep the arrows from the time slider and tours (they listen on the window).
    e.preventDefault();
    e.stopPropagation();
  };

  const width = Math.round(cardWidth ?? current());
  return (
    <div
      className={`card-resize${dragging ? " dragging" : ""}`}
      style={height ? { height } : undefined}
      role="separator"
      aria-orientation="vertical"
      aria-label="Card width"
      aria-valuenow={width}
      aria-valuemin={CARD_MIN}
      aria-valuemax={maxCardWidth()}
      tabIndex={0}
      title="Drag to resize the card · double-click to reset"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onDoubleClick={() => setCardWidth(null)}
      onKeyDown={onKeyDown}
    >
      <span className="card-resize-grip" aria-hidden="true" />
    </div>
  );
}
