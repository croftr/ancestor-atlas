import { Fragment, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { CATEGORY_STYLE } from "../config";
import { navigate } from "../route";
import { MAX_YEAR } from "../time/scale";
import type { Entity } from "../types";
import { durationText, pack, rangeText, runsOn, TICKS, type Cluster, type Entry, type Region } from "./civLayout";

const ROW_H = 26;
/** Room right of 1 CE for the fading ends of spans that carried on. Matches .cv-scale.timeline in browse.css. */
const END_PAD = 28;
const GAP = 8;
const ABOUT_W = 54;
/** The fading end drawn past 1 CE on a span that carried on. */
const TAIL = 22;

interface Bar {
  id: string;
  /** The room it takes in its row: bar, label and About. */
  x0: number;
  x1: number;
  left: number;
  width: number;
  label: string;
  inside: boolean;
  /** The button: bar and label (a group's About sits over or beside it). */
  bx0: number;
  bx1: number;
  /** Where the label (when not inside the bar) and a group's About go, and the label's width (cut short with an
   * ellipsis when neither side of the bar has room for all of it). */
  labelX: number;
  labelW: number;
  aboutX: number;
  color: string;
  runsOn: boolean;
  title: string;
  entity?: Entity;
  cluster?: Cluster;
}
interface Line {
  bars: Bar[];
  /** The cluster these are the members of, when opened. */
  of?: string;
}

let ctx: CanvasRenderingContext2D | null = null;
function textWidth(text: string): number {
  ctx ??= document.createElement("canvas").getContext("2d");
  if (!ctx) return text.length * 7;
  ctx.font = `600 12px ${getComputedStyle(document.body).fontFamily}`;
  return ctx.measureText(text).width;
}

/** Dark or light text, whichever reads on the bar's colour. */
function inkOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#fff";
  const n = parseInt(m[1], 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? "#10131f" : "#fff";
}

/**
 * The Civilizations page's timeline: a lane per region, every civilization a bar on one time axis (the scale pinned
 * above, `.cv-scale.timeline`), packed into as few rows as their bars and names allow. A group or family is one bar
 * that opens into its members' bars, drawn just under it; a group's About opens its page. While searching, only the
 * matches show, their groups and families open.
 */
export default function CivTimeline({
  regions,
  axis,
  expanded,
  onToggle,
  matched,
}: {
  regions: Region[];
  axis: [number, number];
  expanded: Set<string>;
  onToggle: (id: string) => void;
  matched: Set<string> | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const lanes = useMemo(() => {
    if (!width) return [];
    const x = (y: number) => ((y - axis[0]) / (axis[1] - axis[0])) * (width - END_PAD);
    const bar = (id: string, span: { start_year: number; end_year: number }, label: string, color: string, extra: Partial<Bar>): Bar => {
      const left = x(span.start_year);
      const w = Math.max(x(span.end_year) - left, 4);
      const tail = runsOn(span) ? TAIL : 0;
      const about = extra.cluster?.entity ? ABOUT_W : 0;
      const lw = textWidth(label) + 14;
      // The label inside the bar if it fits, else on the side with room for it (after the bar first), else on the
      // roomier side cut short; with no room either side, inside the bar cut short.
      const roomAfter = width - (left + w + tail + 2) - about;
      const roomBefore = left - about - 4;
      const side: "inside" | "after" | "before" =
        w >= lw + about ? "inside" : lw <= roomAfter ? "after" : lw <= roomBefore ? "before" : Math.max(roomAfter, roomBefore) >= 48 ? (roomAfter >= roomBefore ? "after" : "before") : "inside";
      const labelW = side === "inside" ? Math.min(lw, w) : Math.min(lw, side === "after" ? roomAfter : roomBefore);
      const inside = side === "inside";
      let labelX = left;
      let aboutX = inside ? (w >= lw + about ? left + lw : left + w + tail + 2) : left;
      let bx0 = left;
      let bx1 = left + w + tail;
      if (side === "after") {
        labelX = left + w + tail + 2;
        aboutX = labelX + labelW;
        bx1 = aboutX;
      } else if (side === "before") {
        aboutX = left - about - 2;
        labelX = aboutX - labelW;
        bx0 = labelX;
      }
      return {
        id,
        x0: bx0,
        x1: Math.max(bx1, aboutX + about),
        bx0,
        bx1,
        left,
        width: w,
        label,
        inside,
        labelX,
        labelW,
        aboutX,
        color,
        runsOn: runsOn(span),
        title: `${label} · ${rangeText(span)} · ${durationText(span)}`,
        ...extra,
      };
    };
    const ofEntity = (e: Entity) => bar(e.id, e, e.name, e.color ?? CATEGORY_STYLE.civilization.color, { entity: e });

    return regions
      .map((r) => {
        // While searching: only matches, their clusters opened and cut down to them.
        const entries = r.entries
          .map((e): Entry | null => {
            if (!matched) return e;
            if (e.kind === "single") return matched.has(e.id) ? e : null;
            const all = !!e.entity && matched.has(e.entity.id);
            const members = all ? e.members : e.members.filter((m) => matched.has(m.id));
            return members.length || all ? { ...e, members } : null;
          })
          .filter((e): e is Entry => !!e);
        const isOpen = (c: Cluster) => !!matched || expanded.has(c.id);
        const top = entries.map((e) =>
          e.kind === "single"
            ? ofEntity(e.entity)
            : bar(e.id, { start_year: e.start, end_year: e.end }, `${isOpen(e) ? "▾" : "▸"} ${e.title} · ${e.members.length}`, e.color ?? CATEGORY_STYLE.civilization.color, { cluster: e }),
        );
        const lines: Line[] = [];
        for (const row of pack(top, GAP)) {
          lines.push({ bars: row });
          for (const b of row) {
            if (!b.cluster || !isOpen(b.cluster)) continue;
            for (const sub of pack(b.cluster.members.map(ofEntity), GAP)) lines.push({ bars: sub, of: b.cluster.id });
          }
        }
        return { region: r, lines, count: entries.reduce((n, e) => n + (e.kind === "single" ? 1 : e.members.length), 0) };
      })
      .filter((l) => l.lines.length > 0);
  }, [regions, axis, width, expanded, matched]);

  const x = (y: number) => ((y - axis[0]) / (axis[1] - axis[0])) * (width - END_PAD);
  return (
    <div ref={ref} className="ctl">
      {lanes.map(({ region, lines, count }) => {
        // The band behind each opened cluster's member rows.
        const bands: { id: string; top: number; rows: number; left: number; right: number; color?: string }[] = [];
        lines.forEach((l, i) => {
          if (!l.of) return;
          const b = bands.find((x) => x.id === l.of && x.top + x.rows === i);
          const left = Math.min(...l.bars.map((x) => x.x0));
          const right = Math.max(...l.bars.map((x) => x.x1));
          if (b) {
            b.rows++;
            b.left = Math.min(b.left, left);
            b.right = Math.max(b.right, right);
          } else bands.push({ id: l.of, top: i, rows: 1, left, right, color: l.bars[0]?.color });
        });
        return (
          <section key={region.name} className="ctl-lane" aria-label={region.name}>
            <h2>
              {region.name} <span className="muted">{count} civilization{count === 1 ? "" : "s"}</span>
            </h2>
            <div className="ctl-track" style={{ height: lines.length * ROW_H + 6 }}>
              {TICKS.map((y) => (
                <span key={y} className={`ctl-grid${y === MAX_YEAR ? " end" : ""}`} style={{ left: x(y) }} aria-hidden />
              ))}
              {bands.map((b) => (
                <span
                  key={b.id}
                  className="ctl-band"
                  style={{ top: b.top * ROW_H, height: b.rows * ROW_H + 2, left: b.left - 6, width: b.right - b.left + 12, "--band": b.color } as CSSProperties}
                  aria-hidden
                />
              ))}
              {lines.flatMap((l, i) =>
                l.bars.map((b) => {
                  const open = !!b.cluster && (!!matched || expanded.has(b.cluster.id));
                  const top = i * ROW_H + 3;
                  const vars = { "--bar": b.color, "--ink": inkOn(b.color) } as CSSProperties;
                  return (
                    <Fragment key={`${l.of ?? ""}${b.id}`}>
                      <button
                        className={`ctl-bar${b.cluster ? " cluster" : ""}${l.of ? " member" : ""}`}
                        style={{ ...vars, left: b.bx0, top, width: b.bx1 - b.bx0 }}
                        title={b.title}
                        aria-expanded={b.cluster ? open : undefined}
                        disabled={!!b.cluster && !!matched}
                        onClick={() => (b.cluster ? onToggle(b.cluster.id) : navigate("civilizations", b.entity!.id))}
                      >
                        <span className={`ctl-fill${b.runsOn ? " runs-on" : ""}`} style={{ left: b.left - b.bx0, width: b.width }}>
                          {b.inside && <span className="ctl-label">{b.label}</span>}
                        </span>
                        {!b.inside && <span className="ctl-label out" style={{ left: b.labelX - b.bx0, width: b.labelW }}>{b.label}</span>}
                      </button>
                      {b.cluster?.entity && (
                        <button className="ctl-about" style={{ left: b.aboutX, top }} onClick={() => navigate("civilizations", b.cluster!.entity!.id)}>
                          About
                        </button>
                      )}
                    </Fragment>
                  );
                }),
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
