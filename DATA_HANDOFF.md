# Data handoff (2026-10-06)

Read this with `data_plan.md` (decisions D1–D5, schema, phases) and `README.md`.

## Where the data stands

Built output in `public/data/`: **1,198 features, 240 registry entities**, all loaded in the browser (static Vercel deploy, no DB).

| Category | Features | Source | Quality |
|---|---|---|---|
| Civilizations | 1,047 polygons | Cliopatria (CC BY 4.0), simplified with mapshaper | Real, sourced. Groups (e.g. Egypt) defined in `data/curated/entities.yaml` |
| Species | 81 points, 24 species | `recall` (AI-compiled) | **Approximate, unverified** |
| Cultures | 70 points, 13 cultures | `recall` (AI-compiled) | **Approximate, unverified** |

- Species and culture sites live in `data/curated/species-sites.csv` and `culture-sites.csv`
  (`entity_id,label,lat,lon,start_year,end_year,date_text,confidence,weight,source_id,source_ref`).
- Registry (names, descriptions, Wikipedia links) is `data/curated/entities.yaml`; sources are in `sources.yaml`.
- Build: `npm run data:build` (raw -> curated -> public/data). `data/raw` is gitignored.
- The UI flags `recall` rows as "Approximate, unverified" and shows a confidence level (high/medium/low).
- Years are astronomical (1 CE = 1, 1 BCE = 0, so BCE year = 1 - year). The slider snaps in steps
  (100k/10k/1k/100/10 yrs by segment), so short rows are widened to at least 2 steps.

## Issues met

- **Provenance:** species/culture rows were written from model recall (decision D5, a temporary exception to
  the "no LLM coordinates/dates" rule). A spot-check against PBDB/Wikidata was partly circular, because
  I had already seen some Wikidata coordinates. Treat all of it as unchecked.
- **Sources that did not work out:** ROAD (archaeology, CC BY-SA) has a bulk dump embargoed to 2028-12-31 and its
  endpoints weren't usable. PBDB is sparse for hominins. Wikipedia/Wikidata rate-limit (429) unless you send a
  descriptive User-Agent.
- **Sandbox:** network is allowlisted (Rob adds domains); Node fetch needs `NODE_USE_ENV_PROXY=1`.
  The cliopatria raw data was only on Rob's machine, so builds ran there.
- **Windows:** mapshaper must be run via `node node_modules/mapshaper/bin/mapshaper` (fixed in `scripts/ingest/cliopatria.ts`).
- **Line endings:** several files are CRLF (or mixed). Preserve them when scripting edits, or edits silently fail.
- **Basemap:** Esri imagery terms didn't cover this use, so it's now Natural Earth land outlines only
  (modern coastlines, no imagery, since terrain and coastlines varied hugely over 10 Myr).

## Suggested next steps

1. **Verify the recalled rows**, starting with the low/medium confidence ones. Cheapest route is per-site Wikipedia
   or Wikidata lookups (coordinates + dates), then papers for key dates. Replace `source_id=recall` with the real source as each is checked.
2. **Fill the gaps**, which are thin outside the main hominin and Upper Palaeolithic sites. Candidates: more
   *H. sapiens* dispersal sites, Neanderthal/Denisovan sites, Jomon, Yangshao, Bronze Age cultures, Pre-Pottery Neolithic.
3. **Bulk sources:** manual CSV export from ROAD if allowed, the Paleobiology Database for non-hominin species,
   Wikidata SPARQL for archaeological sites and cultures. Check each licence (D1 allows CC BY / BY-SA / CC0 / BY-NC with attribution).
4. **Build checks (Phase 5):** a QA/coverage report covering entities with no features, features outside their entity span,
   rows still marked `recall`, duplicate sites, and attribution completeness.
5. **Range representation:** many species are one point per site. Consider range polygons or heatmap weights for
   species and cultures so wide distributions read properly.
