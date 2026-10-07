import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../store";
import { CATEGORY_STYLE, TIMELINE_ERAS } from "../config";
import { useData } from "../map/data";
import { takePendingFocus } from "../route";
import { POS_BREAKS, formatRange, formatYear, posToYear, yearToPos } from "../time/scale";
import type { Category, Entity } from "../types";
import InfoPanel from "../ui/InfoPanel";
import SearchBox from "../ui/SearchBox";
import {
  AXIS_END,
  aliveAt,
  firstSentence,
  eraIndexOf,
  isEraWindow,
  resolveEras,
  stepEra,
  axisStart,
  buildRows,
  clampWindow,
  continuation,
  fitWindow,
  formatDuration,
  laneExtents,
  panWindow,
  shortDuration,
  tickLabel,
  tickStep,
  ticks,
  zoomWindow,
  type Row,
  type Window,
} from "./layout";
import "./timeline.css";

/** A lane narrower than this (px) at the current zoom is summarised instead of listed. */
const SQUASH_PX = 36;
const OVERVIEW_TICKS = ["10 Ma", "1 Ma", "100 ka", "10,000 BCE", "3,000 BCE", "1 CE"];


// Kept between visits so going to the globe and back returns to the same view.
let savedWindow: Window | null = null;
let savedExpanded = new Set<string>();
let savedCollapsedLanes = new Set<Category>();

const colorOf = (e: Entity) => e.color ?? CATEGORY_STYLE[e.category].color;

