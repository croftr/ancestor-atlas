# Data updates

Plan for a semi-automated data update (agreed with Rob 23 Oct 2026): one command, run by Rob on any of his machines,
that checks every source for a newer version, fetches what changed, rebuilds, reports what was added and what is
missing, and on his word commits it to a branch. Each published run is logged on a public page.

## Decisions (Rob, 23 Oct 2026)

- **XRONOS**: a command Rob runs himself may download `https://xronos.ch/data.csv`, at most once a day (it refuses
  sooner). The XRONOS team's worry was many requests a minute. Agents and schedules still never fetch it.
- **Raw snapshots** live in the media bucket under `raw/`, kept private: `scripts/aws/bucket-policy.json` grants public
  reads on everything except `raw/*`.
- **Publishing** stops at a branch (`data-update-YYYY-MM-DD`); Rob merges it.
- **The change log page is public** (for every visitor).

## When unsure, leave it out (Rob, 23 Oct 2026)

Rob would rather the atlas missed something than showed something wrong. Every automatic step follows that:

- **Only certain labels map data.** XRONOS, ROAD and AADR labels reach an entity only through the explicit lists
  (`culture-labels.csv`, `road/species-labels.csv`), never by fuzzy matching. A mapped label may not hedge ("?", "or",
  "cf.", "aff.", "possibly"); a mapped ROAD taxon must be a firm species (no "cf.", "aff.", "or", "A/B"). The validator
  fails the build otherwise (`isHedgedLabel` / `isHedgedTaxon` in `scripts/lib/qa.ts`).
- **The source's own doubts count.** XRONOS dates claimed by two cultures, with whole-degree coordinates, outside their
  culture's sourced range, in the wrong country, or outlying at their site are left out (as before). AADR genomes are
  kept only at the grades accepted in `scripts/ingest/aadr.ts`; ROAD ages are clipped to the species' span and sites
  outside it dropped.
- **Suggestions are never applied.** The check's hints (a gap that seems to name an existing culture) only point a
  person at a possible label row.
- **Doubts block publishing.** `data:update -- --check` lists doubts: curated points more than 1 km from the Wikidata
  item they cite (or whose item lost its coordinates or is gone), cited Wikipedia pages that vanished, and checks that
  failed (so nothing could be verified). Step 3 refuses to publish while any remain.
- **New points are held back when they look wrong (step 3).** When an update brings in bulk points that were not
  there before, a point is published only if it also passes: not a geographic outlier among its entity's points
  (`outliers` in `scripts/lib/qa.ts`), not in a country where its entity had no point before, and not moving a
  culture's or species' span. Anything else is held back and listed in the update report with the reason; it joins
  only when a person confirms it (a reviewed list in `data/curated/`), otherwise it stays out. New Cliopatria polities
  in a new release are held back the same way until reviewed.

## Sources

| Source | Feeds | Version pin | How "newer" is found |
|---|---|---|---|
| XRONOS | ~2,560 culture and H. sapiens points | none (download date) | Rob's once-a-day download; compare hash |
| Cliopatria | civilization shapes | Zenodo record (v0.2.1) | Zenodo versions API |
| ROAD | fossil and culture points (via `data/curated/road/`) | export date | re-export with `road.R` (needs R), compare |
| AADR | `public/data/dna.json` | Dataverse file id + MD5 (v66.p1) | Dataverse versions API |
| Wikidata | short descriptions; P625 of 239 curated items | none | re-query, compare |
| Wikipedia | 210 pinned revisions (dates) | revision ids | latest revision per page (report only) |
| Paleo, climate, IntCal20 | coastlines, ice, climate, calibration | published papers | static; not in the routine run |

## Steps

1. **Raw snapshots shared between machines** (done and verified 23 Oct 2026, see below). Ends the "only some raw data on each machine" problem
   and the splicing workaround.
2. **Check** (done 23 Oct 2026, see below): one adapter per source comparing the lock with upstream; plus the work list of things only a person
   should add (unmapped XRONOS labels with date counts, new ROAD taxa and cultures, unmapped AADR groups, new or gone
   Cliopatria polities, Wikidata coordinates moved over 1 km, pinned Wikipedia pages edited since their pin, changes
   in set-aside and dropped XRONOS dates; with the existing recall/partial, picture and stale-narration lists).
   Usable alone as `data:update --check`. The once-a-day XRONOS download comes here.
3. **Update**: fetch what changed, check columns and hashes, push the snapshots, run the ingests that apply (ROAD,
   AADR), `data:build`, tests; compare the old `public/data` with the new (match features by id, then by entity,
   rounded coordinates and label) and write `data/build/update-report.md`. `--publish` then makes the branch, commits
   `public/data`, the lock and the change log, and runs `audio:upload` for any clips not yet in the bucket.
   Added automatically: what the pipeline's rules already decide (new dates under mapped labels, new genomes, new
   finds of mapped species, changes to imported polities). Everything else is only reported.
