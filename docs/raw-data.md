# Raw data

How the raw source files are shared between Rob's machines, and the rules every import follows. (A semi-automated
update command and a public change log page, `npm run data:update` and `#/updates`, were built 23 Oct 2026 and
removed 31 Oct 2026 at Rob's request: they never worked reliably. To update, Rob downloads XRONOS
(`npm run data:fetch:xronos`), locks it (`npm run data:push -- xronos`), runs `npm run data:build` and commits.)

## Decisions (Rob, 23 Oct 2026)

- **XRONOS**: a command Rob runs himself may download `https://xronos.ch/data.csv`, about once a day at most. The
  XRONOS team's worry was many requests a minute. Agents and schedules still never fetch it.
- **Raw snapshots** live in the media bucket under `raw/`, kept private: `scripts/aws/bucket-policy.json` grants public
  reads on everything except `raw/*`.

## When unsure, leave it out (Rob, 23 Oct 2026)

Rob would rather the atlas missed something than showed something wrong. Every automatic step follows that:

- **Only certain labels map data.** XRONOS, ROAD and AADR labels reach an entity only through the explicit lists
  (`culture-labels.csv`, `road/species-labels.csv`), never by fuzzy matching. A mapped label may not hedge ("?", "or",
  "cf.", "aff.", "possibly"); a mapped ROAD taxon must be a firm species (no "cf.", "aff.", "or", "A/B"). The validator
  fails the build otherwise (`isHedgedLabel` / `isHedgedTaxon` in `scripts/lib/qa.ts`).
- **The source's own doubts count.** XRONOS dates claimed by two cultures, with whole-degree coordinates, outside their
  culture's sourced range, in the wrong country, or outlying at their site are left out (as before). AADR genomes are
  kept only at the grades accepted in `scripts/ingest/aadr.ts` (see below); ROAD ages are clipped to the species' span and sites
  outside it dropped.
- **Unverified curated sites are not drawn.** A row in `species-sites.csv` / `culture-sites.csv` needs both coordinate
  and date evidence (`siteStatus` sourced); the build leaves the others out (25 on 23 Oct 2026) until they have it.
- **Provisional genomes are left out.** AADR's PROVISIONAL_PASS (no reason given) is not accepted (768 people on
  23 Oct 2026); Pass and MERGE_PASS are.

## Sources

| Source | Feeds | Version pin |
|---|---|---|
| XRONOS | ~2,560 culture and H. sapiens points | none (download date) |
| Cliopatria | civilization shapes | Zenodo record (v0.2.1) |
| ROAD | fossil and culture points (via `data/curated/road/`) | export date |
| AADR | `public/data/dna.json` | Dataverse file id + MD5 (v66.p1) |
| Wikidata | short descriptions; P625 of 239 curated items | none |
| Wikipedia | 210 pinned revisions (dates) | revision ids |
| Paleo, climate, IntCal20 | coastlines, ice, climate, calibration | published papers |

## Raw snapshots (`scripts/lib/raw-store.ts`, `scripts/raw.ts`)

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
