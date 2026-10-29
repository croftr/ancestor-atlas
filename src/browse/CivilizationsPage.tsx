import DataLoading from "../ui/DataLoading";
import { Fragment, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CATEGORY_STYLE } from "../config";
import { useData } from "../map/data";
import { navigate, useOpenItem } from "../route";
import { formatRange, MAX_YEAR } from "../time/scale";
import type { Entity } from "../types";
import { barStyle } from "./browse";
import {
  buildEntries,
  byRegion,
  durationText,
  NO_REGION,
  rangeText,
  runsOn,
  RUNS_ON_NOTE,
  TICKS,
  tickLabel,
  type Cluster,
  type Entry,
} from "./civLayout";
import { fold, index, marks, nearMisses, NOT_COVERED, search, type SearchRecord } from "./civSearch";
import CivTimeline from "./CivTimeline";
import EntityDetail from "./EntityDetail";
import Totals from "./Totals";
import { CategoryBadge } from "../ui/CategoryIcon";

type Sort = "date" | "name";
type View = "list" | "timeline";
const VIEW_KEY = "civilizations-layout";
const readView = (): View => {
  try {
    return localStorage.getItem(VIEW_KEY) === "timeline" ? "timeline" : "list";
  } catch {
    return "list";
  }
};

const small = (url: string) => url.replace(/\.webp$/, "-600.webp");

/** The page's text with the searched words marked. */
function Marked({ text, query }: { text: string; query: string }) {
  const ranges = query ? marks(text, query) : [];
  if (!ranges.length) return <>{text}</>;
  const out: ReactNode[] = [];
  let at = 0;
  ranges.forEach(([a, b], i) => {
    out.push(text.slice(at, a), <mark key={i}>{text.slice(a, b)}</mark>);
    at = b;
  });
  out.push(text.slice(at));
  return <>{out}</>;
}

function Thumb({ url, large }: { url?: string; large?: boolean }) {
  return (
    <span className={`cv-thumb${large ? " large" : ""}`}>
      {url && (
        <img
          src={small(url)}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      )}
    </span>
  );
}

/** A civilization's bar on the page's time axis; one cut off at 1 CE fades out at the end. */
function SpanBar({ e, axis, color }: { e: { start_year: number; end_year: number }; axis: [number, number]; color?: string }) {
  return (
    <span className="br-bar cv-row-bar" aria-hidden>
      <span className={runsOn(e) ? "runs-on" : undefined} style={{ ...barStyle(e, axis), background: color }} />
    </span>
  );
}

/**
 * One civilization: thumbnail (its own picture) or colour swatch, name, dates, bar, length. `large` for one standing
 * on its own in a region, the size of the group and family cards beside it.
 */
function Row({
  e,
  axis,
  query = "",
  context,
  picture = e.image_url,
  large,
}: {
  e: Entity;
  axis: [number, number];
  query?: string;
  context?: string;
  picture?: string;
  large?: boolean;
}) {
  return (
    <button className="cv-row" onClick={() => navigate("civilizations", e.id)}>
      {picture ? <Thumb url={picture} large={large} /> : <span className="cv-thumb"><span className="cv-swatch" style={{ background: e.color ?? CATEGORY_STYLE.civilization.color }} /></span>}
      <span className="cv-row-name">
        <span className="cv-row-title"><Marked text={e.name} query={query} /></span>
        {context && <span className="cv-row-context muted">{context}</span>}
      </span>
      <span className="cv-row-date muted" title={runsOn(e) ? RUNS_ON_NOTE : undefined}>{rangeText(e)}</span>
      <SpanBar e={e} axis={axis} color={e.color} />
      <span className="cv-row-dur muted">{durationText(e)}</span>
    </button>
  );
}