export default function TimelinePage() {
  const data = useData();
  const entities = data?.entities;
  const min = useMemo(() => (entities?.length ? axisStart(entities) : -7_500_000), [entities]);
  const extents = useMemo(() => (entities ? laneExtents(entities) : new Map()), [entities]);

  // Opens on the most recent 10,000 years; the back/forward buttons step through 10,000 at a time.
  const firstCivilization = useMemo(() => {
    const civs = entities?.filter((e) => e.category === "civilization") ?? [];
    return civs.length ? Math.min(...civs.map((e) => e.start_year)) : undefined;
  }, [entities]);
  const eras = useMemo(() => resolveEras(TIMELINE_ERAS, min, firstCivilization), [min, firstCivilization]);
  // Opens on the most recent era (Civilizations); Earlier / Later step from era to era.
  const [win, setWinState] = useState<Window>(() => {
    if (savedWindow) return savedWindow;
    const last = resolveEras(TIMELINE_ERAS, min, firstCivilization).at(-1)!;
    return { start: last.start, end: last.end };
  });
  const winRef = useRef(win);
  const setWin = useCallback((w: Window) => {
    winRef.current = w;
    savedWindow = w;
    setWinState(w);
  }, []);
  // Once the data is in, the opening era starts exactly at the first civilization.
  useEffect(() => {
    if (savedWindow || firstCivilization === undefined) return;
    const last = eras.at(-1)!;
    setWin({ start: last.start, end: last.end });
  }, [eras, firstCivilization, setWin]);

  const [expanded, setExpanded] = useState(savedExpanded);
  const [collapsedLanes, setCollapsedLanes] = useState(savedCollapsedLanes);
  useEffect(() => void (savedExpanded = expanded), [expanded]);
  useEffect(() => void (savedCollapsedLanes = collapsedLanes), [collapsedLanes]);

  // Track width, measured from the scrolling body (its client width excludes the scrollbar).
  const bodyRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  // Label column width comes from CSS (--label-w, narrower on small screens); the scrollbar, if
  // the system draws one, is mirrored on the axis so ticks line up with the bars.
  const [{ labelW, trackW, scrollbarW }, setDims] = useState({ labelW: 250, trackW: 800, scrollbarW: 0 });
  const labelWRef = useRef(250);
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => {
      const lw = parseFloat(getComputedStyle(el).getPropertyValue("--label-w")) || 250;
      labelWRef.current = lw;
      setDims({ labelW: lw, trackW: Math.max(60, el.clientWidth - lw), scrollbarW: el.offsetWidth - el.clientWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // The body only exists once the data has loaded.
  }, [!!data]);

  const span = win.end - win.start;
  const x = useCallback((year: number) => ((year - win.start) / span) * trackW, [win.start, span, trackW]);

  const squashedLanes = useMemo(() => {
    const s = new Set<Category>();
    for (const [c, [a, b]] of extents) if (((b - a) / span) * trackW < SQUASH_PX) s.add(c);
    return s;
  }, [extents, span, trackW]);

  const rows = useMemo(
    () => (entities ? buildRows(entities, { window: win, collapsedLanes, squashedLanes, expandedGroups: expanded }) : []),
    [entities, win, collapsedLanes, squashedLanes, expanded],
  );

  // Selection is shared with the globe's info card.
  const selectedId = useStore((s) => s.selectedId);
  const groupId = useStore((s) => s.groupId);
  const hits = useStore((s) => s.hits);
  const openGroup = useStore((s) => s.openGroup);
  const selectedEntityId = groupId ?? hits.find((h) => h.id === selectedId)?.entity_id ?? null;

  // ---- Focusing an entity (search, label click, "See on timeline") ----------------------------
  const rowEls = useRef(new Map<string, HTMLDivElement>());
  const [scrollTo, setScrollTo] = useState<string | null>(null);
  const focus = useCallback(
    (id: string, select = true) => {
      const e = data?.entityById.get(id);
      if (!e) return;
      if (e.category === "event") {
        // A moment has no length to fit: show it within its era.
        const era = eras[eraIndexOf(eras, { start: e.year ?? e.start_year, end: e.year ?? e.start_year })];
        setWin({ start: era.start, end: era.end });
      } else setWin(fitWindow(e.start_year, e.end_year, min));
      if (e.parent_id) setExpanded((s) => (s.has(e.parent_id!) ? s : new Set(s).add(e.parent_id!)));
      setCollapsedLanes((s) => {
        if (!s.has(e.category)) return s;
        const n = new Set(s);
        n.delete(e.category);
        return n;
      });
      if (select) openGroup(id);
      setScrollTo(id);
    },
    [data, min, openGroup, setWin, eras],
  );
  useEffect(() => {
    if (!data) return;
    const id = takePendingFocus();
    if (id) focus(id, false);
  }, [data, focus]);
  useEffect(() => {
    if (!scrollTo) return;
    rowEls.current.get(scrollTo)?.scrollIntoView({ block: "center", behavior: "smooth" });
    setScrollTo(null);
  }, [scrollTo, rows]);

  // ---- Zoom and pan --------------------------------------------------------------------------
  const zoomBy = useCallback(
    (factor: number, at = 0.5) => setWin(zoomWindow(winRef.current, factor, at, min)),
    [min, setWin],
  );

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left - labelWRef.current;
      const w = winRef.current;
      if (e.ctrlKey || e.metaKey) {
        // Mouse wheel with Ctrl/⌘, or a trackpad pinch (which browsers report as Ctrl + wheel).
        e.preventDefault();
        const at = Math.min(1, Math.max(0, px / trackW));
        setWin(zoomWindow(w, Math.exp(e.deltaY * 0.0025), at, min));
      } else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        setWin(panWindow(w, (d / trackW) * (w.end - w.start), min));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [trackW, min, setWin]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const w = winRef.current;
      if (e.key === "+" || e.key === "=") zoomBy(0.6);
      else if (e.key === "-" || e.key === "_") zoomBy(1 / 0.6);
      else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && e.shiftKey) {
        const era = stepEra(eras, w, e.key === "ArrowLeft" ? -1 : 1);
        if (era) setWin({ start: era.start, end: era.end });
      }
      else if (e.key === "ArrowLeft") setWin(panWindow(w, -(w.end - w.start) * 0.15, min));
      else if (e.key === "ArrowRight") setWin(panWindow(w, (w.end - w.start) * 0.15, min));
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomBy, min, setWin, eras]);

  // Drag on the chart to pan. A drag must not also count as a click on the bar under it.
  const drag = useRef<{ x: number; w: Window; moved: boolean; id: number } | null>(null);
  const suppressClick = useRef(false);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const rect = mainRef.current!.getBoundingClientRect();
    if (e.clientX - rect.left < labelWRef.current) return;
    drag.current = { x: e.clientX, w: winRef.current, moved: false, id: e.pointerId };
    suppressClick.current = false;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const rect = mainRef.current!.getBoundingClientRect();
    const px = e.clientX - rect.left - labelWRef.current;
    setHoverYear(px >= 0 && px <= trackW ? winRef.current.start + (px / trackW) * (winRef.current.end - winRef.current.start) : null);
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < 4) return;
    if (!d.moved) {
      d.moved = true;
      (e.currentTarget as HTMLElement).setPointerCapture(d.id);
    }
    setWin(panWindow(d.w, (-dx / trackW) * (d.w.end - d.w.start), min));
  };
  const onPointerUp = () => {
    if (drag.current?.moved) suppressClick.current = true;
    drag.current = null;
  };

  // ---- Hover read-out --------------------------------------------------------------------------
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const alive = useMemo(
    () => (hoverYear !== null && entities ? aliveAt(entities, hoverYear).length : 0),
    [hoverYear, entities],
  );
  const [tip, setTip] = useState<{ e: Entity; x: number; y: number } | null>(null);

  if (!data || !entities) return <div className="timeline-page"><div className="tl-loading muted">Loading…</div></div>;

  const step = tickStep(span, Math.max(2, Math.floor(trackW / 110)));
  const tickYears = ticks(win, Math.max(2, Math.floor(trackW / 110)));

  const toggleExpanded = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleLane = (c: Category) =>
    setCollapsedLanes((s) => {
      const n = new Set(s);
      if (n.has(c)) n.delete(c);
      else n.add(c);
      return n;
    });

  /** Events: a diamond at the best date over a faint band for the stated range, with the date beside it. */
  const renderEvent = (e: Entity) => {
    const at = x(e.year ?? e.start_year);
    const a = Math.max(-4, x(e.start_year));
    const b = Math.min(trackW + 4, x(e.end_year));
    const dim = hoverYear !== null && Math.abs((e.year ?? e.start_year) - hoverYear) > span * 0.02 && !(e.start_year <= hoverYear && hoverYear <= e.end_year);
    const text = e.date_text ?? formatYear(e.year ?? e.start_year);
    const textW = text.length * 6.4 + 10;
    const after = trackW - at >= textW + 12;
    return (
      <>
        {b - a > 2 && <div className={`tl-ev-range${dim ? " dim" : ""}`} style={{ left: a, width: b - a }} />}
        <button
          className={`tl-ev${selectedEntityId === e.id ? " selected" : ""}${dim ? " dim" : ""}`}
          style={{ left: at - 7 }}
          aria-label={`${e.name}, ${text}`}
          onClick={() => {
            if (suppressClick.current) return;
            openGroup(e.id);
          }}
          onMouseEnter={(ev) => setTip({ e, x: ev.clientX, y: ev.clientY })}
          onMouseMove={(ev) => setTip({ e, x: ev.clientX, y: ev.clientY })}
          onMouseLeave={() => setTip(null)}
        />
        <span className={`tl-dur outside tl-ev-date${dim ? " dim" : ""}`} style={after ? { left: at + 12 } : { left: at - 12 - textW }}>
          {text}
        </span>
      </>
    );
  };

  const renderBar = (e: Entity) => {
    if (e.category === "event") return renderEvent(e);
    const rawL = x(e.start_year);
    const rawR = x(e.end_year);
    const left = Math.max(-4, rawL);
    const right = Math.min(trackW + 4, rawR);
    const width = Math.max(3, right - left);
    const cutStart = rawL < 0;
    const cutEnd = rawR > trackW;
    const cont = continuation(e);
    const dur = shortDuration(e.end_year - e.start_year);
    const textW = dur.length * 6.6 + 10;
    // Duration label: inside the bar if it fits, else beside it where there is room.
    const labelPos = width >= textW + 6 ? "inside" : trackW - (left + width) >= textW ? "after" : left >= textW ? "before" : "none";
    const dim = hoverYear !== null && !(e.start_year <= hoverYear && hoverYear <= e.end_year);
    const cls = [
      "tl-bar",
      e.group ? "group" : "",
      selectedEntityId === e.id ? "selected" : "",
      dim ? "dim" : "",
      cutStart ? "cut-start" : "",
      cutEnd || cont ? "cut-end" : "",
    ].join(" ");
    return (
      <>
        <button
          className={cls}
          style={{ left, width, ["--c" as string]: colorOf(e) }}
          aria-label={`${e.name}, ${formatRange(e.start_year, e.end_year)}, lasted ${formatDuration(e.end_year - e.start_year)}`}
          onClick={() => {
            if (suppressClick.current) return;
            openGroup(e.id);
          }}
          onDoubleClick={() => focus(e.id)}
          onMouseEnter={(ev) => setTip({ e, x: ev.clientX, y: ev.clientY })}
          onMouseMove={(ev) => setTip({ e, x: ev.clientX, y: ev.clientY })}
          onMouseLeave={() => setTip(null)}
        >
          {labelPos === "inside" && <span className="tl-dur">{dur}</span>}
        </button>
        {cont && !cutEnd && <span className="tl-cont" style={{ left: left + width + 2 }} aria-hidden>→</span>}
        {labelPos === "after" && (
          <span className={`tl-dur outside${dim ? " dim" : ""}`} style={{ left: left + width + (cont && !cutEnd ? 16 : 6) }}>
            {dur}
          </span>
        )}
        {labelPos === "before" && (
          <span className={`tl-dur outside${dim ? " dim" : ""}`} style={{ left: left - textW }}>
            {dur}
          </span>
        )}
      </>
    );
  };

  const renderRow = (r: Row, i: number) => {
    if (r.kind === "lane") {
      const style = CATEGORY_STYLE[r.category];
      const [a, b] = [Math.max(-4, x(r.start)), Math.min(trackW + 4, x(r.end))];
      const status = r.collapsed
        ? "hidden"
        : r.inView === 0
          ? "none in this period"
          : r.squashed
            ? `${r.inView} · zoom in to see`
            : `${r.inView} of ${r.total} in view`;
      return (
        <div className="tl-row tl-lane" key={`lane-${r.category}`}>
          <div className="tl-label">
            <button className="tl-caret-btn" onClick={() => toggleLane(r.category)} aria-expanded={!r.collapsed} aria-label={`${r.collapsed ? "Show" : "Hide"} ${style.label}`}>
              <span className={`tl-caret${r.collapsed ? "" : " open"}`}>▶</span>
            </button>
            <span className="tl-lane-dot" style={{ background: style.color }} />
            <span className="tl-lane-name">{style.label}</span>
            <span className="tl-lane-status muted">{status}</span>
          </div>
          <div className="tl-track">
            {b > -4 && a < trackW + 4 && (
              <div className="tl-extent" style={{ left: a, width: Math.max(2, b - a), background: style.color }} />
            )}
            {(r.squashed || r.inView === 0 || r.collapsed) && (
              <button
                className="tl-fit"
                onClick={() => {
                  if (r.collapsed) toggleLane(r.category);
                  setWin(fitWindow(r.start, r.end, min, 0));
                }}
              >
                Zoom to {style.label.toLowerCase()}
              </button>
            )}
          </div>
        </div>
      );
    }
    const e = r.entity;
    const parentName = e.parent_id ? data.entityById.get(e.parent_id)?.name : undefined;
    return (
      <div
        className={`tl-row${i % 2 ? " odd" : ""}${selectedEntityId === e.id ? " selected" : ""}`}
        key={e.id}
        ref={(el) => {
          if (el) rowEls.current.set(e.id, el);
          else rowEls.current.delete(e.id);
        }}
      >
        <div className="tl-label" style={{ paddingLeft: 10 + r.depth * 18 }}>
          {r.children ? (
            <button
              className="tl-caret-btn"
              onClick={() => toggleExpanded(e.id)}
              aria-expanded={r.expanded}
              aria-label={`${r.expanded ? "Collapse" : "Expand"} ${e.name} (${r.children})`}
              title={`${r.children} periods`}
            >
              <span className={`tl-caret${r.expanded ? " open" : ""}`}>▶</span>
            </button>
          ) : (
            <span className="tl-caret-spacer" />
          )}
          <button
            className="tl-name"
            onClick={() => focus(e.id)}
            title={`${e.name}${parentName ? ` (${parentName})` : ""}: zoom to fit`}
          >
            <span className="tl-swatch" style={{ background: colorOf(e) }} />
            <span className="tl-name-text">{e.name}</span>
            {r.children ? <span className="tl-count muted">{r.children}</span> : null}
          </button>
        </div>
        <div className="tl-track">{renderBar(e)}</div>
      </div>
    );
  };

  const hoverX = hoverYear !== null ? x(hoverYear) : null;
  const eventsInView = collapsedLanes.has("event")
    ? []
    : entities.filter((e) => e.category === "event" && (e.year ?? e.start_year) >= win.start && (e.year ?? e.start_year) <= win.end);
  const eraIdx = eraIndexOf(eras, win);
  const currentEra = eras[eraIdx];
  const onEra = isEraWindow(currentEra, win);
  const earlier = stepEra(eras, win, -1);
  const later = stepEra(eras, win, 1);

  return (
    <div className={`timeline-page${selectedEntityId ? " has-card" : ""}`}>
      <header className="tl-header">
        <div className="tl-title">
          <img src="/logo-128.webp" alt="" width={30} height={30} />
          <h1>Timeline</h1>
        </div>
        <SearchBox onChoose={(e) => focus(e.id)} />
      </header>

      <nav className="tl-nav" aria-label="Move through time">
        <button
          className="tl-btn tl-step"
          onClick={() => earlier && setWin({ start: earlier.start, end: earlier.end })}
          disabled={!earlier}
          title={earlier ? `${earlier.label}: ${formatRange(earlier.start, earlier.end)} (Shift + ←)` : undefined}
        >
          ‹ <span className="tl-step-text">{earlier?.label ?? "Earlier"}</span>
        </button>
        <div className="tl-range" aria-live="polite">
          {onEra && <span className="tl-era-name">{currentEra.label}</span>}
          <span className={onEra ? "muted" : ""}>{formatRange(Math.round(win.start), Math.round(win.end))}</span>
        </div>
        <button
          className="tl-btn tl-step"
          onClick={() => later && setWin({ start: later.start, end: later.end })}
          disabled={!later}
          title={later ? `${later.label}: ${formatRange(later.start, later.end)} (Shift + →)` : undefined}
        >
          <span className="tl-step-text">{later?.label ?? "Later"}</span> ›
        </button>
        <div className="tl-zoom">
          <button className="tl-btn square" onClick={() => zoomBy(1 / 0.6)} title="Zoom out ( - )" aria-label="Zoom out">−</button>
          <button className="tl-btn square" onClick={() => zoomBy(0.6)} title="Zoom in ( + )" aria-label="Zoom in">+</button>
        </div>
      </nav>

      <div className="tl-presets" role="group" aria-label="Eras">
        {eras.map((era, i) => (
          <button
            key={era.label}
            className={`chip${i === eraIdx ? " active" : ""}`}
            aria-pressed={i === eraIdx && onEra}
            onClick={() => setWin({ start: era.start, end: era.end })}
            title={formatRange(era.start, era.end)}
          >
            {era.label}
          </button>
        ))}
        <button className="chip" onClick={() => setWin({ start: min, end: AXIS_END })}>
          All 7 million years
        </button>
        <span className="tl-hint muted">Ctrl/⌘ + scroll or pinch to zoom · drag or Shift + scroll to pan · Shift + ←/→ changes era · double-click a bar to fit</span>
      </div>

      <Overview entities={entities} win={win} min={min} onWindow={setWin} />

      <div
        className="tl-main"
        ref={mainRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => setHoverYear(null)}
      >
        <div className="tl-axis">
          <div className="tl-axis-label muted">
            {hoverYear !== null ? (
              <>
                <strong>{formatYear(Math.round(hoverYear))}</strong> · {alive} alive
              </>
            ) : (
              <>{formatRange(Math.round(win.start), Math.round(win.end))}</>
            )}
          </div>
          <div className="tl-axis-track" style={{ marginRight: scrollbarW }}>
            {tickYears.map((y) => (
              <span
                key={y}
                className="tl-tick"
                style={{
                  left: x(y),
                  // Keep labels at the very ends inside the track.
                  transform: x(y) < 30 ? "none" : x(y) > trackW - 30 ? "translateX(-100%)" : undefined,
                }}
              >
                {tickLabel(y, step)}
              </span>
            ))}
          </div>
        </div>
        <div className="tl-body" ref={bodyRef}>
          <div className="tl-rows">
            <div className="tl-gridlines" style={{ left: labelW }} aria-hidden>
              {tickYears.map((y) => (
                <span key={y} style={{ left: x(y) }} />
              ))}
              {/* A faint line down every lane at each event, to see what was around at the time. */}
              {eventsInView.map((e) => (
                <span key={e.id} className={`ev${selectedEntityId === e.id ? " selected" : ""}`} style={{ left: x(e.year ?? e.start_year) }} />
              ))}
            </div>
            {rows.map(renderRow)}
          </div>
        </div>
        {hoverX !== null && <div className="tl-guide" style={{ left: labelW + hoverX }} aria-hidden />}
      </div>

      {tip && <Tooltip tip={tip} parent={tip.e.parent_id ? data.entityById.get(tip.e.parent_id)?.name : undefined} kids={data.childrenOf.get(tip.e.id)?.length ?? 0} />}
      <InfoPanel view="timeline" />
    </div>
  );
}

