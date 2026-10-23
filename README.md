# Ancestor Atlas

<p align="center">
  <img src="public/logo-128.webp" alt="Ancestor Atlas Logo" width="100" />
</p>

<p align="center">
  <strong>An interactive journey through deep time — exploring human evolution, ancient fossil sites, and early civilizations across a 3D globe.</strong>
</p>

<p align="center">
  <a href="https://ancestor-atlas-lilac.vercel.app/"><strong>🚀 Launch Ancestor Atlas</strong></a>
</p>

---

## 🌍 Welcome to Ancestor Atlas

**Ancestor Atlas** is an interactive, deep-time digital globe designed to help anyone visualize and explore the epic story of our shared ancestors — from the earliest hominids walking the earth millions of years ago to the emergence of modern humans and early civilizations.

### About this Project

This is a personal hobby project born out of a genuine fascination with human prehistory: how our distant ancestors evolved over millions of years, how early *Homo sapiens* migrated across the continents, and how complex cultures and early civilizations first arose.

- **100% Non-Commercial & Free**: Ancestor Atlas is completely non-commercial, free, and open for anyone to explore.
- **Sparking Curiosity & Learning**: If this project helps spark a passion for anthropology, human origins, and ancient history in someone else, or serves as an engaging educational resource for students, teachers, and curious minds, that's the ultimate goal.

---

## ✨ What You Can Explore

- ⏳ **Scrub Through Millions of Years**: Use the intuitive deep-time slider to travel from over 7 million years ago (the Miocene era) all the way into ancient history (1 CE). The timeline expands dynamically so you can explore both vast evolutionary epochs and rapid historical changes.
- 🦴 **Ancient Hominid Fossil Sites**: Discover the real-world locations where famous fossils were found — from *Sahelanthropus* and *Australopithecus* ("Lucy") to *Homo erectus*, Neanderthals, and early *Homo sapiens* — complete with artist reconstructions, fossil details, and geological contexts.
- 🪨 **Archaeological Cultures & Prehistoric Sites**: See where ancient tools, rock art, and early cultural traditions appeared across Africa, Europe, Asia, Oceania, and the Americas.
- 🏛️ **Early Civilizations & Polities**: Watch early city-states, kingdoms, and civilizations emerge, grow, and interact across the globe.
- 🧊 **Ice Age Coastlines & Ice Sheets**: The globe redraws its coastlines as sea level rose and fell: Beringia, Sunda, Sahul and Doggerland appear as dry land, and the great ice sheets spread over North America and northern Europe (sea level for the last 800,000 years; ice sheets for the last 80,000).
- 🧭 **Migration Routes**: Watch modern humans spread out of Africa, across Asia to Australia, into Europe and over Beringia into the Americas; then farming spread into Europe, Austronesian seafarers sailed out of Taiwan across the Pacific, and Bantu-speaking farmers spread across Africa. Each route grows as the slider passes the dated sites it joins.
- 🧬 **Interbreeding**: See when Neanderthals, Denisovans and modern humans had children together, from the first modern human DNA in Neanderthals 250,000 years ago to Denny, a Neanderthal–Denisovan child, and the Neanderthal and Denisovan DNA many people carry today.
- 🧬 **Ancient DNA**: Over 9,000 sampled ancient genomes, coloured by father's or mother's line, so you can watch lineages such as R1b sweep across Europe after 3000 BCE. Each site lists the people sampled there with their haplogroups, dates and publications.
- 🌡️ **Climate**: The stage badge under the year, the climate panel and, during tours, the gauges at the top show the global temperature, sea level and Marine Isotope Stage of the moment, with a small chart of the glacial cycles around it.
- 🤝 **Who Lived When**: Each species card lists the other species alive at the same time.
- 🔍 **Instant Search**: Search across any species, fossil discovery, archaeological site, or civilization to jump directly to it in space and time.
- 🎨 **Custom Globe Themes**: Choose from multiple basemap styles (including dark globe, parchment, and blueprint themes) to suit your viewing preference.

---

## 🔬 Grounded in Science & Open Data

While the app is designed to be accessible and fun to browse, accuracy matters. Ancestor Atlas prioritises transparent, peer-reviewed science:

