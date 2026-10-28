import { useState, type CSSProperties, type ReactNode } from "react";
import { CATEGORY_STYLE } from "../config";
import type { Category } from "../types";
import { CategoryBadge } from "./CategoryIcon";
import "./card.css";

/**
 * Pieces shared by the info card (InfoPanel.tsx) and the browse pages' detail views (EntityDetail.tsx,
 * EventsPage.tsx), so the cards read as one design: the head (badge, eyebrow, title, date on one left edge),
 * section headings, the round action buttons and the folding Sources section. Styles in card.css.
 */

/** Badge on the left; eyebrow, name and date stacked beside it, all starting on the same edge. */
export function CardHead({
  category,
  eyebrow,
  tools,
  title,
  sub,
  titleId,
  decorative = false,
}: {
  category: Category;
  eyebrow?: ReactNode;
  /** The card's own buttons (minimise, close), at the end of the eyebrow's row, so the name below has the full width. */
  tools?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  titleId?: string;
  /** The eyebrow already names the category, so the badge needn't say it again. */
  decorative?: boolean;
}) {
  return (
    <div className="card-head" style={{ "--cat": CATEGORY_STYLE[category].color } as CSSProperties}>
      <CategoryBadge category={category} size={40} decorative={decorative} />
      <div className="card-head-text">
        {(eyebrow || tools) && (
          <div className="card-eyebrow-row">
            <div className="card-eyebrow">{eyebrow}</div>
            {tools && <div className="card-tools">{tools}</div>}
          </div>
        )}
        <h2 id={titleId} className="card-title">{title}</h2>
        {sub && <div className="card-sub">{sub}</div>}
      </div>
    </div>
  );
}

/** A small heading over one part of a card ("Alive at the same time", "Guided tours"). */
export const CardSection = ({ title, count, children, className = "" }: { title: ReactNode; count?: number; children: ReactNode; className?: string }) => (
  <section className={`card-section ${className}`}>
    <h3 className="card-section-title">
      {title}
      {count !== undefined && <span className="card-count">{count}</span>}
    </h3>
    {children}
  </section>
);

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** Line icons on a 24×24 grid for the card's buttons. */
export const CARD_ICON = {
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" {...stroke} strokeWidth={2} />,
  timeline: <path d="M4 7h9M8 12h12M4 17h7" {...stroke} strokeWidth={2.2} />,
  globe: (
    <g {...stroke}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.4 3.7 5.3 3.7 8.5s-1.2 6.1-3.7 8.5M12 3.5C9.5 5.9 8.3 8.8 8.3 12s1.2 6.1 3.7 8.5" />
    </g>
  ),
  page: (
    <g {...stroke}>
      <rect x="5" y="3.5" width="14" height="17" rx="2.2" />
      <path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4" />
    </g>
  ),
  // The "What Was Here?" mark (as on the search box's pin): a dashed ring round a point.
  here: (
    <g>
      <circle cx="12" cy="12" r="8" {...stroke} strokeWidth={1.8} strokeDasharray="3.4 2.4" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </g>
  ),
  share: (
    <g {...stroke}>
      <path d="M12 3.8v10.4M8.2 7.4 12 3.6l3.8 3.8" />
      <path d="M8.5 10.5H7a2 2 0 0 0-2 2V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5.5a2 2 0 0 0-2-2h-1.5" />
    </g>
  ),
  copied: <path d="M5 12.5l4.5 4.5L19 7.5" {...stroke} strokeWidth={2.2} />,
  compare: (
    <g {...stroke}>
      <rect x="3.5" y="5" width="7" height="14" rx="1.8" />
      <rect x="13.5" y="5" width="7" height="14" rx="1.8" />
    </g>
  ),
  sources: (
    <g {...stroke}>
      <path d="M5 5.5A2 2 0 0 1 7 3.5h11.5v14H7a2 2 0 0 0-2 2z" />
      <path d="M5 19.5a2 2 0 0 0 2 2h11.5v-4" />
      <path d="M9 8h6" />
    </g>
  ),
  external: <path d="M8 16 16 8M9.5 8H16v6.5" {...stroke} strokeWidth={2} />,
  chevron: <path d="M7 10l5 5 5-5" {...stroke} strokeWidth={2} />,
};
export type CardIconName = keyof typeof CARD_ICON;

export const CardIcon = ({ name, size = 18 }: { name: CardIconName; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="card-icon">
    {CARD_ICON[name]}
  </svg>
);

/** One of the card's round actions (Timeline, Species page, History here, Share): an icon over its label. */
export function CardAction({
  icon,
  label,
  onClick,
  title,
  badge,
  live,
}: {
  icon: CardIconName;
  label: string;
  onClick: () => void;
  title?: string;
  /** A small count on the circle (videos to watch on the page). */
  badge?: ReactNode;
  /** Announce changes to the label (Share: "Link copied"). */
  live?: boolean;
}) {
  return (
    <button type="button" className="card-action" onClick={onClick} title={title} aria-live={live ? "polite" : undefined}>
      <span className="card-action-icon">
        <CardIcon name={icon} size={19} />
        {badge && <span className="card-action-badge" aria-hidden="true">{badge}</span>}
      </span>
      <span className="card-action-label">{label}</span>
    </button>
  );
}

const SOURCES_KEY = "history-globe.card-sources-open";
const readOpen = () => {
  try {
    return localStorage.getItem(SOURCES_KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * Sources and references, folded away under one line (Rob's question, 28 Oct 2026: most readers never open
 * them). Whoever opens it keeps it open on the next card, remembered for the visit and the next.
 */
export function SourcesDisclosure({ children, summary }: { children: ReactNode; summary?: ReactNode }) {
  const [open, setOpen] = useState(readOpen);
  return (
    <details
      className="card-sources"
      open={open}
      onToggle={(e) => {
        const now = (e.currentTarget as HTMLDetailsElement).open;
        if (now === open) return;
        setOpen(now);
        try {
          localStorage.setItem(SOURCES_KEY, now ? "1" : "0");
        } catch {
          /* storage blocked: it still opens, just isn't remembered */
        }
      }}
    >
      <summary>
        <CardIcon name="sources" size={16} />
        <span className="card-sources-label">Sources and references</span>
        {summary && <span className="card-sources-hint">{summary}</span>}
        <span className="card-sources-chevron">
          <CardIcon name="chevron" size={16} />
        </span>
      </summary>
      <div className="card-sources-body">{children}</div>
    </details>
  );
}

/** "Read more on Wikipedia", kept in view under the description (the sources fold away). */
export const ReadMore = ({ href }: { href: string }) => (
  <a className="card-readmore" href={href} target="_blank" rel="noreferrer">
    Read more on Wikipedia
    <CardIcon name="external" size={14} />
  </a>
);
