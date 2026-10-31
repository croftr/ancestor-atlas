import { useMemo, useRef, useState, type CSSProperties } from "react";
import { useData, type Data } from "../map/data";
import { navigate } from "../route";
import { formatYear, MAX_YEAR, MIN_YEAR, yearToPos } from "../time/scale";
import { CategoryBadge } from "../ui/CategoryIcon";
import { NewsIcon } from "../ui/SideNav";
import Totals from "../browse/Totals";
import type { BrowseView } from "../route";
import { matches, sectionsOf, shortDay, TOPIC_LABELS, useFeed } from "./news";
import { TopicIcon, TopicTile } from "./TopicIcon";
import { NEWS_TOPICS, type NewsStory, type NewsTopic } from "./types";

/** The browse page each entity category opens on. */
const PAGE_OF: Record<string, BrowseView> = { species: "species", culture: "cultures", civilization: "civilizations", event: "events" };

const ACCENT = "#f0b86e";

/** Marks on the deep-time strip, on the time slider's own scale. */
const STRIP_TICKS = [-999_999, -99_999, -9_999, -2_999, 1];
const tickLabel = (y: number) => (y === 1 ? "1 CE" : y <= -999_999 ? "1 Ma" : y <= -99_999 ? "100 ka" : y <= -9_999 ? "10 ka" : "3000 BCE");

/** Where this month's stories fall in time: each one a mark on the slider's scale, tap to go to it. */
function DeepTimeStrip({ stories, onPick }: { stories: NewsStory[]; onPick: (id: string) => void }) {
  if (!stories.length) return null;
  const from = Math.min(...STRIP_TICKS, ...stories.map((s) => s.period.from));
  const lo = Math.min(yearToPos(from), yearToPos(STRIP_TICKS[0]));
  const at = (y: number) => `${((yearToPos(y) - lo) / (1 - lo)) * 100}%`;
  return (
    <figure className="nw-strip" aria-label="When the stories are set">
      <figcaption className="muted">When the stories are set</figcaption>
      <div className="nw-strip-track">
        {STRIP_TICKS.map((y) => (
          <span key={y} className="nw-strip-tick" style={{ left: at(y) }}>
            <span>{tickLabel(y)}</span>
          </span>
        ))}
        {stories.map((s) => {
          const left = yearToPos(s.period.from);
          const right = yearToPos(Math.max(s.period.from, s.period.to));
          return (
            <button
              key={s.id}
              className={`nw-strip-mark topic-${s.topic}`}
              style={{ left: at(s.period.from), width: `max(8px, ${((right - left) / (1 - lo)) * 100}%)` }}
              title={`${s.title} (${s.period.text})`}
              aria-label={`${s.title}, ${s.period.text}`}
              onClick={() => onPick(s.id)}
            />
          );
        })}
      </div>
    </figure>
  );
}

/** The slider's scale in miniature: where in deep time a story is set, with the eras marked. */
const RULER_TICKS: { year: number; label: string }[] = [
  { year: -999_999, label: "1 Ma" },
  { year: -99_999, label: "100 ka" },
  { year: -9_999, label: "10 ka" },
  { year: -2_999, label: "3000 BCE" },
];

function TimeRuler({ period }: { period: NewsStory["period"] }) {
  const from = yearToPos(Math.max(MIN_YEAR, period.from));
  const to = yearToPos(Math.min(MAX_YEAR, Math.max(period.from, period.to)));
  const range = `${formatYear(period.from)}${period.to !== period.from ? ` – ${formatYear(period.to)}` : ""}`;
  return (
    <div className="nw-ruler" role="img" aria-label={`Set ${period.text} on the atlas's time scale`} title={range}>
      <div className="nw-ruler-track">
        {RULER_TICKS.map((t) => (
          <span key={t.year} className="nw-ruler-tick" style={{ left: `${yearToPos(t.year) * 100}%` }}>
            <span>{t.label}</span>
          </span>
        ))}
        <span className="nw-ruler-mark" style={{ left: `${from * 100}%`, width: `${(to - from) * 100}%` }} />
      </div>
    </div>
  );
}

function Story({ story, data, flash }: { story: NewsStory; data: Data | null; flash: boolean }) {
  const entities = story.entities.map((id) => data?.entityById.get(id)).filter((e) => e !== undefined);
  return (
    <article id={`news-${story.id}`} className={`nw-story topic-${story.topic}${flash ? " flash" : ""}`}>
      <div className="nw-meta">
        <TopicTile topic={story.topic} />
        <span className="nw-meta-text">
          <span className="nw-topic">{TOPIC_LABELS[story.topic]}</span>
          <span className="muted">
            {story.source} · <time dateTime={story.published}>{shortDay(story.published)}</time>
          </span>
        </span>
      </div>
      <h3>
        <a href={story.url} target="_blank" rel="noopener noreferrer">
          {story.title}
        </a>
      </h3>
      <p className="nw-summary">{story.summary}</p>
      <footer className="nw-foot">
        <div className="nw-when">
          <TimeRuler period={story.period} />
          <div className="nw-when-text">
            <span className="nw-period">{story.period.text}</span>
            {story.place && <span className="nw-place">{story.place}</span>}
          </div>
        </div>
        {(entities.length > 0 || story.doi || story.also?.length) && (
          <div className="nw-links">
            {entities.map((e) => (
              <button key={e.id} className="chip nw-entity" onClick={() => navigate(PAGE_OF[e.category], e.id)}>
                <CategoryBadge category={e.category} decorative size={16} />
                {e.name}
              </button>
            ))}
            {story.doi && (
              <a className="nw-doi" href={`https://doi.org/${story.doi}`} target="_blank" rel="noopener noreferrer">
                The paper
              </a>
            )}
            {story.also && story.also.length > 0 && (
              <span className="nw-also muted">
                Also in{" "}
                {story.also.map((c, i) => (
                  <span key={c.url}>
                    {i > 0 && ", "}
                    <a href={c.url} target="_blank" rel="noopener noreferrer" title={c.title}>
                      {c.source}
                    </a>
                  </span>
                ))}
              </span>
            )}
          </div>
        )}
      </footer>
    </article>
  );
}