- **Sourced Coordinates & Dates**: Every discovery site and time range is tied to verified academic citations (DOIs, Wikidata entities, and museum records).
- **Calibrated Radiocarbon & Deep Time Dating**: Dates reflect calibrated scientific dating ranges. Where dates or locations carry scholarly uncertainty, they are clearly marked as approximate so you know what is firmly known and what is still being researched.

---

## 🚀 Running the Project Locally

> **Want to explore immediately without installing anything?**  
> Simply visit the live version at [**ancestor-atlas-lilac.vercel.app**](https://ancestor-atlas-lilac.vercel.app/).

If you'd like to run or contribute to the project on your own computer:

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher recommended)

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/croftr/ancestor-atlas.git
   cd ancestor-atlas
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```

4. Open your browser and visit `http://localhost:5173` to explore the atlas!

---

## 🛠️ Data Pipeline & Developer Guide

Ancestor Atlas uses a curated pipeline to ingest, validate, and build the geo-data loaded by the web app:

```
data/raw (fetched, gitignored) → data/curated (hand-edited) → public/data (built & loaded by app)
```

### Key Data Scripts

```bash
npm run data:fetch        # Download raw sources (Cliopatria polities ~300 MB + Wikidata descriptions)
npm run data:pull         # Download the locked raw snapshots (data/sources.lock.json) missing on this machine
npm run data:push -- road # Lock this machine's raw files for a source and upload them (see docs/data-updates.md)
npm run data:build        # Ingest, merge curated files, write public/data/*, and validate
npm run data:check        # Verify public/data matches curated inputs (runs on build)
npm run data:report       # Generate QA report & work list (data/build/qa-report.md)
npm run sites:candidates  # Search Wikidata items for unsourced sites
npm run sites:sync        # Synchronise coordinates for confirmed Wikidata items
npm run data:fetch:paleo  # Download the Ice Age geography and climate inputs (ETOPO, Gowan et al., sea level, LR04)
npm run data:paleo        # Build public/data/paleo/ (coastlines, ice; slow: ~11 min)
npm run data:climate      # Build public/data/climate.json (climate popover, panel and tour gauges; needs public/data/paleo)
npm test                  # Run automated test suites (Vitest)
```

### Data Files

- **Built files (`public/data/`)**:
  - `entities.json`: Entity registry (species, cultures, polities).
  - `features.geojson`: Geographic features per site or polity boundary.
  - `sources.json`: Academic bibliography and attribution records.
- **Curated inputs (`data/curated/`)**:
  - `entities.yaml`: Descriptions, parent-child relationships, color schemes.
    A civilization's `region` is worked out at build time from its Cliopatria territory maps (where most of the territory lay, weighted by area and years, using UN M49 subregions; see `scripts/lib/regions.ts`); setting `region` here overrides it.
  - `sources.yaml`: Attribution records and licensing metadata.
  - `*-sites.csv`: Discovery sites with provenance coordinates and dating sources.
  - `culture-labels.csv` / `culture-windows.csv`: Which XRONOS labels map to which culture, and each culture's sourced date range.
  - `road/species-labels.csv`: Which ROAD taxa map to which species (blank `entity_id`: listed but not imported).
  - `road/sites.csv`, `road/culture-sites.csv`: Generated by `npm run data:ingest:road` from the raw ROAD export (fossil
    sites; Palaeolithic culture sites); committed, never hand-edited. The `road` rows of `culture-labels.csv` say which ROAD
    culture names map to which culture.
  - `xronos-site-fixes.csv`: Hand-checked XRONOS sites whose coordinates fail the country check: corrected from Wikidata (`move`) or confirmed despite a wrong country code (`keep`).
- **Reference data (`data/reference/`)**: `intcal20.14c`, the IntCal20 radiocarbon calibration curve (Reimer et al. 2020).

### Bulk Culture Data (XRONOS)

