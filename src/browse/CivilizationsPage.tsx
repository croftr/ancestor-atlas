import { useMemo, useState, type CSSProperties } from "react";
import { CATEGORY_STYLE } from "../config";
import { useData } from "../map/data";
import { navigate, useOpenItem } from "../route";
import { formatRange } from "../time/scale";
import { shortDuration } from "../timeline/layout";
import type { Entity } from "../types";
import { barStyle, pictureOf } from "./browse";
import EntityDetail from "./EntityDetail";
import "../events/events-page.css";
import "./browse.css";

type Sort = "date" | "name";

/** Millennium BCE a year falls in (1 = 1st millennium BCE; CE years count as the 1st). */
const millenniumOf = (year: number) => Math.max(1, Math.ceil((1 - year) / 1000));
const ordinal = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th"}`;
const NO_REGION = "Region not set";
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/**
 * Civilizations page (#/civilizations): the groups (Ancient Egypt, Ancient China...) as sections
 * that open to list their periods, then every other civilization by region. Search, sort, region
 * chips and a filter by the millennium each began in apply to both. Each row has a bar on a shared
 * time axis.
 */
export default function CivilizationsPage() {
  const data = useData();
  const openId = useOpenItem();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("date");
  const [millennium, setMillennium] = useState<number | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const civs = useMemo(() => (data?.entities ?? []).filter((e) => e.category === "civilization"), [data]);
  const groups = useMemo(() => civs.filter((e) => e.group).sort((a, b) => a.start_year - b.start_year), [civs]);
  const singles = useMemo(() => civs.filter((e) => !e.group), [civs]);
  const axis = useMemo<[number, number]>(
    () => (singles.length ? [Math.min(...singles.map((e) => e.start_year)), Math.max(...singles.map((e) => e.end_year))] : [0, 1]),
    [singles],
  );
  const millennia = useMemo(() => {
    const m = new Map<number, number>();
    for (const e of singles) m.set(millenniumOf(e.start_year), (m.get(millenniumOf(e.start_year)) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[0] - a[0]);
  }, [singles]);
  // Regions in the order they first appear in time, with how many civilizations each has.
  const regions = useMemo(() => {
    const m = new Map<string, { first: number; n: number }>();
    for (const e of singles) {
      const r = e.region ?? NO_REGION;
      const v = m.get(r) ?? { first: Infinity, n: 0 };
      m.set(r, { first: Math.min(v.first, e.start_year), n: v.n + 1 });
    }
    return [...m.entries()].sort((a, b) => a[1].first - b[1].first).map(([name, v]) => ({ name, n: v.n }));
  }, [singles]);

  if (!data) return <div className="events-page"><div className="ev-loading muted">Loading…</div></div>;

  const q = fold(query.trim());
  const filtering = q !== "" || millennium !== null || region !== null;
  const cmp = sort === "date" ? (a: Entity, b: Entity) => a.start_year - b.start_year || a.end_year - b.end_year : (a: Entity, b: Entity) => a.name.localeCompare(b.name);
  const inMillennium = (e: Entity) =>
    (millennium === null || millenniumOf(e.start_year) === millennium) && (region === null || (e.region ?? NO_REGION) === region);
  const matches = (e: Entity) => inMillennium(e) && (q === "" || fold(e.name).includes(q));

  const groupRows = groups
    .map((g) => {
      const members = data.childrenOf.get(g.id) ?? [];
      // A search for the group's name shows all its periods (within the millennium filter).
      const nameHit = q !== "" && fold(g.name).includes(q);
      return { group: g, all: members, members: members.filter((m) => (nameHit ? inMillennium(m) : matches(m))).sort(cmp) };
    })
    .filter((r) => !filtering || r.members.length > 0);
  const others = singles.filter((e) => !e.parent_id && matches(e)).sort(cmp);
  const othersByRegion = regions
    .map(({ name }) => ({ name, list: others.filter((e) => (e.region ?? NO_REGION) === name) }))
    .filter((r) => r.list.length > 0);
  const visible = [...groupRows.flatMap((r) => r.members), ...others].sort(cmp);
  const total = singles.length;

  const open = openId ? data.entityById.get(openId) : undefined;
  const order = open?.group ? groups : visible.includes(open!) ? visible : [...singles].sort(cmp);
  const toggle = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="events-page br-page" style={{ "--accent": CATEGORY_STYLE.civilization.color } as CSSProperties}>
      <header className="ev-header">
        <div className="ev-title">
          <h1>Civilizations</h1>
          <span className="muted ev-count">
            {filtering ? `${visible.length} of ${total}` : `${total} civilizations and periods, ${formatRange(axis[0], axis[1])}`}
          </span>
        </div>
        <div className="cv-controls">
          <input
            className="cv-search"
            type="search"
            placeholder="Search civilizations"
            aria-label="Search civilizations"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="cv-sort" role="group" aria-label="Sort">
            <button className={`chip${sort === "date" ? " active" : ""}`} aria-pressed={sort === "date"} onClick={() => setSort("date")}>By date</button>
            <button className={`chip${sort === "name" ? " active" : ""}`} aria-pressed={sort === "name"} onClick={() => setSort("name")}>A–Z</button>
          </div>
          <select
            className="cv-select"
            aria-label="When they began"
            value={millennium ?? ""}
            onChange={(e) => setMillennium(e.target.value === "" ? null : Number(e.target.value))}
          >
            <option value="">Began any time</option>
            {millennia.map(([m, n]) => (
              <option key={m} value={m}>Began {ordinal(m)} millennium BCE ({n})</option>
            ))}
          </select>
        </div>
        <div className="ev-filters" role="group" aria-label="Filter by region">
          <button className={`chip${region === null ? " active" : ""}`} aria-pressed={region === null} onClick={() => setRegion(null)}>
            All regions
          </button>
          {regions.map(({ name, n }) => (
            <button key={name} className={`chip${region === name ? " active" : ""}`} aria-pressed={region === name} onClick={() => setRegion(region === name ? null : name)}>
              {name} <span className="ev-chip-count">{n}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="ev-main cv-main">
        {groupRows.length > 0 && (
          <section className="cv-section">
            <h2>Groups</h2>
            <ul className="cv-groups">
              {groupRows.map(({ group, all, members }) => {
                const isOpen = filtering || expanded.has(group.id);
                const pic = pictureOf(group, data);
                return (
                  <li key={group.id} className={`cv-group${isOpen ? " open" : ""}`}>
                    <div className="cv-group-head">
                      <button className="cv-group-toggle" onClick={() => toggle(group.id)} aria-expanded={isOpen} disabled={filtering}>
                        <span className="br-img cv-group-img" style={{ "--swatch": group.color ?? CATEGORY_STYLE.civilization.color } as CSSProperties}>
                          {pic && <img src={pic.url} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = "none")} />}
                        </span>
                        <span className="cv-group-text">
                          <span className="cv-group-name">{group.name}</span>
                          <span className="muted">{formatRange(group.start_year, group.end_year)}</span>
                          <span className="muted">
                            {filtering && members.length !== all.length ? `${members.length} of ${all.length}` : all.length} periods
                            {group.region && <> · {group.region}</>}
                            {group.media && group.media.length > 0 && <> · ▶ {group.media.length}</>}
                          </span>
                        </span>
                        {!filtering && <span className="cv-chevron" aria-hidden>▾</span>}
                      </button>
                      <button className="tl-btn cv-about" onClick={() => navigate("civilizations", group.id)}>About</button>
                    </div>
                    {isOpen && <Rows list={members} axis={axis} />}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        {othersByRegion.length > 0 && (
          <section className="cv-section">
            <h2>{groupRows.length ? "Other civilizations" : "Civilizations"} <span className="muted">{others.length}</span></h2>
            {othersByRegion.map(({ name, list }) => (
              <div key={name} className="cv-region">
                <h3>{name} <span className="muted">{list.length}</span></h3>
                <Rows list={list} axis={axis} />
              </div>
            ))}
          </section>
        )}
        {visible.length === 0 && <p className="muted cv-empty">No civilizations match.</p>}
      </main>

      {open && open.category === "civilization" && (
        <EntityDetail
          entity={open}
          order={order}
          page="civilizations"
          kicker={[open.group ? "Group of civilizations" : CATEGORY_STYLE.civilization.label.replace(/s$/, ""), open.region].filter(Boolean).join(" · ")}
        />
      )}
    </div>
  );
}

/** Compact rows: colour swatch, name, dates, and a bar on the page's shared time axis. */
function Rows({ list, axis }: { list: Entity[]; axis: [number, number] }) {
  return (
    <ul className="cv-rows">
      {list.map((e) => {
        return (
          <li key={e.id}>
            <button className="cv-row" onClick={() => navigate("civilizations", e.id)}>
              <span className="cv-swatch" style={{ background: e.color ?? CATEGORY_STYLE.civilization.color }} />
              <span className="cv-row-name">{e.name}</span>
              <span className="cv-row-date muted">{formatRange(e.start_year, e.end_year)}</span>
              <span className="br-bar cv-row-bar" aria-hidden>
                <span style={{ ...barStyle(e, axis), background: e.color ?? undefined }} />
              </span>
              <span className="cv-row-dur muted">
                {shortDuration(e.end_year - e.start_year)}
                {e.media && e.media.length > 0 && <> · ▶ {e.media.length}</>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