4. **Change log page** (`#/updates`, public): `public/data/changelog.json` (one entry per run: date, source versions,
   counts by category and source), details in `public/data/changelog/<date>.json` loaded when a run is opened; sites
   grouped by entity with "Show on the globe". Each run compares against the state at the last run, so hand-curated
   additions in between are logged too. Possibly backfilled from git history.
5. Optional: a weekly GitHub Action running only `--check` (never XRONOS) that opens an issue when upstream changed.

## Step 1: raw snapshots (`scripts/lib/raw-store.ts`, `scripts/raw.ts`)

- `data/sources.lock.json` (committed) lists each source's raw files: path, SHA-256, size, bucket key, download date
  and version when known. Keys are content-addressed (`raw/<source>/<hash16>/<file>`), so nothing is overwritten.
- `npm run data:raw` shows each source: locked or not, and whether this machine has the locked files.
- `npm run data:push -- <source>…` locks this machine's files for those sources and uploads any the bucket lacks.
- `npm run data:pull [-- <source>…]` downloads locked files missing here, checking each hash before it lands; a file
  that differs is left alone unless `--force`.
- `RAW_STORE=<dir>` uses a local folder instead of the bucket.
- The lock entries of the sources `data:build` reads (xronos, cliopatria, wikidata) are part of the build
  fingerprint, so locking a new snapshot makes `public/data` stale until rebuilt. `data:build` refuses to run when a
  locked file is missing or different here (`--ignore-lock` for side builds) and warns about unlocked files.

### Bootstrapping (done 23 Oct 2026)

Done as below: the policy applied, road and paleo pushed from the Linux machine, the other four from the XRONOS machine
(its build left features.geojson unchanged), then a pull and full build on the Linux machine reproduced public/data,
dna.json and the ROAD CSVs byte for byte.

1. Apply the bucket policy (needs Rob's AWS login):
   `aws s3api put-bucket-policy --bucket robs-ancestors-atlas --policy file://scripts/aws/bucket-policy.json`
   and check a raw key gives 403 over the public URL while media still loads.
2. On the ROAD machine (`~/projects/ancestor-atlas`): `npm run data:push -- road paleo`, commit the lock.
3. On the XRONOS machine: pull the branch, `npm run data:push -- xronos cliopatria wikidata aadr`, then
   `npm run data:build`. `public/data` should be unchanged apart from `build-meta.json` (if anything else moves, those
   machines had different raw files: look before committing). Commit the lock and `build-meta.json`.
4. Back on the first machine: `npm run data:pull`, `npm run data:build`: no change expected. From then on any machine
   builds the whole dataset.

## Step 2: the check (`npm run data:update -- --check`)

`scripts/update.ts`, checks in `scripts/update/check.ts`, report in `scripts/update/report.ts`. Read-only, about 45 s,
a few dozen batched requests (Zenodo, Dataverse, Wikipedia, Wikidata; never XRONOS). `--offline` skips the network.
Writes `data/build/update-report.md` (read it) and `update-check.json`; the next check marks gaps that are new (🆕).

- **Sources**: Cliopatria (Zenodo versions of the pinned record), AADR (latest Dataverse version's 1240K `.anno`),
  Wikidata descriptions (asked afresh), XRONOS and ROAD (age of the locked copy; XRONOS also notices a newer
  download not yet locked), paleo (static). Pins live in `scripts/fetch/pins.ts`.
- **Pinned Wikipedia revisions**: every `wikipedia:[lang:]Title@rev` and `title=…&oldid=…` in `data/curated` and `src`;
  pages edited since their newest pin, with edits since, size change and a diff link, most-cited first.
- **Wikidata coordinates**: points whose coordinates came from Wikidata (sites with `coord_source wikidata:Q…`, event
  places, XRONOS `move` fixes) more than 1 km from the item's P625 now, or whose item lost P625 or is gone.
- **Not mapped yet**: XRONOS labels on pre-1 CE dates with no mapped label (period names left out), ROAD taxa
  (uncertain ones left out) and culture names, AADR groups without a culture (place-and-period groups left out).
  A gap that names a culture the atlas already has is marked (only a label row is missing). Labels decided against go
  in `data/update-ignore.yaml`.
- **Other work lists**: recall and partial sites, stale narration, set-aside and dropped XRONOS dates.

`npm run data:fetch:xronos` (`scripts/fetch/xronos.ts`): Rob's once-a-day XRONOS download. Refuses within 24 h of the
last request (1 h after a failed one; every request recorded in `data/raw/xronos/download.json`), sends
If-None-Match / If-Modified-Since, checks the columns the ingest needs before replacing `data.csv`. Not for agents.

First run (23 Oct 2026): all upstream releases current; 51 of 211 pinned pages edited (mostly small; two pins are
years old: Archaic human admixture 2018, Settlement of the Americas 2023); one Wikidata mismatch (the Bourewa place on
`lapita-voyaging` cites Q154628, which is the Bismarck Archipelago); XRONOS gaps led by Pitted Ware
(Grübchenkeramik), Horgen, Cortaillod, Swifterbant, Mousterian (an existing culture: only the label row is missing),
Epicardial, Sauveterrian, Pfyn; AADR's Hungary_LN_Lengyel (31 genomes) is not linked to the Lengyel culture.