function Tooltip({ tip, parent, kids }: { tip: { e: Entity; x: number; y: number }; parent?: string; kids: number }) {
  const { e } = tip;
  const cont = continuation(e);
  const flip = tip.x > window.innerWidth - 320;
  return (
    <div
      className="tl-tooltip panel"
      style={{ top: tip.y + 16, ...(flip ? { right: window.innerWidth - tip.x + 12 } : { left: tip.x + 12 }) }}
      role="tooltip"
    >
      <div className="tl-tip-name">{e.name}</div>
      {e.category === "event" ? (
        <>
          <div>{e.date_text ?? formatRange(e.start_year, e.end_year)}</div>
          <div className="muted tl-tip-summary">{firstSentence(e.description)}</div>
        </>
      ) : (
        <>
          {parent && <div className="muted">Part of {parent}</div>}
          <div>{formatRange(e.start_year, e.end_year)}</div>
          <div>
            Lasted <strong>{formatDuration(e.end_year - e.start_year)}</strong>
            {e.group && kids > 0 && <span className="muted"> · {kids} periods</span>}
          </div>
          {cont && <div className="muted">{cont}</div>}
        </>
      )}
    </div>
  );
}

/**
 * Whole-axis strip on the globe slider's piecewise scale, so deep time and the last few thousand
 * years are both visible. Shows every entity as a thin line, and the current window as a box.
 * Click to centre the window there; drag to select a new window.
 */
