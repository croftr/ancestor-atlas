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
See `data_plan.md` for the full plan and the schema.
