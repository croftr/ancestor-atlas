# Plan: populating Ancestor Atlas with real data

Project: [`/home/rob/projects/ancestor-atlas`](file:///home/rob/projects/ancestor-atlas). The current schema is in [types.ts](file:///home/rob/projects/ancestor-atlas/src/types.ts) and the validator in [validate-data.ts](file:///home/rob/projects/ancestor-atlas/scripts/validate-data.ts).

## TL;DR
1. **Phase 0: prepare the schema and pipeline** before importing anything. Split the data into an *entity registry* plus *features*, add source and licence tracking, and build a reproducible `raw → curated → build` pipeline.
2. **Phase 1: civilizations from Cliopatria.** This is the quickest win: open (CC BY 4.0), already polygons, already time-sliced.
3. **Phase 2: species from the Paleobiology Database API**, plus a small hand-curated list of iconic sites.
4. **Phase 3: cultures.** This is the hardest category because no single source covers it. Start with hand-curated lists, then import specialist databases era by era.
5. **Phases 4–5: descriptions, QA and attribution.**

Phases 0 and 1 are specified in enough detail to hand to an implementing agent. Phases 2 and 3 are outlined; flesh them out once Phase 1 has proven the pipeline.

## ✅ Decisions (agreed 2026-10-06)

| # | Question | Decision | Consequence |
|---|---|---|---|
| D1 | Licence posture | Hobby project, possibly public later, **always free (non-commercial)** | CC BY, CC BY-SA, CC0 and CC BY-NC sources are all usable. **Attribution is always required.** BY-SA text (Wikipedia) must stay under BY-SA. For sources with registration (e.g. ROAD), still check whether redistribution is allowed. |
| D2 | Cliopatria scope | **Import all** polities that exist at or before 1 CE | Expect a few thousand polygon rows. Simplification and per-entity colours are mandatory. |
| D3 | *H. sapiens* in the Holocene | **Hide** *H. sapiens* site points after **10,000 BCE** | The ingest clips `end_year` to `-9_999`, and the registry span stays to 1 CE. |
| D4 | Egypt and its dynasties | Keep **separate entities, plus parent groupings** | Add an optional `parent_id` to the registry (see "Entity hierarchy" below). |

## Entity hierarchy (parent/child)

Some things belong at two levels: *Ancient Egypt* is the umbrella, and its kingdoms and dynasties are the actual Cliopatria entities. The same pattern will be useful elsewhere, for example *Upper Palaeolithic → Aurignacian* or *Australopithecus → A. afarensis*.

**Design (deliberately minimal):**
- A registry entity may have **one optional `parent_id`**, so the hierarchy is a tree, not a graph.
- **Geometry lives only on leaf entities**, i.e. the Cliopatria rows. A parent such as `ancient-egypt` is a **group entity** defined in `curated/entities.yaml`, with a name, description and Wikipedia link. It has no features of its own.
- Children are assigned to a parent with **rules in the curated registry** (by Cliopatria `Name`, Wikidata ID, or a regex on `Name`), so this can be done without editing raw data:
  ```yaml
  - id: ancient-egypt
    name: Ancient Egypt
    category: civilization
    group: true
    description: "Three millennia of pharaonic civilisation along the Nile ..."
    wikipedia_url: https://en.wikipedia.org/wiki/Ancient_Egypt
    match_children:
      cliopatria_name_regex: "^(Egypt|.*Kingdom of Egypt|.*Dynasty of Egypt).*"
  ```
- **The build derives a group's span** (`start_year`/`end_year`) from the min and max of its children, unless the span is set explicitly.
- **Validation:** `parent_id` must exist and must be a `group` entity in the same category, with no cycles. Warn on groups that have no children.

**UI behaviour (MVP of the hierarchy):**
- **InfoPanel breadcrumb:** *Ancient Egypt › New Kingdom*. Clicking the parent opens the parent's panel, which shows its description and a **list of its children ordered by date**. Clicking a child **jumps the slider** to that child's start year and selects it.
- **Map:** unchanged. Only leaves are drawn.
  - Children of the same group share a **base colour** (hashed from the group ID) with slight variations, so a dynasty sequence reads as "one civilization".
  - Ungrouped entities hash from their own ID.
- **Legend counts:** leaf entities only.
- **Later (not now):** a "detail level" toggle that draws a group as one dissolved outline at low zoom.

**Initial groups to seed** (Cliopatria names to be confirmed during ingest): Ancient Egypt, Mesopotamia (Sumer/Akkad/Babylon/Assyria), Ancient China (Shang/Zhou/Qin/Han…), Persia (Achaemenid/Parthian…) and Ancient Greece. Anything else stays ungrouped until it's worth curating.

---

## Why the schema must change first

The MVP stores **one feature per entity**: one MultiPoint for all *Homo erectus* sites, with a single date range. Real data doesn't work that way:

| Problem | Example | Fix |
|---|---|---|
| Each site has its **own date** | Dmanisi is 1.8 Ma, Ngandong ~110 ka. With one range, both show for 1.7 million years. | **One Point feature per site**, each with its own `start_year`/`end_year`, sharing `entity_id`. Species then *spread* over time. |
| Descriptions get duplicated | 500 *H. sapiens* sites × a 400-character description | Move entity-level information into a **registry** file. Features carry only the `entity_id`. |
| CC BY requires attribution | PBDB, Cliopatria | Every feature carries a `source_id`, and the app shows a "Data sources" panel. |
| Data is curated in layers | A raw database dump vs your editorial overrides | Pipeline: `data/raw` (fetched, gitignored) → `data/curated` (hand-edited, in git) → `public/data` (built). |

The existing time filter, legend counts (already unique by `entity_id`) and layers keep working unchanged.

---

## Phase 0: schema and pipeline (do this first)

### 0.1 New runtime files (built output, in `public/data/`)

**`entities.json`**: the registry, one entry per entity.
```ts
interface Entity {
  id: string;                 // "homo-erectus" (== feature.entity_id)
  name: string;
  category: Category;
  start_year: number;         // overall span, astronomical
  end_year: number;
  description: string;
  wikidata?: string;          // "Q130672"
  wikipedia_url?: string;
  source_ids: string[];       // keys into sources.json
  parent_id?: string;         // optional group entity (see "Entity hierarchy")
  group?: boolean;            // true = umbrella entity with no geometry of its own
  color?: string;             // computed at build time (group-based hashing)
}
```

**`features.geojson`**: lean geometry, flat properties.
```ts
interface FeatureProps {
  id: string;                 // "homo-erectus@dmanisi"
  entity_id: string;
  category: Category;         // duplicated for GPU filtering
  start_year: number;
  end_year: number;
  label?: string;             // site name or snapshot name, e.g. "Dmanisi"
  date_text?: string;         // human-readable, e.g. "1.85–1.77 Ma (Ar/Ar)"
  confidence?: "high" | "medium" | "low";
  weight?: number;            // culture heatmap
  source_id: string;          // "pbdb" | "cliopatria" | "curated" ...
  source_ref?: string;        // record id in source, e.g. "pbdb:col:12345"
  color?: string;             // civilizations: build-time colour (see hierarchy)
  wikipedia_phrase?: string;  // per-row Wikipedia page (Cliopatria)
}
```

**`sources.json`**: entries of the form `{ id, name, url, licence, citation }`.

### 0.2 App changes (small)
- [data.ts](file:///home/rob/projects/ancestor-atlas/src/map/data.ts): load `entities.json` and `sources.json`. The map source points at `features.geojson`.
- `InfoPanel`:
  - Shows the entity's name, span, category and description from the registry.
  - Adds a **site block** for the clicked feature: `label`, `date_text`, confidence.
  - Adds a "Source: …" link and a "Read more" Wikipedia link.
  - **Hierarchy:**
    - A breadcrumb when the entity has a `parent_id`.
    - A group view listing children by date. Clicking a child sets the year and selects the child.
    - Add `jumpTo(entityId)` to the store for this.
- **Legend counts:** keep counting unique `entity_id` among active features. No change needed, because only leaves have features.
- **Civilization colours:** with hundreds of adjacent polities, a single colour merges them into one blob.
  - Use a per-feature `color` prop computed at build time: a hash of the root group, or of the entity itself if ungrouped, with the lightness varied per child.
  - Paint with `["get", "color"]`, and keep a darker outline.
- **Attribution:** add an "ⓘ Data sources" button that lists `sources.json`.

### 0.3 Pipeline layout
```
data/
├─ raw/                     # gitignored; recreated by fetch scripts
│  ├─ cliopatria/
│  ├─ pbdb/
│  └─ ...
├─ curated/                 # in git; human-edited, the editorial source of truth
│  ├─ entities.yaml         # registry: names, descriptions, spans, wikidata, include/exclude
│  ├─ species-taxa.csv      # raw taxon name  -> entity_id
│  ├─ culture-labels.csv    # raw culture label -> entity_id
│  ├─ species-sites.csv     # hand-added iconic sites
│  ├─ culture-sites.csv     # hand-added culture sites
│  └─ sources.yaml
scripts/
├─ lib/dates.ts             # date conversions (+ tests)
├─ fetch/cliopatria.ts
├─ fetch/pbdb.ts
├─ ingest/cliopatria.ts     # raw -> normalised features (in-memory or data/build/*.geojson)
├─ ingest/pbdb.ts
├─ ingest/curated.ts
├─ build-data.ts            # merge everything -> public/data/{entities.json, features.geojson, sources.json}
├─ report-data.ts           # coverage report (see Phase 5)
└─ validate-data.ts         # extended
```
`package.json` scripts: `data:fetch`, `data:build` (ingest, merge, validate, report) and `validate-data`. Dev dependencies to add: `yaml`, `csv-parse`, `mapshaper` (polygon simplification) and `@turf/turf` (geometry checks).

### 0.4 Date helpers (`scripts/lib/dates.ts`, with unit tests)
All internal years are **astronomical** (`1 CE = 1`, `1 BCE = 0`).

| Function | Formula | Used for |
|---|---|---|
| `fromMa(ma)` | `Math.round(1950 - ma * 1e6)` | PBDB (`max_ma`/`min_ma`) |
| `fromKa(ka)` | `Math.round(1950 - ka * 1e3)` | Literature and ROAD dates |
| `fromCalBP(bp)` | `1950 - bp` | **Calibrated** radiocarbon dates |
| `fromHistorical(y)` | `y < 0 ? y + 1 : y` | Sources that use BCE as negative numbers with *no year 0* |
| `minWindow(start, end, minSpan)` | Widen the window symmetrically to at least `minSpan` | Stops points from blinking (see Phase 2) |

> [!WARNING]
> **Uncalibrated radiocarbon "BP" is not calendar years.** For example, 30,000 ¹⁴C BP is roughly 34,500 cal BP. Use calibrated dates only, or calibrate during ingest (see Phase 3). Radiocarbon can't be used beyond about 50 ka.

### 0.5 Migrate the mock data
Convert the current 24 mock features into the `curated/*` files with `source_id: "mock"`, so the app keeps working end-to-end through the new pipeline. Then delete the mock rows category by category as real data replaces them.

---

## Phase 1: civilizations from Cliopatria ⭐ quick win

**Source:** [Cliopatria](https://github.com/Seshat-Global-History-Databank/cliopatria), from the Seshat Global History Databank. Releases are on [Zenodo](https://zenodo.org/records/13363121), and the paper is [doi:10.1038/s41597-025-04516-9](https://doi.org/10.1038/s41597-025-04516-9).
- **Licence:** CC BY 4.0.
- **Coverage:** about 1,600 polities in about 14,000 rows, 3400 BCE to 2024 CE.
- **Format:** `cliopatria.geojson` (zipped), EPSG:4326 polygons.
- **Properties per row:** `Name`, `FromYear`, `ToYear` (inclusive; negative = BCE), `Type` (POLITY/RELATION), `Area` (km²), `Wikipedia` (a page phrase; the URL is `https://en.wikipedia.org/wiki/<phrase>`) and `Wikidata` ID.
- **Why it fits:** one entity (`Name`) has **several rows, each with its own year range and polygon**. That is exactly the existing `entity_id` keyframe model.

Steps:
1. **Fetch:** download the latest release zip to `data/raw/cliopatria/` and record the version and DOI in `sources.yaml`.
2. **Filter:**
   - Keep `Type == "POLITY"`.
   - Keep `FromYear <= 1`, and clip `ToYear` to `1`.
   - Drop RELATION rows (vassalage etc.) for now.
   - **Import everything that's left** (D2).
3. **Year convention:** the README says only "negative for BCE", which most likely means historical numbering (no year 0).
   - **Assume historical** and convert with `fromHistorical`.
   - Add a spot-check test: the Achaemenid rows should end at 330 BCE, which is astronomical `-329`.
   - If the spot-check disagrees, flip the assumption.
4. **Map fields to the schema:**
   - `entity_id`: a slug of `Name`. Cliopatria groups rows by `Name`, so this is the natural key. Store the Wikidata ID on the registry entry.
   - `id`: `${entity_id}@${FromYear}`.
   - `label`: `Name`.
   - `date_text`: "FromYear – ToYear", formatted.
   - `source_ref`: `cliopatria:${Name}:${FromYear}`.
   - **Row-level Wikipedia link:** the phrase can differ between rows of the same entity. Store it per feature as `wikipedia_phrase`, so the panel links to the right period.
   - Registry entries are auto-created per `Name`: name, span (min/max over rows), `wikidata`, `wikipedia_url` (from the earliest row), and a placeholder description. Use the Wikidata short description (CC0) when it's available.
5. **Simplify** with mapshaper: `-simplify dp 10% keep-shapes -clean`. Target **under 3 MB** for civilizations in `features.geojson`, and tune the percentage to hit it.
6. **Curated overrides** in `entities.yaml`:
   - Hand-written descriptions.
   - `exclude: true` for noise.
   - **Group entities** with `match_children` rules (see "Entity hierarchy"). The build sets `parent_id` on the matched Cliopatria entities.
   - The build prints a list of **unmatched candidate names** (e.g. anything containing "Egypt", "Assyria", "Zhou") to make curation easy.
7. **Colours:** compute `color` per feature at build time:
   - The hue comes from the hashed root group (or the entity itself if it's ungrouped).
   - The lightness varies per child.
   - `civ-fill` and `civ-line` use `["get", "color"]`.
8. **Remove** the mock civilizations.

**Expect:**
- Before about 2000 BCE, Cliopatria is sparse.
- Some regions overlap.
- Its extents are scholarly *approximations*. Show "Source: Cliopatria (Seshat)" in the panel.

**Done when:**
- Scrubbing from 3400 BCE to 1 CE shows real, evolving polities with distinct colours.
- Egypt's kingdoms share a colour family and show the breadcrumb *Ancient Egypt › …*.
- Every polity links back to its source and to Wikipedia.

---

## Phase 2: species (outline)

**Primary source:** [Paleobiology Database API](https://paleobiodb.org/data1.2/). Licence CC BY 4.0, scriptable, no key.
```
https://paleobiodb.org/data1.2/occs/list.json
  ?base_name=Homo,Australopithecus,Paranthropus,Ardipithecus,Sahelanthropus,Orrorin,Kenyanthropus
  &show=coords,loc,time,ref,ident&vocab=pbdb
```
Fields used: `accepted_name`, `lat`, `lng`, `max_ma`, `min_ma`, `collection_name`, `collection_no` and the reference.

Steps:
1. **Map taxa to entities** via `species-taxa.csv`. For example, `Homo neanderthalensis → neanderthal` and `Homo floresiensis → homo-floresiensis`. Genus-only identifications (`Homo sp.`) are dropped or go to a "Homo (indet.)" entity. Your call.
2. **Dedupe** to one feature per `(entity_id, collection_no)`.
3. **Time window** = `fromMa(max_ma)` to `fromMa(min_ma)`.
   - PBDB intervals are sometimes a whole geological stage (e.g. 1.8–0.77 Ma). Set `confidence: "low"` when the span is wider than about 300 ka.
   - Apply `minWindow` so a precisely dated site is visible for at least about 2 slider steps in its era. Otherwise it flashes past.
4. **Hand-curated supplement** (`species-sites.csv`, with citations) for iconic sites that PBDB misses or gets wrong, such as Toumaï, Lucy/Hadar, Dmanisi, Denisova, Liang Bua, Rising Star and Callao Cave.
5. **Expand the registry** to about 15 species: Sahelanthropus, Ardipithecus, A. afarensis, A. africanus, Paranthropus boisei and robustus, H. habilis, H. erectus/ergaster, H. heidelbergensis, Neanderthals, Denisovans, H. floresiensis, H. naledi, H. luzonensis and H. sapiens.
6. **Optional cross-check:** a Wikidata SPARQL query for fossil specimens with coordinates (`P625`). It's CC0 and useful for catching gaps.

> [!NOTE]
> **D3 (agreed): *H. sapiens* site points end at 10,000 BCE.**
> - In the ingest, drop *H. sapiens* sites whose `start_year > -9_999`, and clip the rest so `end_year <= -9_999`.
> - The registry span still runs to 1 CE, so the entity description stays accurate.
> - Option for later: a coarse global "range" layer.

---

## Phase 3: cultures (outline, the hardest category)

No single open dataset covers 2.6 Ma to the Neolithic with consistent culture labels, so the plan goes **era by era, curated first**:

| Era / cultures | Best source | Notes |
|---|---|---|
| Oldowan, Acheulean, Levallois/Mousterian, MSA | **Curated CSV** from review papers and Wikipedia site lists. Later, [ROAD](https://www.roceeh.uni-tuebingen.de/roadweb/) (ROCEEH, ~3 Ma–20 ka, thousands of sites with cultural attribution). | ROAD needs a registered account. **Check its terms before redistributing.** |
| Aurignacian, Gravettian, Solutrean, Magdalenian | **Radiocarbon Palaeolithic Europe Database** (Vermeersch). Free download with site, coordinates, ¹⁴C date and techno-complex. | Needs calibration. Check the licence. |
| Natufian, PPNA/B, LBK, Neolithic Europe | **p3k14c** (global radiocarbon), **EUROEVOL** (Neolithic Europe), **XRONOS** (open API) | Culture labels are inconsistent. Map them via `culture-labels.csv`. |
| Anywhere (cross-check) | **Wikidata SPARQL**: archaeological sites with `P2596` (culture) and `P625` (coordinates) | CC0. Good for gap-filling. |

Steps:
1. **Start curated.** 15–40 key sites per culture in `culture-sites.csv`, with columns `entity_id, site, lat, lon, start_year, end_year, date_text, ref`. This gives immediate quality while imports are built.
2. **Map labels** with `culture-labels.csv`. For example, "Aurignacien", "Proto-Aurignacian" and "Early Aurignacian" all map to `aurignacian`.
3. **Calibrate radiocarbon** during ingest with IntCal20. The simplest route is a one-off Python step using `iosacal`, or R with `rcarbon`. Store the calibrated 95% range as the site's start and end.
4. **One Point per site.** `weight` can be the log of the date count, so well-studied sites glow brighter. **The heatmap gets much better with many points.**
5. **Expand the registry:** MSA, Solutrean, Magdalenian, Clovis, Jōmon, PPNA/PPNB, Yangshao, Corded Ware, Bell Beaker and so on.

---

## Phase 4: descriptions and editorial

| Option | Licence | Notes |
|---|---|---|
| Wikidata short description | CC0 | A one-line stub. Fine as an automatic fallback. |
| Wikipedia REST summary (`/page/summary/{title}`) | **CC BY-SA 4.0** | Must be attributed, and the text is share-alike. Keep it clearly separated and linked. |
| Your own 2–3 sentences | Yours | Best. AI drafting is fine **for prose only, with human review**. |

> [!CAUTION]
> **Never let an LLM generate coordinates, dates or polygon vertices for the real dataset.** Every location and date must trace back to a `source_id` and `source_ref`. (The mock dataset was explicitly illustrative.)

---

## Phase 5: QA, reporting and attribution

- **Extended validator:**
  - Registry referential integrity.
  - Every `source_id` exists.
  - Polygon validity (no kinks, using Turf).
  - Site dates fall within the entity span ± tolerance.
  - **Geographic outlier warnings**, e.g. a Neanderthal point in Australia (a per-entity bounding box in `entities.yaml`).
  - Duplicate coordinates.
- **Coverage report** (`report-data.ts`):
  - Features and entities per category per slider segment.
  - The largest empty time gaps.
  - File sizes.
  - This tells you where curation effort is needed.
- **Performance budget:**
  - `features.geojson` under about 5 MB gzipped. Beyond that, split per category, then move to PMTiles.
  - The GPU `setFilter` approach scales fine to tens of thousands of points.
- **In-app debug toggle** (`?debug=1`): shows `source_ref`, confidence and raw dates in the panel, which makes data review much faster.

---

## Source and licence summary

| Source | Category | Access | Licence | Status |
|---|---|---|---|---|
| Cliopatria (Seshat) | Civilizations | GitHub / Zenodo download | CC BY 4.0 | ✅ Verified |
| Paleobiology Database | Species | Public REST API | CC BY 4.0 | ✅ Verified |
| Wikidata | All (cross-check, IDs, stubs) | SPARQL | CC0 | ✅ |
| Wikipedia | Descriptions | REST | CC BY-SA 4.0 | ✅ (share-alike) |
| ROAD (ROCEEH) | Cultures, species | Registered web access | ⚠️ Check terms | To confirm |
| Radiocarbon Palaeolithic Europe DB | Cultures | Download | ⚠️ Check | To confirm |
| p3k14c / EUROEVOL / XRONOS | Cultures | Download / API | Mostly CC BY. ⚠️ Confirm each. | To confirm |
| historical-basemaps (aourednik) | Civilizations (alternative) | GitHub | GPL-3.0 | Usable (D1), but the derived data must stay GPL. Not needed while Cliopatria covers it. |
| AWMC / DARMC | Civilizations (detail) | Download | Often CC BY-NC | ✅ OK under D1 (free, non-commercial), with attribution |

---

## Suggested order and effort

| Step | Effort | Outcome |
|---|---|---|
| Phase 0 (schema, pipeline, mock migration) | ~1 session | Same app, new data architecture |
| Phase 1 (Cliopatria) | ~1 session | Real civilizations, 3400 BCE–1 CE |
| Phase 2 (PBDB + curated) | 1–2 sessions | Real fossil sites for ~15 species |
| Phase 3a (curated cultures) | Ongoing, manual | 10–15 cultures with key sites |
| Phase 3b (radiocarbon/ROAD imports) | 2+ sessions | Dense heatmaps |
| Phases 4–5 | Ongoing | Polish, trust and attribution |
