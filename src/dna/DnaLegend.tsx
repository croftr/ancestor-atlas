import { useStore } from "../store";
import { classesFor, OTHER_COLOR, PLAIN_COLOR, type DnaColour } from "./haplogroups";
import "./dna.css";

const NOTE: Record<DnaColour, string> = {
  y: "Each site shows the commonest father's line (Y haplogroup) among the people dated to this time",
  mt: "Each site shows the commonest mother's line (mtDNA haplogroup) among the people dated to this time",
  plain: "One point per site with people dated to this time; bigger means more people",
};

const MODES: [DnaColour, string][] = [
  ["y", "Y-DNA"],
  ["mt", "mtDNA"],
  ["plain", "Plain"],
];

/** Under the legend while the ancient DNA layer is on: the colour switch and its key. */
export default function DnaLegend() {
  const on = useStore((s) => s.dna);
  const mode = useStore((s) => s.dnaColour);
  const setMode = useStore((s) => s.setDnaColour);
  const setDna = useStore((s) => s.setDna);
  if (!on) return null;
  const classes = classesFor(mode);
  return (
    <div className="dna-legend">
      <div className="dna-legend-head">
        <span className="dna-legend-title" title={NOTE[mode]}>
          Ancient DNA
        </span>
        <div className="dna-modes" role="radiogroup" aria-label="Colour ancient DNA sites by">
          {MODES.map(([m, label]) => (
            <button key={m} role="radio" aria-checked={m === mode} className={m === mode ? "active" : ""} onClick={() => setMode(m)}>
              {label}
            </button>
          ))}
        </div>
        <button className="link" onClick={() => setDna(false)} title="Hide the ancient DNA layer">
          Hide
        </button>
      </div>
      <ul className="dna-key" title={NOTE[mode]}>
        {mode === "plain" ? (
          <li>
            <span className="dna-swatch" style={{ background: PLAIN_COLOR }} /> Sampled genomes; size: how many
          </li>
        ) : (
          <>
            {classes.map((c) => (
              <li key={c.key} title={c.note}>
                <span className="dna-swatch" style={{ background: c.color }} /> {c.label}
              </li>
            ))}
            <li>
              <span className="dna-swatch" style={{ background: OTHER_COLOR }} /> Other
            </li>
            <li title={mode === "y" ? "Only women sampled, or no Y haplogroup called" : "No mtDNA haplogroup called"}>
              <span className="dna-swatch hollow" /> Not known
            </li>
          </>
        )}
      </ul>
    </div>
  );
}
