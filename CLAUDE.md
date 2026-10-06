# Ancestor Atlas: notes for agents

Read README.md first (pipeline, data files, XRONOS, provenance rules). This file adds the working agreements and
current state that the README does not cover. Data state as of 6 Oct 2026.

## Working agreements

- Commit straight to `main`. Check `git status` first and stage only your own files: Rob often has uncommitted work
  (README, `src/` UI, `src/index.css`, images). Never overwrite or sweep up his changes.
- Never fetch from xronos.ch automatically. Rob downloads `data/raw/xronos/data.csv` by hand. The XRONOS team (Joe Roe,
  Oct 2026) confirmed use is welcome: download the export once or at most about daily and cache it; no crawling or
  repeated requests (their robots.txt disallows the CSVs for that reason).
- Cite XRONOS in its requested format (in `data/curated/sources.yaml` and the README), together with the original
  publications listed on each point.
- Species images are AI-generated illustrations; every `image_url` needs an `image_credit` (the validator enforces it).

## Pipeline

- `data/raw` (gitignored) -> `data/curated` (hand-edited) -> `public/data` (built, committed).
- `npm run data:build` builds, validates and writes `data/build/qa-report.md`, `recall-queue.csv` and
  `xronos-set-aside.csv` (all gitignored).
- `npm run build` refuses to build when `public/data` is stale (fingerprint in `public/data/build-meta.json`; covers
  `data/curated`, `data/reference`, `scripts/build-data.ts`, `scripts/ingest`, and the date/colour/calibration libs).
  After changing any of those, run `npm run data:build` and commit `public/data` in the same commit.
- Years are astronomical (1 CE = 1, 1 BCE = 0); ka and cal BP count back from 1950.

## Curated sites (`data/curated/species-sites.csv`, `culture-sites.csv`)

- 194 rows: 169 sourced, 21 partial, 4 recall (Lokalalei, Kokiselei, Majuangou, Dent).
- Each row carries `wikidata`, `coord_source`, `date_source`, `checked`, `notes`. A row leaves `source_id: recall`
  only when both coordinate and date evidence are set (validator-enforced). Place-level coordinates are acceptable
  if the note says so.
- 44 hominin fossils come from Wikipedia's "List of human evolution fossils" at a pinned revision.
- Open: the 21 partial rows need full papers or excavation reports. Koeln-Lindenthal (excavated before radiocarbon)
  has no dates to find and stays recall-sourced. Swartkrans and Kromdraai are marked `review keep-coords`.

## XRONOS bulk import (`scripts/ingest/xronos.ts`)

About 1,720 points: 15 cultures plus H. sapiens. Rules:

- Labels map to cultures only through `culture-labels.csv` (explicit list, no fuzzy matching). Each culture needs a
  sourced range in `culture-windows.csv`; dates outside range ± margin are dropped and site windows are clipped to it.
- Calibration: IntCal20 in-house (`scripts/lib/calibrate.ts`), 95% range plus median.
- Dropped: dates whose duplicate records carry conflicting culture labels; the same measurement under two lab
  numbers; whole-degree coordinates; sites far from the rest of their country's dates; points within 2 km of a
  curated site of the same entity. Same-culture sites within 1 km are merged.
- Outliers: at culture sites with 4+ dates, an end date at least 500 years from its nearest neighbour with no overlap
  in 95% ranges is set aside (at most one per end, at most a quarter of the site's dates). 108 are set aside; the
  point's date text names them and `data/build/xronos-set-aside.csv` lists them for review.
- Dates on human remains also become H. sapiens points (60,000–10,000 BCE).
- Each point links its XRONOS record and carries lab numbers, all publications (page cites merged) and the
  compilations the dates came from.

## Possible next steps

- More cultures: Starčevo–Körös, Michelsberg, Únětice, Cucuteni, Vinča (add labels, a sourced window and the entity).
- Work through partial and recall rows.
- Review `xronos-set-aside.csv`.
- Optional "dated activity" layer from p3k14c (in `data/raw`, but it has no culture labels).

## Environment (when working through Rob's linked computer)

- Node needs `NODE_USE_ENV_PROXY=1` for network access.
- Run long jobs in the foreground with a timeout; background jobs die when the call returns.
- The Wikidata client caches lookups in `data/raw/wikidata/cache` and never caches error responses.