/**
 * News page (#/news): recent research and finds on human evolution and the world before 1 CE, newest first, from
 * the feed `npm run news:update` publishes to the media bucket (docs/news-feed.md). Each story links to its outlet,
 * with a summary, the time it is about and the atlas entries it concerns. Only the search and topic chips stay pinned.
 */
export default function NewsPage() {
  const feed = useFeed();
  const data = useData();
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<NewsTopic | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const entityName = (id: string) => data?.entityById.get(id)?.name ?? "";
  const stories = feed?.stories ?? [];
  const shown = useMemo(
    () => stories.filter((s) => (!topic || s.topic === topic) && matches(s, query, entityName)),
    // entityName only reads data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stories, topic, query, data],
  );
  const sections = useMemo(() => sectionsOf(shown), [shown]);
  const counts = useMemo(() => {
    const c = new Map<NewsTopic, number>();
    for (const s of stories) c.set(s.topic, (c.get(s.topic) ?? 0) + 1);
    return c;
  }, [stories]);
  // The strip shows the last 30 days of what is listed.
  const recent = useMemo(() => {
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    return shown.filter((s) => s.published >= since);
  }, [shown]);

  const pick = (id: string) => {
    document.getElementById(`news-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlash(id);
    window.setTimeout(() => setFlash((f) => (f === id ? null : f)), 1600);
  };

  const outlets = new Set(stories.flatMap((s) => [s.source, ...(s.also ?? []).map((c) => c.source)]));

  return (
    <div ref={pageRef} className="events-page br-page nw-page" style={{ "--accent": ACCENT } as CSSProperties}>
      <header className="ev-header br-intro">
        <div className="ev-title">
          <h1 className="cat-title">
            <span className="nw-title-icon">{NewsIcon}</span>
            News
          </h1>
          <span className="muted ev-count">
            new research on human origins and the world before 1 CE
            {feed?.updated && <> · updated {shortDay(feed.updated)}</>}
          </span>
        </div>
        {stories.length > 0 && (
          <Totals
            items={[
              { label: "Stories", value: stories.length },
              { label: "This month", value: stories.filter((s) => s.published >= new Date(Date.now() - 30 * 86_400_000).toISOString()).length },
              { label: "Outlets", value: outlets.size },
            ]}
          />
        )}
      </header>
      <div className="br-sticky">
        <div className="br-search">
          <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden>
            <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              pageRef.current?.scrollTo({ top: 0 });
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape" && query) {
                e.stopPropagation();
                setQuery("");
              }
            }}
            placeholder="Search news"
            aria-label="Search news by headline, summary, place or period"
          />
        </div>
        <nav className="ev-filters" aria-label="Show one topic">
          <button className={`chip${topic === null ? " active" : ""}`} aria-pressed={topic === null} onClick={() => setTopic(null)}>
            All <span className="ev-chip-count">{stories.length}</span>
          </button>
          {NEWS_TOPICS.filter((t) => counts.get(t)).map((t) => (
            <button key={t} className={`chip${topic === t ? " active" : ""}`} aria-pressed={topic === t} onClick={() => setTopic(topic === t ? null : t)}>
              <span className={`nw-chip-icon topic-${t}`} aria-hidden>
                <TopicIcon topic={t} size={13} />
              </span>
              {TOPIC_LABELS[t]} <span className="ev-chip-count">{counts.get(t)}</span>
            </button>
          ))}
        </nav>
      </div>

      <main className="ev-main nw-main">
        {feed === undefined && <p className="muted">Loading…</p>}
        {feed === null && <p className="nw-empty muted">The news could not be loaded just now.</p>}
        {feed && stories.length === 0 && <p className="nw-empty muted">No news yet. The first stories will appear here.</p>}
        {stories.length > 0 && <DeepTimeStrip stories={recent} onPick={pick} />}
        {stories.length > 0 && shown.length === 0 && (
          <div className="cu-empty">
            <p>No story matches.</p>
            <button
              className="chip"
              onClick={() => {
                setQuery("");
                setTopic(null);
              }}
            >
              Show all
            </button>
          </div>
        )}
        {sections.map((sec) => (
          <section key={sec.label} className="nw-section" aria-labelledby={`nw-${sec.label}`}>
            <h2 id={`nw-${sec.label}`}>
              {sec.label} <span className="muted">· {sec.stories.length}</span>
            </h2>
            {sec.stories.map((s) => (
              <Story key={s.id} story={s} data={data} flash={flash === s.id} />
            ))}
          </section>
        ))}
        {stories.length > 0 && (
          <p className="nw-about muted">
            Headlines link to the outlets that published them. Stories are picked and summarised automatically by Claude
            (an AI model) from the outlets' news feeds, so a summary can miss a nuance: the article and the paper are the
            sources.
          </p>
        )}
      </main>
    </div>
  );
}