function Overview({ entities, win, min, onWindow }: { entities: Entity[]; win: Window; min: number; onWindow: (w: Window) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const brush = useRef<{ p0: number; moved: boolean } | null>(null);
  const [sel, setSel] = useState<[number, number] | null>(null);
  const lanes: Category[] = ["event", "species", "culture", "civilization"];
  const lines = useMemo(
    () => entities.filter((e) => !e.group).map((e) => ({ e, a: yearToPos(e.start_year), b: yearToPos(e.end_year) })),
    [entities],
  );
  const posAt = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  };
  const a = yearToPos(win.start);
  const b = yearToPos(win.end);

  return (
    <div className="tl-overview">
      <div className="tl-overview-label muted">Overview (compressed scale)</div>
      <div
        className="tl-overview-track"
        ref={ref}
        onPointerDown={(e) => {
          brush.current = { p0: posAt(e.clientX), moved: false };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const br = brush.current;
          if (!br) return;
          const p = posAt(e.clientX);
          if (!br.moved && Math.abs(p - br.p0) * ref.current!.clientWidth < 4) return;
          br.moved = true;
          setSel([Math.min(br.p0, p), Math.max(br.p0, p)]);
        }}
        onPointerUp={(e) => {
          const br = brush.current;
          brush.current = null;
          setSel(null);
          if (!br) return;
          const p = posAt(e.clientX);
          if (br.moved) {
            const [p0, p1] = [Math.min(br.p0, p), Math.max(br.p0, p)];
            onWindow(clampWindow({ start: posToYear(p0), end: posToYear(p1) }, min));
          } else {
            // Centre on the clicked point, keeping the window's apparent width on this strip.
            const half = (b - a) / 2;
            const p0 = Math.max(0, Math.min(1 - 2 * half, p - half));
            onWindow(clampWindow({ start: posToYear(p0), end: posToYear(p0 + 2 * half) }, min));
          }
        }}
      >
        <svg viewBox="0 0 1000 30" preserveAspectRatio="none" aria-hidden>
          {POS_BREAKS.slice(1, -1).map((p) => (
            <line key={p} x1={p * 1000} x2={p * 1000} y1={0} y2={30} className="tl-ov-break" />
          ))}
          {lines.map(({ e, a: la, b: lb }) => {
            const y = 4 + lanes.indexOf(e.category) * 7.3;
            return (
              <line
                key={e.id}
                x1={la * 1000}
                x2={Math.max(lb * 1000, la * 1000 + 1.2)}
                y1={y}
                y2={y}
                stroke={CATEGORY_STYLE[e.category].color}
                className="tl-ov-line"
              />
            );
          })}
        </svg>
        <div className="tl-ov-window" style={{ left: `${a * 100}%`, width: `max(4px, ${(b - a) * 100}%)` }} />
        {sel && <div className="tl-ov-brush" style={{ left: `${sel[0] * 100}%`, width: `${(sel[1] - sel[0]) * 100}%` }} />}
      </div>
      <div className="tl-overview-ticks">
        {POS_BREAKS.map((p, i) => (
          <span key={p} style={{ left: `${p * 100}%` }}>{OVERVIEW_TICKS[i]}</span>
        ))}
      </div>
    </div>
  );
}
