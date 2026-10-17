import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { navigate } from "../route";
import { useStore } from "../store";
import { formatRange } from "../time/scale";
import type { Entity } from "../types";
import { scaleLabel, scaleTicks } from "./browse";
import { layoutTree, leavesOf, REFS, type Clade, type Support } from "./phylogeny";
import "./family-tree.css";

/** Row height (px), the room kept left of the tree's root and right of the bars, and the step between nested branching points. */
const ROW = 40;
const PAD_L = 8;
const PAD_R = 10;
const GAP = 13;

const SUPPORT: Record<Support, { label: string; hint: string }> = {
  supported: { label: "Well supported", hint: "most analyses agree" },
  debated: { label: "Debated", hint: "a common reading that others dispute" },
  unresolved: { label: "Unresolved", hint: "they belong here, but how they relate is not known" },
};

/**
 * The species as a family tree: each species a bar over its span, joined at branching points that
 * each say what they rest on. A name opens the species, a bar shows it on the globe at its time, a
 * branching point opens its notes. Time runs on the fourth root of years ago: the list's slider scale
 * leaves the 20 species before a million years ago a tenth of the width, too little for the branches,
 * and even a log scale gives the Pliocene, where most branching is, under a fifth.
 */
export default function FamilyTree({ species }: { species: Entity[] }) {
  const focusEntity = useStore((s) => s.focusEntity);
  const byId = useMemo(() => new Map(species.map((s) => [s.id, s])), [species]);
  const { rows, nodes } = useMemo(() => layoutTree((id) => byId.get(id)?.start_year ?? 0), [byId]);
  const [selected, setSelected] = useState<string | null>(null);

  // The track's width in px, so the lines stay crisp and the dots round at any width.
  const trackRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  const ago = (year: number) => Math.max(0, 1 - year) ** 0.25;
  const oldest = ago(Math.min(...species.map((s) => s.start_year)));
  const newest = ago(Math.max(...species.map((s) => s.end_year)));
  const at = (year: number) => (oldest - ago(year)) / Math.max(1e-9, oldest - newest); // 0..1, oldest at 0
  let left = PAD_L; // where the oldest species starts, moved right until the root fits
  const x = (year: number) => left + at(year) * Math.max(0, width - left - PAD_R);
  const y = (row: number) => row * ROW + ROW / 2;

  // Each branching point sits a step left of its leftmost child (a species' first appearance or a
  // nested branching point), so nested points that share an oldest member still read apart. On a
  // narrow track (phones) the step shrinks, as the early species start only pixels apart.
  const gap = Math.min(GAP, Math.max(6, width / 60));
  const nodeX = new Map<string, number>();
  const place = () => {
    for (const n of [...nodes].reverse()) {
      const xs = n.children.map((c) => (c.leaf ? x(byId.get(c.id)?.start_year ?? 0) : nodeX.get(c.id)!));
      nodeX.set(n.clade.id, Math.min(...xs) - gap);
    }
  };
  place();
  const rootX = nodeX.get(nodes[0].clade.id) ?? PAD_L;
  if (rootX < PAD_L) {
    left += PAD_L - rootX;
    place();
  }

  const chosen = selected ? nodes.find((n) => n.clade.id === selected)?.clade : undefined;
  const inChosen = useMemo(() => new Set(chosen ? leavesOf(chosen) : []), [chosen]);
  const lit = (id: string) => !chosen || inChosen.has(id);
  const ticks = scaleTicks((year) => at(year) * 100);
  const toggle = (id: string) => setSelected((s) => (s === id ? null : id));
  const onNodeKey = (e: KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle(id);
    }
  };
  const showOnGlobe = (id: string) => {
    focusEntity(id);
    navigate("globe");
  };

  return (
    <div className={`ft${chosen ? " has-chosen" : ""}`}>
      <div className="ft-tree">
        <div className="ft-scale" aria-hidden="true">
          <span className="ft-scale-track">
            {width > 0 && ticks.map((t) => (
              <span key={t.y} className="sp-tick" style={{ left: x(t.y) }}>
                {scaleLabel(t.y)}
              </span>
            ))}
          </span>
          <span className="ft-scale-caption">years ago</span>
        </div>
        <div className="ft-body" style={{ height: rows.length * ROW }}>
          <ol className="ft-names">
            {rows.map((r) => {
              const s = byId.get(r.id);
              if (!s) return null;
              return (
                <li key={r.id} className={lit(r.id) ? "" : "dim"}>
                  <button className="ft-name" onClick={() => navigate("species", r.id)} title={`${s.name}: ${formatRange(s.start_year, s.end_year)}`}>
                    {s.name}
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="ft-track" ref={trackRef}>
            {width > 0 && (
              <svg width={width} height={rows.length * ROW} role="group" aria-label="Family tree">
                {ticks.map((t) => <line key={t.y} className="ft-grid" x1={x(t.y)} x2={x(t.y)} y1={0} y2={rows.length * ROW} />)}
                {nodes.map((n) => {
                  const nx = nodeX.get(n.clade.id)!;
                  const ys = n.children.map((c) => y(c.row));
                  const on = !chosen || leavesOf(n.clade).every((id) => inChosen.has(id));
                  return (
                    <g key={n.clade.id} className={`ft-link ${n.clade.support}${on ? "" : " dim"}`}>
                      <line x1={nx} x2={nx} y1={Math.min(...ys)} y2={Math.max(...ys)} />
                      {n.children.map((c) => (
                        <line key={c.id} x1={nx} y1={y(c.row)} y2={y(c.row)} x2={c.leaf ? x(byId.get(c.id)?.start_year ?? 0) : nodeX.get(c.id)!} />
                      ))}
                    </g>
                  );
                })}
                {rows.map((r) => {
                  const s = byId.get(r.id);
                  if (!s) return null;
                  const x0 = x(s.start_year);
                  return (
                    <g key={r.id} className={`ft-bar${lit(r.id) ? "" : " dim"}`} onClick={() => showOnGlobe(r.id)}>
                      <title>{`${s.name}, ${formatRange(s.start_year, s.end_year)}. Show on the globe`}</title>
                      <rect className="ft-hit" x={x0 - 4} y={y(r.row) - ROW / 2} width={Math.max(8, x(s.end_year) - x0 + 8)} height={ROW} />
                      <rect x={x0} y={y(r.row) - 5} width={Math.max(4, x(s.end_year) - x0)} height={10} rx={5} />
                    </g>
                  );
                })}
                {nodes.map((n) => {
                  const nx = nodeX.get(n.clade.id)!;
                  const ny = y(n.row);
                  const sel = n.clade.id === selected;
                  return (
                    <g
                      key={n.clade.id}
                      className={`ft-node ${n.clade.support}${sel ? " selected" : ""}`}
                      role="button"
                      tabIndex={0}
                      aria-pressed={sel}
                      aria-label={`${n.clade.label}: ${SUPPORT[n.clade.support].label}`}
                      onClick={() => toggle(n.clade.id)}
                      onKeyDown={(e) => onNodeKey(e, n.clade.id)}
                    >
                      <title>{`${n.clade.label} (${SUPPORT[n.clade.support].label.toLowerCase()})`}</title>
                      <circle className="ft-hit" cx={nx} cy={ny} r={13} />
                      <circle className="ft-dot" cx={nx} cy={ny} r={sel ? 7 : 5.5} />
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>
      </div>

      <aside className="ft-side" aria-live="polite">
        {chosen ? <CladeNotes clade={chosen} byId={byId} onClose={() => setSelected(null)} /> : <TreeKey />}
      </aside>
    </div>
  );
}

/** Before anything is picked: how to read the tree. */
function TreeKey() {
  return (
    <div className="ft-panel ft-key">
      <h2>Reading the tree</h2>
      <p>
        Each bar is a species, from its first to its last known fossil, on a scale that opens out the deep past. Lines join
        species at the points where their lines are thought to have branched; a branching point is drawn just before its
        oldest member, as the fossils don't date the splits themselves.
      </p>
      <ul className="ft-legend">
        {(Object.keys(SUPPORT) as Support[]).map((k) => (
          <li key={k}>
            <svg width="44" height="14" aria-hidden="true" className={`ft-link ${k}`}>
              <line x1="2" x2="30" y1="7" y2="7" />
              <g className={`ft-node ${k}`}><circle className="ft-dot" cx="36" cy="7" r="5" /></g>
            </svg>
            <span><b>{SUPPORT[k].label}</b>: {SUPPORT[k].hint}</span>
          </li>
        ))}
      </ul>
      <p className="muted">
        Tap a branching point for what it rests on, a name for the species, a bar to see it on the globe. No single study
        places every species, so the tree is put together point by point from the studies named under each.
      </p>
    </div>
  );
}

function CladeNotes({ clade, byId, onClose }: { clade: Clade; byId: Map<string, Entity>; onClose: () => void }) {
  const members = leavesOf(clade).map((id) => byId.get(id)).filter((s): s is Entity => !!s);
  return (
    <div className="ft-panel">
      <button className="ft-close" onClick={onClose} aria-label="Close">×</button>
      <span className={`ft-support ${clade.support}`}>{SUPPORT[clade.support].label}</span>
      <h2>{clade.label}</h2>
      <p>{clade.note}</p>
      <p className="ft-members muted">
        {members.length} species: {members.map((s) => s.name.replace(/ \(.*\)$/, "")).join(", ")}
      </p>
      <h3>Based on</h3>
      <ul className="ft-refs">
        {clade.refs.map((r) => <li key={r}>{REFS[r]}</li>)}
      </ul>
    </div>
  );
}