/** A group (with its About page) or a family: a picture card that opens to list its civilizations. */
function ClusterItem({ c, axis, open, onToggle }: { c: Cluster; axis: [number, number]; open: boolean; onToggle: () => void }) {
  const span = { start_year: c.start, end_year: c.end };
  const n = c.members.length;
  const noun = c.kind === "group" ? (n === 1 ? "period" : "periods") : "civilizations";
  return (
    <li className={`cv-cluster${open ? " open" : ""}`}>
      <div className="cv-cluster-head">
        <button className="cv-cluster-toggle" aria-expanded={open} aria-label={`${c.title}: ${n} ${noun}`} onClick={onToggle} />
        <Thumb url={c.picture?.url} large />
        <span className="cv-row-name">
          <span className="cv-cluster-name">{c.title}</span>
          <span className="cv-row-context muted">
            {n} {noun}
            {c.entity && (
              <>
                {" · "}
                <button className="link cv-about" onClick={() => navigate("civilizations", c.entity!.id)}>About</button>
              </>
            )}
          </span>
        </span>
        <span className="cv-row-date muted" title={runsOn(span) ? RUNS_ON_NOTE : undefined}>{rangeText(span)}</span>
        <SpanBar e={span} axis={axis} color={c.color} />
        <span className="cv-chevron" aria-hidden>
          <svg viewBox="0 0 12 12" width="14" height="14">
            <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      {open && (
        <ul className="cv-rows cv-members">
          {c.members.map((m) => (
            <li key={m.id}><Row e={m} axis={axis} /></li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** The page's time scale, lined up with the rows' bars (list) or the timeline's track. */
function Scale({ axis, view }: { axis: [number, number]; view: View }) {
  const ticks = (
    <span className="cv-scale-track">
      {TICKS.map((y) => (
        <span key={y} className={`cv-tick${y === MAX_YEAR ? " end" : ""}`} style={{ left: barStyle({ start_year: y, end_year: y }, axis).left }}>
          {tickLabel(y)}
        </span>
      ))}
    </span>
  );
  return <div className={`cv-scale ${view}`} aria-hidden>{view === "list" ? <><span /><span /><span />{ticks}<span /></> : ticks}</div>;
}

/**
 * Civilizations page (#/civilizations). The list puts each region's civilizations in the order they began, groups
 * (Ancient Egypt, Ancient China...) and families of related states (civLayout.ts) as picture cards that open, on one
 * time scale pinned at the top. The timeline (CivTimeline.tsx) draws the same as bars, a lane per region. The search
 * (civSearch.ts) lists the best matches first, across groups and regions; A–Z lists every civilization by name.
 */
export default function CivilizationsPage() {
  const data = useData();
  const openId = useOpenItem();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("date");
  const [region, setRegion] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [view, setViewState] = useState<View>(readView);
  const pageRef = useRef<HTMLDivElement>(null);
  const setView = (v: View) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      // Not remembered; fine.
    }
  };

  const civs = useMemo(() => (data?.entities ?? []).filter((e) => e.category === "civilization"), [data]);
  const entries = useMemo(() => (data ? buildEntries(civs, data.childrenOf) : []), [civs, data]);
  const regions = useMemo(() => byRegion(entries), [entries]);
  const axis = useMemo<[number, number]>(() => [Math.min(...civs.map((e) => e.start_year)), MAX_YEAR], [civs]);
  // Where each civilization sits on the page: its entry, and the context line a search result shows.
  const placeOf = useMemo(() => {
    const m = new Map<string, { entry: Entry; context: string }>();
    for (const e of entries) {
      if (e.kind === "single") m.set(e.id, { entry: e, context: e.region });
      else {
        if (e.entity) m.set(e.entity.id, { entry: e, context: `Group of ${e.members.length} periods · ${e.region}` });
        for (const c of e.members) m.set(c.id, { entry: e, context: `${e.title} · ${e.region}` });
      }
    }
    return m;
  }, [entries]);
  const records = useMemo(
    () =>
      index(
        civs.map((e): SearchRecord => {
          const entry = placeOf.get(e.id)?.entry;
          const cluster = entry && entry.kind !== "single" && !e.group ? entry.title : undefined;
          return { id: e.id, name: e.name, context: [cluster, entry?.region].filter((x): x is string => !!x), description: e.description, start: e.start_year };
        }),
      ),
    [civs, placeOf],
  );

  if (!data) return <div className="events-page"><div className="ev-loading muted"><DataLoading /></div></div>;

  const q = query.trim();
  const inRegion = (id: string) => region === null || placeOf.get(id)?.entry.region === region;
  const found = q ? search(records, q).filter((r) => inRegion(r.id)) : [];
  const byName = (a: Entity, b: Entity) => a.name.localeCompare(b.name);
  const tier = (strong: boolean) => {
    const list = found.filter((r) => r.strong === strong).map((r) => data.entityById.get(r.id)!);
    return sort === "name" ? list.sort(byName) : list;
  };
  // Matches in names, groups and regions first; those found only in a description after them.
  const strongHits = q ? tier(true) : [];
  const weakHits = q ? tier(false) : [];
  const hits = [...strongHits, ...weakHits];
  const shownRegions = regions.filter((r) => region === null || r.name === region);
  const total = civs.filter((e) => !e.group).length;
  const clusters = entries.filter((e) => e.kind !== "single").length;

  // What the page lists, in its order (also the detail view's previous / next).
  let order: Entity[];
  let flat: Entity[] | null = null;
  if (q) flat = hits;
  else if (sort === "name" && view === "list") flat = civs.filter((e) => inRegion(e.id)).sort(byName);
  if (flat) order = flat;
  else order = shownRegions.flatMap((r) => r.entries.flatMap((e) => (e.kind === "single" ? [e.entity] : [...(e.entity ? [e.entity] : []), ...e.members])));

  const toggle = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const open = openId ? data.entityById.get(openId) : undefined;
  const openPlace = open && placeOf.get(open.id);
  const openCluster = open && !open.group && openPlace && openPlace.entry.kind !== "single" ? openPlace.entry.title : undefined;
  const pick = (r: string | null) => {
    setRegion(r);
    pageRef.current?.scrollTo({ top: 0 });
  };
  const misses = q && hits.length === 0 ? nearMisses(records, q) : [];
  const notCovered = NOT_COVERED[fold(q)];
  const matched = q ? new Set(hits.map((h) => h.id)) : null;

  return (
    <div ref={pageRef} className="events-page br-page cv-page" style={{ "--accent": CATEGORY_STYLE.civilization.color } as CSSProperties}>
      <header className="ev-header br-intro">
        <div className="ev-title">
          <h1 className="cat-title">
            <CategoryBadge category="civilization" decorative />
            Civilizations
          </h1>
          <span className="muted ev-count">
            {q ? `${hits.length} of ${total} match` : `${formatRange(axis[0], axis[1])}, region by region, in the order they began`}
          </span>
        </div>
        <Totals
          items={[
            { label: "Civilizations & periods", value: total },
            { label: "Groups & families", value: clusters, title: "Groups (Ancient Egypt, Ancient China...) and families of related states" },
            { label: "Regions", value: regions.filter((r) => r.name !== NO_REGION).length },
            {
              label: "Territory maps",
              value: civs.reduce((n, e) => n + (e.group ? 0 : (data.featuresOf.get(e.id)?.length ?? 0)), 0),
              title: "Dated territory outlines drawn on the globe (Cliopatria)",
            },
          ]}
        />
      </header>

      {/* Pinned: the search, view and sort, the region chips and the time scale. */}
      <div className="br-sticky cv-bar">
        <div className="cv-bar-row">
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
                } else if (e.key === "Enter" && hits[0]) navigate("civilizations", hits[0].id);
              }}
              placeholder="Search: a name, a people, a region"
              aria-label="Search civilizations"
            />
          </div>
          <span className="sp-layout" role="group" aria-label="Show as">
            {(["list", "timeline"] as const).map((v) => (
              <button key={v} className={`chip${view === v ? " active" : ""}`} aria-pressed={view === v} onClick={() => setView(v)}>
                {v === "list" ? "List" : "Timeline"}
              </button>
            ))}
          </span>
          {view === "list" && (
            <span className="sp-layout" role="group" aria-label="Sort">
              <button className={`chip${sort === "date" ? " active" : ""}`} aria-pressed={sort === "date"} onClick={() => setSort("date")}>
                {q ? "Best match" : "By date"}
              </button>
              <button className={`chip${sort === "name" ? " active" : ""}`} aria-pressed={sort === "name"} onClick={() => setSort("name")}>A–Z</button>
            </span>
          )}
        </div>
        <div className="ev-filters" role="group" aria-label="Filter by region">
          <button className={`chip${region === null ? " active" : ""}`} aria-pressed={region === null} onClick={() => pick(null)}>
            All regions
          </button>
          {regions.map((r) => (
            <button key={r.name} className={`chip${region === r.name ? " active" : ""}`} aria-pressed={region === r.name} onClick={() => pick(region === r.name ? null : r.name)}>
              {r.name} <span className="ev-chip-count">{r.count}</span>
            </button>
          ))}
        </div>
        {order.length > 0 && <Scale axis={axis} view={view} />}
      </div>

      <main className="ev-main cv-main">
        {q && hits.length === 0 && (
          <div className="cv-empty">
            <p>No civilization matches “{q}”{region ? ` in ${region}` : ""}.</p>
            {notCovered && <p className="muted">{notCovered}</p>}
            {misses.length > 0 && (
              <p className="cv-misses">
                Did you mean{" "}
                {misses.map((m, i) => (
                  <Fragment key={m.id}>
                    {i > 0 && " "}
                    <button className="chip" onClick={() => setQuery(m.name)}>{m.name}</button>
                  </Fragment>
                ))}
              </p>
            )}
            {!notCovered && !misses.length && (
              <p className="muted">The atlas covers states with mapped territories from 3400 BCE to 1 CE. Try a region, or a people (“Persian”, “Greek”).</p>
            )}
            <p className="cv-misses">
              {region && <button className="chip" onClick={() => setRegion(null)}>Search all regions</button>}
              <button className="chip" onClick={() => setQuery("")}>Clear search</button>
            </p>
          </div>
        )}

        {view === "timeline" ? (
          order.length > 0 && (
            <CivTimeline
              regions={shownRegions}
              axis={axis}
              expanded={expanded}
              onToggle={toggle}
              matched={matched}
            />
          )
        ) : flat ? (
          (q ? [strongHits, weakHits] : [flat]).map((list, i) =>
            list.length > 0 && (
              <Fragment key={i}>
                {i === 1 && <h3 className="cv-also">{strongHits.length ? "Also mentioned in descriptions" : "Mentioned in descriptions"}</h3>}
                <ul className="cv-rows cv-flat">
                  {list.map((e) => (
                    <li key={e.id}><Row e={e} axis={axis} query={i === 0 ? q : ""} context={placeOf.get(e.id)?.context} /></li>
                  ))}
                </ul>
              </Fragment>
            ),
          )
        ) : (
          shownRegions.map((r) => (
            <section key={r.name} className="cv-region" aria-labelledby={`region-${r.name}`}>
              <h2 id={`region-${r.name}`}>
                {r.name}
                <span className="muted">
                  {rangeText({ start_year: r.start, end_year: r.end })} · {r.count} civilization{r.count === 1 ? "" : "s"}
                </span>
              </h2>
              <ul className="cv-rows cv-entries">
                {r.entries.map((e) =>
                  e.kind === "single" ? (
                    <li key={e.id} className="cv-single"><Row e={e.entity} axis={axis} picture={e.picture} large /></li>
                  ) : (
                    <ClusterItem key={e.id} c={e} axis={axis} open={expanded.has(e.id)} onToggle={() => toggle(e.id)} />
                  ),
                )}
              </ul>
            </section>
          ))
        )}
      </main>

      {open && open.category === "civilization" && (
        <EntityDetail
          entity={open}
          order={order.includes(open) ? order : civs}
          page="civilizations"
          kicker={[open.group ? "Group of civilizations" : (openCluster ?? "Civilization"), openPlace?.entry.region].filter(Boolean).join(" · ")}
        />
      )}
    </div>
  );
}
