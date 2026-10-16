import { useMemo, useState } from "react";
import { useStore } from "../store";
import { aliveAt, useDna } from "./data";
import { DnaBadge } from "./DnaIcon";
import { classesFor, OTHER_COLOR, PLAIN_COLOR, type DnaColour } from "./haplogroups";
import "./dna.css";

/** What the colours mean, in a line under the switch. */
const NOTE: Record<DnaColour, string> = {
  y: "Colour: the father's line most common at each site. Bigger dots: more people.",
  mt: "Colour: the mother's line most common at each site. Bigger dots: more people.",
  plain: "Bigger dots: more people sampled there.",
};

const MODES: [DnaColour, string, string][] = [
  ["y", "Father's line", "Y-DNA haplogroup: passed from father to son"],
  ["mt", "Mother's line", "Mitochondrial (mtDNA) haplogroup: passed from a mother to all her children"],
  ["plain", "Sites only", "One colour for every site"],
];

/** While the ancient DNA layer is on (switched in Settings): what the dots are, the colour switch and its key, and a
 * short explainer for newcomers. `panel`: a panel of its own in the legend's column (desktop); otherwise a section at
 * the foot of the legend (small screens). */
export default function DnaLegend({ panel = false }: { panel?: boolean }) {
  const on = useStore((s) => s.dna);
  const mode = useStore((s) => s.dnaColour);
  const setMode = useStore((s) => s.setDnaColour);
  const year = useStore((s) => s.year);
  const d = useDna(on);
  const [tip, setTip] = useState(false);
  const sitesNow = useMemo(
    () => (d ? d.sites.filter((s) => s.start <= year && year <= s.end && s.people.some((p) => aliveAt(p, year))).length : null),
    [d, year],
  );
  if (!on) return null;
  const classes = classesFor(mode);
  return (
    <section className={panel ? "panel dna-legend dna-panel" : "dna-legend"} aria-label="Ancient DNA">
      <div className="dna-legend-head">
        <DnaBadge size={22} />
        <span className="dna-legend-title">Ancient DNA</span>
        {/* What the dots are: shown on hover or focus, and kept open by a click (for touch). */}
        <button
          type="button"
          className={`dna-info${tip ? " open" : ""}`}
          aria-label="About this layer"
          aria-expanded={tip}
          aria-describedby="dna-info-tip"
          onClick={() => setTip((t) => !t)}
          onBlur={() => setTip(false)}
        >
          i
        </button>
        <span id="dna-info-tip" role="tooltip" className="dna-info-tip">
          Each dot is a burial site where the DNA of people from this time has been read. Tap one to see who was found.
        </span>
        {sitesNow !== null && (
          <span className="dna-legend-count">
            {sitesNow.toLocaleString()} {sitesNow === 1 ? "site" : "sites"} now
          </span>
        )}
      </div>
      <div className="dna-modes" role="radiogroup" aria-label="Colour ancient DNA sites by">
        {MODES.map(([m, label, tip]) => (
          <button key={m} role="radio" aria-checked={m === mode} className={m === mode ? "active" : ""} onClick={() => setMode(m)} title={tip}>
            {label}
          </button>
        ))}
      </div>
      <div className="dna-legend-note muted">{NOTE[mode]}</div>
      <ul className="dna-key">
        {mode === "plain" ? (
          <li>
            <span className="dna-swatch" style={{ background: PLAIN_COLOR }} />
            <span>Sampled people</span>
          </li>
        ) : (
          <>
            {classes.map((c) => (
              <li key={c.key} title={c.note}>
                <span className="dna-swatch" style={{ background: c.color }} />
                <span className="dna-key-label">{c.label}</span>
                <span className="muted">{c.short}</span>
              </li>
            ))}
            <li title="Any other haplogroup">
              <span className="dna-swatch" style={{ background: OTHER_COLOR }} />
              <span className="dna-key-label">Other</span>
              <span className="muted">any other line</span>
            </li>
            <li>
              <span className="dna-swatch hollow" />
              <span className="dna-key-label">Not known</span>
              <span className="muted">{mode === "y" ? "often only women sampled" : "not read"}</span>
            </li>
          </>
        )}
      </ul>
      <details className="dna-explain">
        <summary>What are father's and mother's lines?</summary>
        <p>
          A son inherits his Y chromosome from his father, and everyone inherits their mitochondrial DNA (mtDNA) from
          their mother, almost unchanged. Rare small changes build up over the generations, so these lines branch like a
          family tree. Each branch is called a <em>haplogroup</em> and given a code such as R1b or U5.
        </p>
        <p>
          A haplogroup is one line among thousands of ancestors, not a person's whole ancestry. But where and when a line
          turns up shows how peoples moved and mixed: Europe's hunter-gatherers carried mostly U and I; farmers from
          Anatolia brought G2 and H; herders from the steppe brought R1b and R1a after 3000 BCE.
        </p>
      </details>
    </section>
  );
}
