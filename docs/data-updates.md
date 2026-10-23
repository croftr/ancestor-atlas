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
2. **Check**: one adapter per source comparing the lock with upstream; plus the work list of things only a person
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
