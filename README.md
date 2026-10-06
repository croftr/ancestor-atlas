# Ancestor Atlas

<img src="public/logo-128.webp" alt="Ancestor Atlas Logo" width="80" />

## Data pipeline

`data/raw` (fetched, gitignored) → `data/curated` (hand-edited) → `public/data` (built; what the app loads).

```
npm run data:fetch   # download Cliopatria (~300 MB) + Wikidata descriptions into data/raw
npm run data:build   # ingest, merge curated files, write public/data/*, validate
```

Built files: `entities.json` (registry), `features.geojson` (one feature per site or polity row), `sources.json`.
Curated inputs: `entities.yaml` (descriptions, overrides, civilization groups), `sources.yaml`, `*-sites.csv`.
Years are astronomical (1 CE = 1, 1 BCE = 0); ages in "ka"/"Ma" are before 1950.

```
npm run data:report        # QA report + work list: data/build/qa-report.md, recall-queue.csv
npm run sites:candidates   # find Wikidata items for unsourced sites -> data/build/site-candidates.csv
npm run sites:sync         # copy coordinates for rows whose `wikidata` QID has been accepted
npm run data:check         # is public/data up to date? (also run by `npm run build`, so Vercel won't ship stale data)
```

### Provenance rules

- Every coordinate and date must trace to a source. Never type in coordinates, dates or polygon vertices from
  memory (an AI's or anyone's). Descriptions can be AI-drafted, with review.
- Site rows record where each value came from: `wikidata` (site QID), `coord_source` (e.g.
  `wikidata:Q217043#P625`) and `date_source` (`doi:…` or `wikipedia:Title@revision`). `notes` holds caveats, and
  `review:` marks rows waiting on a human decision.
- `source_id: recall` marks the original AI-compiled rows (shown as "approximate, unverified"). A row can leave
  `recall` only when both `coord_source` and `date_source` are filled; the validator enforces this.
- Sources must be CC0, CC BY, CC BY-SA or CC BY-NC, always attributed (`sources.yaml`). Wikipedia text is BY-SA.
- `date_text` is the age as the source states it ("315 ± 34 ka", "c. 480 ka", "9500–8000 BCE");
  `start_year`/`end_year` are that range widened to at least two slider steps so short-lived sites stay visible.
  Calibrated radiocarbon only.
