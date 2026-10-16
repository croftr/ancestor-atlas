import { useEffect } from "react";
import { useStore } from "../store";
import { navigate } from "../route";
import { formatRange, formatYear } from "../time/scale";
import { useData } from "../map/data";
import { aliveAt, dnaSiteById, useDna } from "./data";
import { classOf, classesFor, OTHER_COLOR } from "./haplogroups";
import { AADR_CITATION, AADR_DATASET_URL, type DnaData, type DnaPerson } from "./types";
import { DnaIcon } from "./DnaIcon";
import "./dna.css";

const SEX: Record<string, string> = { M: "Male", F: "Female", U: "Sex unknown" };

/** A swatch for a haplogroup in the current colour mode (none when the mode is something else). */
function Swatch({ h, mode }: { h: string; mode: "y" | "mt" }) {
  const colourMode = useStore((s) => s.dnaColour);
  if (colourMode !== mode || !h) return null;
  const k = classOf(h, mode);
  const color = classesFor(mode).find((c) => c.key === k)?.color ?? OTHER_COLOR;
  return <span className="dna-swatch" style={{ background: color }} aria-hidden="true" />;
}

function Person({ p, d }: { p: DnaPerson; d: DnaData }) {
  const entities = useData()?.entityById;
  const [id, , , dateText, sex, y, mt, group, pub, culture] = p;
  const [pubLabel, pubUrl] = d.pubs[pub] ?? ["", ""];
  const cultureName = culture ? (entities?.get(culture)?.name ?? culture) : "";
  return (
    <li className="dna-person">
      <div className="dna-person-head">
        <strong>{id}</strong>
        <span className="muted">{SEX[sex] ?? sex}</span>
      </div>
      <div className="muted">{dateText}</div>
      <div className="dna-haplos">
        {sex === "M" && (
          <span title="Y-chromosome haplogroup: passed from father to son">
            <Swatch h={y} mode="y" />Father's line (Y): {y || "not known"}
          </span>
        )}
        <span title="Mitochondrial (mtDNA) haplogroup: passed from a mother to all her children">
          <Swatch h={mt} mode="mt" />Mother's line (mt): {mt || "not known"}
        </span>
      </div>
      <div className="dna-group">
        <span className="muted" title="The label the study gave this person's group">Group:</span> {group}
        {cultureName && (
          <>
            {" · "}
            <button className="link" onClick={() => navigate("cultures", culture)}>
              {cultureName} →
            </button>
          </>
        )}
      </div>
      {pubLabel && (
        <div className="dna-pub">
          {pubUrl ? (
            <a href={pubUrl} target="_blank" rel="noreferrer">
              {pubLabel}
            </a>
          ) : (
            pubLabel
          )}
        </div>
      )}
    </li>
  );
}

/** The card for an ancient DNA site: who was sampled there, those dated to the slider's year first. */
export default function DnaCard() {
  const site = useStore((s) => s.dnaSite);
  const covered = useStore((s) => s.selectedId !== null || s.groupId !== null);
  const year = useStore((s) => s.year);
  const close = () => useStore.getState().openDnaSite(null);
  const d = useDna(site !== null);
  const s = dnaSiteById(d, site);

  useEffect(() => {
    if (!site) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !useStore.getState().selectedId) useStore.getState().openDnaSite(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [site]);

  if (!site || covered || !d || !s) return null;
  const now = s.people.filter((p) => aliveAt(p, year));
  const rest = s.people.filter((p) => !aliveAt(p, year));

  return (
    <div className="panel info-panel dna-card" role="dialog" aria-label={`Ancient DNA: ${s.name}`}>
      <button className="close" onClick={close} aria-label="Close">
        ✕
      </button>
      <div className="info-head">
        <div className="dna-kicker">
          <DnaIcon size={16} />
          Ancient DNA
        </div>
        <h2>{s.name}</h2>
        <div className="muted">{s.place ? `${s.place}, ${s.country}` : s.country}</div>
        <div className="muted">{formatRange(s.start, s.end)}</div>
      </div>
      <p className="dna-summary">
        {s.people.length === 1 ? "One person" : `${s.people.length} people`} sampled here
        {now.length > 0 && now.length < s.people.length && `, ${now.length} dated around ${formatYear(year)}`}.
      </p>
      {now.length > 0 && (
        <>
          {rest.length > 0 && <h3 className="dna-section">Around {formatYear(year)}</h3>}
          <ul className="dna-people">
            {now.map((p) => (
              <Person key={p[0]} p={p} d={d} />
            ))}
          </ul>
        </>
      )}
      {rest.length > 0 && (
        <>
          <h3 className="dna-section">{now.length ? "Others from this site" : "People from this site"}</h3>
          <ul className="dna-people">
            {rest.map((p) => (
              <Person key={p[0]} p={p} d={d} />
            ))}
          </ul>
        </>
      )}
      <div className="dna-credit muted">
        Data:{" "}
        <a href={AADR_DATASET_URL} target="_blank" rel="noreferrer">
          Allen Ancient DNA Resource {d.release}
        </a>{" "}
        (CC0), with each person's original publication. {AADR_CITATION}
      </div>
    </div>
  );
}
