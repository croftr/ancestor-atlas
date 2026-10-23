import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useData } from "../map/data";
import { navigate } from "../route";
import { showSite } from "../globeLink";
import { CategoryBadge } from "../ui/CategoryIcon";
import { UpdatesIcon } from "../ui/SideNav";
import Totals from "../browse/Totals";
import type { Category } from "../types";
import type { LogDetails, LogEntry, LogSite } from "./types";
import { describeChange, entryChips, formatDay, groupByEntity, PAGE_OF, plural, SOURCE_NAMES, useDetails, useLog, type SiteGroup } from "./updates";
import "../events/events-page.css";
import "../browse/browse.css";
import "./updates.css";

const ACCENT = "#7fc8f8";
/** Sites shown per group before "Show all". */
const FIRST = 8;

/** From a tap: open the site's card on the globe. */
function goToSite(id: string) {
  if (showSite(id)) navigate("globe");
}

function SiteRow({ site, note, onMap }: { site: LogSite; note?: string; onMap: boolean | null }) {
  return (
    <li className="up-site">
      <span className="up-site-name">{site.label ?? site.id}</span>
      {site.date_text && <span className="up-site-date muted">{site.date_text}</span>}
      {note && <span className="up-site-note">{note}</span>}
      {onMap === true && (
        <button className="link up-site-go" onClick={() => goToSite(site.id)}>
          Show on the globe
        </button>
      )}
      {onMap === false && <span className="muted up-site-go">not on the globe now</span>}
    </li>
  );
}

