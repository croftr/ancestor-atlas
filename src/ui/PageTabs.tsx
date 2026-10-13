import { useEffect, type CSSProperties, type ReactNode } from "react";
import { navigate, useOpenItem, useView, type View } from "../route";
import { useStore } from "../store";
import { CATEGORY_STYLE } from "../config";
import { CategoryIcon } from "./CategoryIcon";
import { TimelineIcon, ToursIcon } from "./SideNav";
import { useMediaQuery } from "./useMediaQuery";
import "./page-tabs.css";

/**
 * Phones only (the width below which the side rail becomes a drawer): a tab bar across the top of
 * the Timeline, Events, Species, Cultures, Civilizations and Tours pages. The current tab shows its name,
 * so it stands in for the page title (the page's own <h1> stays for screen readers). Swipe left or
 * right on the page to move to the next or previous tab. The globe, intro, sources and settings
 * stay in the menu drawer, whose button sits at the left end of the bar.
 */
export const TABS_QUERY = "(max-width: 700px)";

interface Tab {
  view: View;
  label: string;
  icon: ReactNode;
  accent: string;
}

export const TABS: Tab[] = [
  { view: "timeline", label: "Timeline", icon: TimelineIcon, accent: "#8ec5ff" },
  { view: "events", label: "Events", icon: <CategoryIcon category="event" />, accent: CATEGORY_STYLE.event.color },
  { view: "species", label: "Species", icon: <CategoryIcon category="species" />, accent: CATEGORY_STYLE.species.color },
  { view: "cultures", label: "Cultures", icon: <CategoryIcon category="culture" />, accent: CATEGORY_STYLE.culture.color },
  { view: "civilizations", label: "Civilizations", icon: <CategoryIcon category="civilization" />, accent: CATEGORY_STYLE.civilization.color },
  { view: "tours", label: "Tours", icon: ToursIcon, accent: "#c39bff" },
];

export const isTabView = (v: View) => TABS.some((t) => t.view === v);

/** Move to a tab; the page that comes in slides from the side it was swiped from. */
function goTo(from: View, to: View) {
  if (from === to) return;
  const dir = TABS.findIndex((t) => t.view === to) > TABS.findIndex((t) => t.view === from) ? "next" : "prev";
  const app = document.querySelector<HTMLElement>(".app");
  if (app) {
    app.dataset.tabDir = dir;
    window.setTimeout(() => {
      if (app.dataset.tabDir === dir) delete app.dataset.tabDir;
    }, 400);
  }
  navigate(to);
}

// A swipe: mostly sideways, long enough and quick enough not to be a slow drag or a scroll.
const MIN_DX = 64;
const MAX_MS = 700;

/** Places a sideways swipe means something else: panning the timeline, sliders, fields, maps. */
const NO_SWIPE = ".tl-main, .tl-overview, input, textarea, select, [role='slider'], .maplibregl-map, [data-no-swipe]";

/** Whether the touch started inside something that scrolls sideways (chip rows and the like). */
function inSidewaysScroller(el: Element | null): boolean {
  for (; el && el !== document.body; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth + 1) {
      const ox = getComputedStyle(el).overflowX;
      if (ox === "auto" || ox === "scroll") return true;
    }
  }
  return false;
}

/** Something on top of the page (an open entry, the drawer, the intro, the timeline's full card). */
const somethingOnTop = () =>
  !!document.querySelector(".ev-overlay, .side-nav.expanded, .timeline-page .info-panel");

function useSwipeTabs(view: View, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let start: { x: number; y: number; t: number } | null = null;
    const onStart = (e: TouchEvent) => {
      start = null;
      if (e.touches.length !== 1 || useStore.getState().introOpen || somethingOnTop()) return;
      const target = e.target as Element | null;
      if (!target?.closest(".events-page, .timeline-page") || target.closest(NO_SWIPE) || inSidewaysScroller(target)) return;
      const t = e.touches[0];
      start = { x: t.clientX, y: t.clientY, t: Date.now() };
    };
    const onEnd = (e: TouchEvent) => {
      const s = start;
      start = null;
      if (!s || e.changedTouches.length !== 1) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (Date.now() - s.t > MAX_MS || Math.abs(dx) < MIN_DX || Math.abs(dx) < 2 * Math.abs(dy)) return;
      // A text selection drag is not a swipe.
      if (window.getSelection()?.toString()) return;
      const i = TABS.findIndex((tab) => tab.view === view);
      const next = TABS[i + (dx < 0 ? 1 : -1)];
      if (next) goTo(view, next.view);
    };
    const onCancel = () => {
      start = null;
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onCancel);
    };
  }, [view, enabled]);
}

export default function PageTabs() {
  const view = useView();
  const openItem = useOpenItem();
  const small = useMediaQuery(TABS_QUERY);
  useSwipeTabs(view, small && !openItem);

  if (!small || !isTabView(view)) return null;
  return (
    <nav className="page-tabs" aria-label="Pages">
      <ul>
        {TABS.map((tab) => {
          const active = tab.view === view;
          return (
            <li key={tab.view} className={active ? "active" : undefined}>
              <button
                className="page-tab"
                style={{ "--tab-accent": tab.accent } as CSSProperties}
                onClick={() => goTo(view, tab.view)}
                aria-current={active ? "page" : undefined}
                aria-label={tab.label}
                title={tab.label}
              >
                <span className="page-tab-icon">{tab.icon}</span>
                {active && <span className="page-tab-label">{tab.label}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
