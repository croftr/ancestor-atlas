// Renders a data update check (scripts/update/check.ts) as data/build/update-report.md and a short console summary.
import type { CheckResult, Gap } from "./check.ts";

const esc = (s: string) => s.replace(/\|/g, "\\|");
const STATE = { current: "up to date", newer: "**newer available**", "by hand": "check by hand", static: "static", error: "**check failed**" } as const;

function gapTable(gaps: Gap[], withSites: boolean, unit = "Dates"): string[] {
  if (!gaps.length) return ["None.", ""];
  return [
    withSites ? `| Label | ${unit} | Sites | Existing culture |` : "| Label | Count | Existing culture |",
    withSites ? "|---|--:|--:|---|" : "|---|--:|---|",
    ...gaps.map((g) => `| ${esc(g.label)}${g.isNew ? " 🆕" : ""} | ${g.count}${withSites ? ` | ${g.sites ?? ""}` : ""} | ${g.culture ? esc(g.culture) : ""} |`),
    "",
  ];
}

export function renderReport(r: CheckResult): string {
  const out: string[] = [`# Data update check, ${r.checked.slice(0, 10)}`, ""];
  if (r.offline) out.push("Run with `--offline`: upstream versions, Wikipedia and Wikidata were not asked.", "");
  out.push("## Doubts", "", "When unsure, leave it out: an update is not published while any of these remain. Fix the data, or remove what cannot be confirmed.", "");
  out.push(...(r.doubts.length ? r.doubts.map((d) => `- ${d}`) : ["None."]), "");

  out.push("## Sources", "", "| Source | Locked here | Latest upstream | State | Next step |", "|---|---|---|---|---|");
  for (const s of r.sources) out.push(`| ${s.id} | ${esc(s.locked)} | ${esc(s.latest)} | ${STATE[s.state]} | ${esc(s.next ?? "")} |`);
  out.push("");
  if (r.descriptionsChanged.length) out.push(`Wikidata descriptions changed: ${r.descriptionsChanged.join(", ")}.`, "");

  if (!r.offline) {
    out.push(`## Pinned Wikipedia revisions`, "", `${r.pins.total} citations of ${r.pins.pages} pages. ${r.pins.edited.length} pages edited since their pin, ${r.pins.missing.length} missing or moved.`, "");
    if (r.pins.edited.length) {
      out.push("Most edits are not about the cited facts: open the diff where the change is large or the page is cited often, and update the pin (and the date, if it changed).", "",
        "| Page | Cited | Edits since pin | Size change | Latest edit | Change |", "|---|--:|--:|--:|---|---|");
      for (const g of r.pins.edited) {
        const bytes = g.bytes === undefined ? "" : `${g.bytes > 0 ? "+" : g.bytes < 0 ? "−" : ""}${Math.abs(g.bytes).toLocaleString("en")} B`;
        out.push(`| ${esc(g.lang === "en" ? g.title.replace(/_/g, " ") : `${g.lang}: ${g.title.replace(/_/g, " ")}`)} | ${g.pins.reduce((n, p) => n + p.uses, 0)} | ${g.edits === 500 ? "500+" : g.edits ?? ""} | ${bytes} | ${g.latest!.timestamp.slice(0, 10)} | [diff](${g.diff}) |`);
      }
      out.push("");
    }
    for (const g of r.pins.missing) out.push(`- Missing or moved: ${g.lang}:${g.title} (cited in ${g.files.join(", ")})`);
    if (r.pins.missing.length) out.push("");

    out.push("## Wikidata coordinates", "", `${r.coords.checked} curated points take their coordinates from Wikidata. ${r.coords.changes.length} no longer match (over 1 km apart, coordinates removed, or the item is gone).`, "");
    if (r.coords.changes.length) {
      out.push("| Point | File | Item | Change |", "|---|---|---|---|");
      for (const c of r.coords.changes) {
        const what = c.state === "moved" ? `Wikidata's point is ${c.km} km away (${c.now!.lat}, ${c.now!.lon}): moved, or the wrong item` : c.state === "no-coords" ? "item has no coordinates now" : "item deleted or redirected";
        out.push(`| ${esc(c.label)} | ${c.where} | [${c.qid}](https://www.wikidata.org/wiki/${c.qid}) | ${what} |`);
      }
      out.push("", "`npm run sites:sync` refills site coordinates from Wikidata only where `coord_source` is empty: clear it on a row to take the new point.", "");
    }
  }

  out.push("## Not mapped yet", "", "Only a person can add these: map a label in `data/curated/culture-labels.csv` (or `road/species-labels.csv`), or add it to `data/update-ignore.yaml` to stop it being listed. 🆕 = not in the last check's list. *Existing culture*: the label seems to name a culture the atlas already has. A suggestion only, never applied automatically: map it only after checking it really is that culture and its dates fit the culture's sourced range.", "");
  out.push(`### XRONOS labels`, "", `Labels on dates older than about 1 CE where no label on the date is mapped, by number of dates. ${r.gaps.xronosGeneric} period names (Middle Neolithic, EBA…) left out.`, "", ...gapTable(r.gaps.xronos, true));
  out.push("### ROAD taxa", "", "Uncertain identifications (sp., cf., indet., \"X or Y\") left out, as in the ingest.", "", ...gapTable(r.gaps.roadTaxa, false));
  out.push("### ROAD cultures", "", "Generic periods left out.", "", ...gapTable(r.gaps.roadCultures, false));
  out.push("### AADR groups without a culture", "", "Genomes whose group label links to no culture, by number of people. Groups that are only a place and periods (Spain_C, England_MIA) left out.", "", ...gapTable(r.gaps.aadr, true, "People"));

  const q = r.queues;
  out.push("## Other work lists", "",
    `- Curated sites still \`recall\`: ${q.recall.length}${q.recall.length ? ` (${q.recall.join("; ")})` : ""}`,
    `- Curated sites \`partial\` (need a paper or excavation report): ${q.partial.length}`,
    `- Narration out of date with its description: ${q.staleNarration.length}${q.staleNarration.length ? ` (${q.staleNarration.join(", ")}; \`npm run audio:narrate -- --stale\`)` : ""}`,
    ...(q.setAside !== undefined ? [`- XRONOS dates set aside as outliers: ${q.setAside} (\`data/build/xronos-set-aside.csv\`)`] : []),
    ...(q.droppedCoords !== undefined ? [`- XRONOS sites dropped for coordinates: ${q.droppedCoords} (\`data/build/xronos-dropped-coords.csv\`)`] : []),
    "- Pictures still missing: `npm run images:check`; clips not yet in the bucket: `npm run audio:upload -- --dry-run`",
    "");
  return out.join("\n");
}