/** One group of sites (all a culture's new sites, say), the first few shown, the rest behind "Show all". */
function Group<T extends LogSite>({ group, note, onMap }: { group: SiteGroup<T>; note?: (s: T) => string; onMap: (id: string) => boolean | null }) {
  const [all, setAll] = useState(false);
  const shown = all ? group.sites : group.sites.slice(0, FIRST);
  const page = PAGE_OF[group.category];
  return (
    <div className="up-group">
      <h4>
        <CategoryBadge category={group.category as Category} decorative size={20} />
        {page ? (
          <button className="link up-entity" onClick={() => navigate(page, group.entity_id)}>
            {group.entity}
          </button>
        ) : (
          group.entity
        )}
        <span className="muted up-count">{group.sites.length.toLocaleString("en-US")}</span>
      </h4>
      <ul>
        {shown.map((s) => (
          <SiteRow key={s.id} site={s} note={note?.(s)} onMap={onMap(s.id)} />
        ))}
      </ul>
      {group.sites.length > FIRST && (
        <button className="link up-more" onClick={() => setAll((x) => !x)}>
          {all ? "Show fewer" : `Show all ${group.sites.length.toLocaleString("en-US")}`}
        </button>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="up-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function Details({ details, onMap, entityName }: { details: LogDetails; onMap: (id: string) => boolean | null; entityName: (id: string) => string }) {
  const { added, removed, changed, entities, dna, held } = details;
  return (
    <div className="up-details">
      {entities.added.length > 0 && (
        <Section title="New in the atlas">
          <ul className="up-entities">
            {entities.added.map((e) => (
              <li key={e.id}>
                <CategoryBadge category={e.category as Category} decorative size={20} />
                {PAGE_OF[e.category] ? (
                  <button className="link" onClick={() => navigate(PAGE_OF[e.category], e.id)}>
                    {e.name}
                  </button>
                ) : (
                  e.name
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}
      {added.length > 0 && (
        <Section title={`Sites added (${added.length.toLocaleString("en-US")})`}>
          {groupByEntity(added).map((g) => (
            <Group key={g.entity_id} group={g} onMap={onMap} />
          ))}
        </Section>
      )}
      {changed.length > 0 && (
        <Section title={`Sites changed (${changed.length.toLocaleString("en-US")})`}>
          {groupByEntity(changed).map((g) => (
            <Group key={g.entity_id} group={g} note={(s) => describeChange(s.fields, s.was)} onMap={onMap} />
          ))}
        </Section>
      )}
      {removed.length > 0 && (
        <Section title={`Sites removed (${removed.length.toLocaleString("en-US")})`}>
          {groupByEntity(removed).map((g) => (
            <Group key={g.entity_id} group={g} onMap={() => null} />
          ))}
        </Section>
      )}
      {entities.changed.length > 0 && (
        <Section title="Entries updated">
          <ul className="up-plain">
            {entities.changed.map((e) => (
              <li key={e.id}>
                {e.name} <span className="muted">({e.fields.join(", ")})</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {entities.removed.length > 0 && (
        <Section title="Taken out of the atlas">
          <ul className="up-plain">
            {entities.removed.map((e) => (
              <li key={e.id}>{e.name}</li>
            ))}
          </ul>
        </Section>
      )}
      {(dna.peopleAdded > 0 || dna.peopleRemoved > 0 || dna.release) && (
        <Section title="Ancient DNA">
          <p className="up-line">
            {dna.release && <>New release of the Allen Ancient DNA Resource ({dna.release.from} to {dna.release.to}). </>}
            {dna.peopleAdded > 0 && <>{plural(dna.peopleAdded, "ancient genome")} added</>}
            {dna.peopleAdded > 0 && dna.peopleRemoved > 0 && ", "}
            {dna.peopleRemoved > 0 && <>{plural(dna.peopleRemoved, "genome")} taken out</>}
            {dna.sitesAdded.length > 0 && <>, from {plural(dna.sitesAdded.length, "new site")}</>}.
          </p>
          {dna.sitesAdded.length > 0 && (
            <ul className="up-plain up-columns">
              {[...dna.sitesAdded].sort((a, b) => b.people - a.people).slice(0, 30).map((s) => (
                <li key={s.id}>
                  {s.name} <span className="muted">{s.country} · {s.people}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}
      {held.length > 0 && (
        <Section title={`Held back for checking (${held.length.toLocaleString("en-US")})`}>
          <p className="up-line muted">
            Not on the globe: these looked doubtful next to what the atlas already had, so they wait until a person has
            checked them against their sources.
          </p>
          <ul className="up-held">
            {held.map((h) => (
              <li key={h.id}>
                <span className="up-site-name">{h.label || h.id}</span>
                {h.kind === "feature" && <span className="muted"> · {entityName(h.entity_id)}</span>}
                <span className="up-site-note">{h.reason}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Entry({ entry, initiallyOpen, onMap, entityName }: { entry: LogEntry; initiallyOpen: boolean; onMap: (id: string) => boolean | null; entityName: (id: string) => string }) {
  const [open, setOpen] = useState(initiallyOpen);
  const details = useDetails(entry.id, open);
  const chips = entryChips(entry);
  return (
    <article className="up-entry" aria-labelledby={`up-${entry.id}`}>
      <header>
        <h2 id={`up-${entry.id}`}>{formatDay(entry.date)}</h2>
        {entry.sources.length > 0 && (
          <ul className="up-sources">
            {entry.sources.map((s) => (
              <li key={s.id}>
                <strong>{SOURCE_NAMES[s.id] ?? s.id}</strong> <span className="muted">{s.from} → {s.to}</span>
              </li>
            ))}
          </ul>
        )}
        {chips.length > 0 ? (
          <ul className="up-chips">
            {chips.map((c) => (
              <li key={c.text} className={`up-chip ${c.tone}`}>
                {c.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted up-line">Sources refreshed; nothing on the globe changed.</p>
        )}
      </header>
      <details open={initiallyOpen} onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary>What changed</summary>
        {details === undefined && <p className="muted up-line">Loading…</p>}
        {details === null && <p className="muted up-line">The details of this update could not be loaded.</p>}
        {details && <Details details={details} onMap={onMap} entityName={entityName} />}
      </details>
    </article>
  );
}

/**
 * Data updates page (#/updates): every published data update, newest first (public/data/changelog.json, written by
 * `npm run data:update -- --publish`; docs/data-updates.md). Each entry names the sources that moved on and counts
 * what changed; opening it loads the list of sites (changelog/<id>.json), each with a way to it on the globe.
 */
export default function UpdatesPage() {
  const log = useLog();
  const data = useData();
  const ids = useMemo(() => (data ? new Set(data.features.map((f) => f.id)) : null), [data]);
  // Whether a site is on the globe now (null while the data loads: no link either way yet).
  const onMap = (id: string) => (ids ? ids.has(id) : null);
  const entityName = (id: string) => data?.entityById.get(id)?.name ?? id;

  const sum = (pick: (e: LogEntry) => number) => (log ?? []).reduce((n, e) => n + pick(e), 0);
  const sitesAdded = sum((e) => Object.values(e.added).reduce<number>((a, b) => a + (b ?? 0), 0));

  return (
    <div className="events-page br-page up-page" style={{ "--accent": ACCENT } as CSSProperties}>
      <header className="ev-header br-intro">
        <div className="ev-title">
          <h1 className="cat-title">
            <span className="up-title-icon">{UpdatesIcon}</span>
            Data updates
          </h1>
          <span className="muted ev-count">what each update added to the atlas, newest first</span>
        </div>
        {log && log.length > 0 && (
          <Totals
            items={[
              { label: "Updates", value: log.length },
              { label: "Sites added", value: sitesAdded },
              { label: "Genomes added", value: sum((e) => e.genomesAdded) },
            ]}
          />
        )}
      </header>
      <main className="ev-main up-main">
        <p className="up-about">
          The atlas is rebuilt from its sources (XRONOS, ROAD, Cliopatria, Wikidata and the Allen Ancient DNA Resource)
          when they publish something new. New sites that look doubtful (far from their culture's other sites, the
          first in a new country, or dated outside its known span) are held back until a person has checked them:
          when unsure, the atlas leaves it out.
        </p>
        {log === null && <p className="muted">Loading…</p>}
        {log?.length === 0 && <p className="up-empty muted">No updates published yet. The first one will be listed here.</p>}
        {log?.map((e, i) => (
          <Entry key={e.id} entry={e} initiallyOpen={i === 0} onMap={onMap} entityName={entityName} />
        ))}
      </main>
    </div>
  );
}