Culture site points also come from radiocarbon dates in [XRONOS](https://xronos.ch) (CC BY 4.0). Download
`https://xronos.ch/data.csv` by hand into `data/raw/xronos/data.csv`; `npm run data:build` only reads that local copy.
The XRONOS team confirmed (October 2026) that using the data this way is welcome: download the export once, or at
most about daily, and cache it. Never crawl or repeatedly request their CSV files, which is why `robots.txt` lists them. Dates are calibrated with IntCal20, kept only if they fall within the
culture's sourced date range, and grouped into one point per site.
At sites with four or more dates, an oldest or youngest date that stands apart from the rest (at least 500 years from
its nearest neighbour, with no overlap between their 95% ranges) is set aside, up to a quarter of the site's dates. The
point's date text names it, and `data/build/xronos-set-aside.csv` lists every set-aside date for review.
A site is dropped when its coordinates do not fit the record's country: the point lies clearly in another country
(offline point-in-country test with [country-coder](https://github.com/rapideditor/country-coder), allowing about 25 km
for borders and coasts), or it is far from the rest of that country's dates. These are mostly corrupted longitudes.
`data/build/xronos-dropped-coords.csv` lists them; sites checked by hand go in `data/curated/xronos-site-fixes.csv`.
Dates on human remains (species *Homo sapiens*) also become *H. sapiens* site points (before 10,000 BCE only). Each
XRONOS point links to an XRONOS record and lists the publications and compilations behind its dates. As
[XRONOS asks](https://xronos.ch/about/citation), cite both those original sources and XRONOS itself: Roe, J., Schmid, C.,
Ebrahimiabareghi, S., Heitz, C. & Hinz, M., 2025. XRONOS: An Open Data Infrastructure for Archaeological Chronology.
*Journal of Computer Applications in Archaeology* 8(1): 242–263. https://doi.org/10.5334/jcaa.191

### Bulk Hominin Fossil Data (ROAD)

Species site points also come from the [ROCEEH Out of Africa Database](https://www.roceeh.net) (ROAD, CC BY-SA 4.0),
which records hominin finds, layer ages and archaeological cultures for sites from 3 Ma to 20 ka. Export it by hand,
once, with the roadDB R package: `Rscript scripts/fetch/road.R` (needs R, `libpq-dev` and `install.packages("roadDB")`)
writes `data/raw/road/`. Then `npm run data:ingest:road` writes `data/curated/road/sites.csv`, which is committed, so
machines without the raw export build the same points. Taxa map to species only through
`data/curated/road/species-labels.csv`; uncertain identifications (cf., aff., sp., "X or Y") are not imported. One point
per species and locality; its window is ROAD's age bracket for the finds' layers, clipped to the species' span in
`entities.yaml` (sites outside it are dropped and listed in `data/build/road-dropped.csv`). The card shows the finds
(cranial, dental, postcranial), any dates on those layers and their publications, and the cultures ROAD records in the
same layer. Localities of one species within 1 km of each other become one point. A ROAD point within 2 km of a curated
or XRONOS point of the same species is not drawn; its finds and cultures are listed on that point's card instead. ROAD-derived points
are shared under CC BY-SA 4.0. ROAD also gives Palaeolithic culture sites (Oldowan, Acheulean, Middle Stone Age,
Mousterian, Micoquian, Szeletian, Châtelperronian, Aurignacian, Gravettian, Solutrean, Epigravettian, Magdalenian): its
assemblages whose culture maps through the `road` rows of `culture-labels.csv`, one point per culture and locality, with
the same clipping, merging and 2 km rules. Cite: Kandel, A.W. et al., 2023. The ROCEEH Out of Africa Database (ROAD): A large-scale
research database serves as an indispensable tool for human evolutionary studies. *PLOS ONE* 18(8): e0289513.
https://doi.org/10.1371/journal.pone.0289513

### Ice Age Geography, Climate and Routes

Built by `npm run data:paleo` (`scripts/paleo.ts`) from inputs fetched by `npm run data:fetch:paleo` into
`data/raw/paleo/`, and committed; they are not part of `data:build` or its fingerprint.

- **Coastlines and ice, 0–80 ka**: Gowan, E.J. et al., 2021. A new global ice sheet reconstruction for the past 80 000
  years. *Nature Communications* 12: 1199 (PaleoMIST 1.0, CC BY 4.0; data https://doi.org/10.1594/PANGAEA.905800). Its
  1° deformed topography change, every 2,500 years, is added to ETOPO 2022's present-day relief at 0.1° (NOAA NCEI,
  public domain, https://doi.org/10.25921/fd45-gt74); ice is its grounded ice thickness.
- **Coastlines, 80–800 ka**: the Spratt, R.M. & Lisiecki, L.E., 2016 sea level stack (*Climate of the Past* 12:
  1079–1092), applied evenly to ETOPO in 10 m steps (no ice sheets, no isostasy). Older: today's coastlines.
- Only sea joined to the ocean counts (a flood fill from the open ocean and the enclosed seas), so lakes and inland
  basins such as the Caspian and the Dead Sea are left alone.
- **Climate popover, panel and tour gauges** (`npm run data:climate`, `scripts/climate.ts`):
  - Colour and Marine Isotope Stages: Lisiecki, L.E. & Raymo, M.E., 2005. A Pliocene-Pleistocene stack of 57 globally
    distributed benthic δ18O records. *Paleoceanography* 20: PA1003 (stage boundaries from Lisiecki's LR04 site).
  - Global temperature against pre-industrial: Osman, M.B. et al., 2021. Globally resolved surface temperatures since
    the Last Glacial Maximum. *Nature* 599: 239–244 (0–24 ka); Friedrich, T. et al., 2016. Nonlinear climate
    sensitivity and its implications for future greenhouse warming. *Science Advances* 2: e1501923 (24–783 ka, the
    model reconstruction, against its own 0 ka). Older: not shown.
  - Sea level: Gowan et al. 2021 for 0–80 ka (as on the globe); Spratt & Lisiecki 2016 with its 95% range beyond.
- **Migration routes** (`src/routes/routes.ts`): hand-picked like the tours. Each route joins dated sites already on the
  globe (so each date and place carries that site's source); `via` points only bend the line along a coast or strait.
  The direction of each route follows a pinned Wikipedia revision: *Early human migrations* (Out of Africa),
  *Neolithic Europe* (farming), *Lapita culture* (Austronesian expansion) and *Bantu expansion*.
- **Interbreeding** (`src/geneflow/geneflow.ts`): seven episodes of gene flow between human species, each a dashed link
  from a site of the donor species to a site of the receiving one (or a ring at one site, for Denny), shown near its
  date. The genomes rarely say where it happened, so the sites stand for the two populations. Dates and descriptions
  follow pinned revisions of Wikipedia's *Interbreeding between archaic and modern humans*, *Neanderthal genetics* and
  *Denny (hybrid hominin)*.

### Ancient DNA (AADR)

The Ancient DNA layer (on by default; Settings) shows genomes from the Allen Ancient DNA Resource, release v66.p1
(CC0, https://doi.org/10.7910/DVN/FFIDCW). `npm run data:dna` downloads the pinned annotation table once into
`data/raw/aadr/` (checksum-checked) and runs `scripts/ingest/aadr.ts`, which writes `public/data/dna.json` (committed;
outside `data:build` and its fingerprint, loaded only when the layer is switched on).

- Individuals dated before 1 CE with coordinates and an AADR assessment of Pass, PROVISIONAL_PASS or MERGE_PASS; one
  row per individual (the one with most SNPs). About 9,500 people at 2,200 sites (same coordinates, merged within 1 km).
- Date ranges: AADR's mean ± 2 SD for direct radiocarbon dates; the full archaeological range for contextual ones.
- AADR group labels link to cultures through the `aadr` rows of `culture-labels.csv` (exact "_"-parts only).
- A site is coloured by the commonest Y or mtDNA haplogroup family among the people dated to the slider's year (three
  families each, the rest grey; hollow when none is called); its card lists everyone with their original publication.
- Cite: Mallick, S. et al., 2024. The Allen Ancient DNA Resource (AADR): a curated compendium of ancient human genomes.
  *Scientific Data*. https://doi.org/10.1038/s41597-024-03031-7, and the original publication of each genome.

### Provenance Rules

- **Strict sourcing**: Every coordinate and date must trace to a primary source, DOI, or verified Wikidata statement.
- **Open licensing**: All underlying sources and text adhere to open licenses (CC0, CC BY, CC BY-SA, or CC BY-NC) with full attribution.
- **Astronomical dating**: Years use astronomical conventions (1 CE = 1, 1 BCE = 0). Deep-time ages in "ka" (thousands of years ago) or "Ma" (millions of years ago) are measured before 1950.