export function summary(r: CheckResult): string[] {
  const lines = [r.doubts.length ? `  ✗ ${r.doubts.length} doubt${r.doubts.length === 1 ? "" : "s"} to resolve before an update can be published (see the report)` : "  ✓ no doubts"];
  lines.push(...r.sources.map((s) => `  ${s.id.padEnd(10)} ${STATE[s.state].replace(/\*/g, "").padEnd(16)} ${s.state === "newer" || s.state === "error" ? s.latest : ""}`.trimEnd()));
  if (!r.offline) {
    lines.push(`  Wikipedia: ${r.pins.edited.length} of ${r.pins.pages} pinned pages edited since their pin${r.pins.missing.length ? `, ${r.pins.missing.length} missing` : ""}`);
    lines.push(`  Wikidata:  ${r.coords.changes.length} of ${r.coords.checked} coordinates no longer match`);
  }
  const fresh = (g: Gap[]) => g.filter((x) => x.isNew).length;
  const g = r.gaps;
  lines.push(`  Not mapped: XRONOS ${g.xronos.length} labels (top), ROAD ${g.roadTaxa.length} taxa / ${g.roadCultures.length} cultures, AADR ${g.aadr.length} groups` +
    (fresh([...g.xronos, ...g.roadTaxa, ...g.roadCultures, ...g.aadr]) ? `; ${fresh([...g.xronos, ...g.roadTaxa, ...g.roadCultures, ...g.aadr])} new since the last check` : ""));
  return lines;
}
