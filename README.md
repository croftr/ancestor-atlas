# Ancestor Atlas

<p align="center">
  <img src="public/logo-128.webp" alt="Ancestor Atlas Logo" width="100" />
</p>

<p align="center">
  <strong>An interactive journey through deep time — exploring human evolution, ancient fossil sites, and early civilizations across a 3D globe.</strong>
</p>

<p align="center">
  <a href="https://ancestor-atlas-lilac.vercel.app/"><strong>🚀 Launch the Live Atlas: ancestor-atlas-lilac.vercel.app</strong></a>
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
npm run data:build        # Ingest, merge curated files, write public/data/*, and validate
npm run data:check        # Verify public/data matches curated inputs (runs on build)
npm run data:report       # Generate QA report & work list (data/build/qa-report.md)
npm run sites:candidates  # Search Wikidata items for unsourced sites
npm run sites:sync        # Synchronise coordinates for confirmed Wikidata items
npm test                  # Run automated test suites (Vitest)
```

### Data Files

- **Built files (`public/data/`)**:
  - `entities.json`: Entity registry (species, cultures, polities).
  - `features.geojson`: Geographic features per site or polity boundary.
  - `sources.json`: Academic bibliography and attribution records.
- **Curated inputs (`data/curated/`)**:
  - `entities.yaml`: Descriptions, parent-child relationships, color schemes.
  - `sources.yaml`: Attribution records and licensing metadata.
  - `*-sites.csv`: Discovery sites with provenance coordinates and dating sources.
  - `culture-labels.csv` / `culture-windows.csv`: Which XRONOS labels map to which culture, and each culture's sourced date range.
- **Reference data (`data/reference/`)**: `intcal20.14c`, the IntCal20 radiocarbon calibration curve (Reimer et al. 2020).

### Bulk Culture Data (XRONOS)

Culture site points also come from radiocarbon dates in [XRONOS](https://xronos.ch) (CC BY 4.0). XRONOS asks that its
exports are not fetched automatically, so download `https://xronos.ch/data.csv` by hand into `data/raw/xronos/data.csv`;
`npm run data:build` only reads that local copy. Dates are calibrated with IntCal20, kept only if they fall within the
culture's sourced date range, and grouped into one point per site.

### Provenance Rules

- **Strict sourcing**: Every coordinate and date must trace to a primary source, DOI, or verified Wikidata statement.
- **Open licensing**: All underlying sources and text adhere to open licenses (CC0, CC BY, CC BY-SA, or CC BY-NC) with full attribution.
- **Astronomical dating**: Years use astronomical conventions (1 CE = 1, 1 BCE = 0). Deep-time ages in "ka" (thousands of years ago) or "Ma" (millions of years ago) are measured before 1950.
