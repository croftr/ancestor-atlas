import { useEffect, useRef, useState, type ReactNode } from "react";
import { navigate, useView, type View } from "../route";
import { useStore } from "../store";
import SettingsContent from "./SettingsPanel";
import SourcesContent from "./SourcesPanel";
import { CategoryIcon } from "./CategoryIcon";
import "./sidenav.css";

/**
 * Left navigation rail, on every page. Desktop: a slim icon rail that widens to show labels.
 * Small screens: hidden behind a menu button, sliding in as a drawer.
 *
 * Add options by adding entries below. A `view` item switches page; a `panel` item opens a
 * flyout beside the rail (inline in the drawer on small screens).
 */
interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  /** Shown as a tooltip on the collapsed rail. */
  hint?: string;
  view?: View;
  panel?: () => ReactNode;
}

const Icon = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

/** The globe page's button is the Ancestor Atlas logo. */
const GlobeIcon = <img src="/logo-128.webp" alt="" className="nav-logo" draggable={false} />;
const TimelineIcon = (
  <Icon>
    <path d="M4 6h9M7 12h11M5 18h7" strokeWidth="2.6" />
    <path d="M3 21h18" strokeOpacity="0.5" />
  </Icon>
);
// Same drawings as the badge before an entity's name (CategoryIcon), so the two read as one set.
const EventsIcon = <CategoryIcon category="event" />;
const SpeciesIcon = <CategoryIcon category="species" />;
const CulturesIcon = <CategoryIcon category="culture" />;
const CivilizationsIcon = <CategoryIcon category="civilization" />;
const VideoIcon = (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
  </Icon>
);
const SourcesIcon = (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6M12 7.5v.01" strokeWidth="2.2" />
  </Icon>
);
const SettingsIcon = (
  <Icon>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Icon>
);
const MenuIcon = (
  <Icon>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);

/** Page switches, top of the rail. */
const VIEW_ITEMS: NavItem[] = [
  { id: "globe", label: "Globe", icon: GlobeIcon, view: "globe", hint: "Explore sites on the globe" },
  { id: "timeline", label: "Timeline", icon: TimelineIcon, view: "timeline", hint: "Everything in order, in time" },
  { id: "events", label: "Events", icon: EventsIcon, view: "events", hint: "Major moments, with pictures" },
  { id: "species", label: "Species", icon: SpeciesIcon, view: "species", hint: "Our ancestors and relatives, in the order they appeared" },
  { id: "cultures", label: "Cultures", icon: CulturesIcon, view: "cultures", hint: "Toolmaking and farming cultures, by stage" },
  { id: "civilizations", label: "Civilizations", icon: CivilizationsIcon, view: "civilizations", hint: "States and empires, to search and sort" },
];

/** Tools and settings, bottom of the rail. */
const TOOL_ITEMS: NavItem[] = [
  { id: "intro", label: "Intro video", icon: VideoIcon, hint: "Watch the video introduction" },
  { id: "sources", label: "Sources", icon: SourcesIcon, hint: "Data sources and credits", panel: () => <SourcesContent /> },
  { id: "settings", label: "Settings", icon: SettingsIcon, panel: () => <SettingsContent /> },
];

const isSmall = () => typeof window !== "undefined" && window.matchMedia("(max-width: 700px)").matches;

export default function SideNav() {
  const view = useView();
  const introOpen = useStore((s) => s.introOpen);
  const [expanded, setExpanded] = useState(false); // desktop: labels shown; small screens: drawer open
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);

  // Close the flyout (and the drawer) on Escape or a click outside.
  useEffect(() => {
    if (!openPanel && !expanded) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpenPanel(null);
        setExpanded(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpenPanel(null);
      setExpanded(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [openPanel, expanded]);

  const choose = (item: NavItem) => {
    if (item.id === "intro") {
      setOpenPanel(null);
      if (isSmall()) setExpanded(false);
      useStore.getState().setIntroOpen(true);
      return;
    }
    if (item.view) {
      setOpenPanel(null);
      if (isSmall()) setExpanded(false);
      if (item.view !== view) navigate(item.view);
    } else if (item.panel) {
      setOpenPanel((p) => (p === item.id ? null : item.id));
    }
  };

  const renderItem = (item: NavItem) => {
    const active = item.id === "intro" ? introOpen : item.view ? item.view === view : openPanel === item.id;
    return (
      <li key={item.id} className="nav-li">
        <button
          className={`nav-item${active ? " active" : ""}`}
          onClick={() => choose(item)}
          aria-current={item.view && active ? "page" : undefined}
          aria-expanded={item.panel ? openPanel === item.id : undefined}
          title={expanded ? undefined : item.hint ? `${item.label}: ${item.hint}` : item.label}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </button>
        {item.panel && openPanel === item.id && (
          <div className="nav-flyout panel" role="dialog" aria-label={item.label}>
            <h2>{item.label}</h2>
            {item.panel()}
          </div>
        )}
      </li>
    );
  };

  return (
    <>
      <button
        className="nav-menu-btn panel"
        onClick={() => setExpanded(true)}
        aria-label="Open menu"
        aria-expanded={expanded}
      >
        {MenuIcon}
      </button>
      {expanded && <div className="nav-backdrop" aria-hidden />}
      <nav ref={ref} className={`side-nav${expanded ? " expanded" : ""}`} aria-label="Main">
        <ul className="nav-list">{VIEW_ITEMS.map(renderItem)}</ul>
        <ul className="nav-list nav-bottom">{TOOL_ITEMS.map(renderItem)}</ul>
        <button
          className="nav-item nav-collapse"
          onClick={() => {
            setExpanded((x) => !x);
            setOpenPanel(null);
          }}
          aria-label={expanded ? "Collapse menu" : "Expand menu"}
          title={expanded ? "Collapse" : "Expand"}
        >
          <span className="nav-icon">
            <Icon>
              <path d={expanded ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
            </Icon>
          </span>
          <span className="nav-label">Collapse</span>
        </button>
      </nav>
    </>
  );
}
