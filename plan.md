# Implementation plan: Ancestor Atlas MVP

> **For the implementing agent:** this document is self-contained. Build exactly what is described here. Where something is unspecified, choose the simplest option that meets the acceptance checklist (section 9). **Do not add features beyond this scope.**

## 0. Summary

An interactive 3D globe with a non-linear time slider running from 10,000,000 BCE to 1 CE. Map entities in three categories appear and disappear according to their time ranges:

| Category | Data | Rendering |
|---|---|---|
| Species | Point sites | Circles |
| Culture | Point sites | Heatmap ("fuzzy zone") plus small clickable dots |
| Civilization | Polygons | Filled shapes |

Clicking any entity opens an info panel.

| Item | Value |
|---|---|
| Project location | `/home/rob/history-globe` |
| Stack | Vite, React, TypeScript, MapLibre GL JS v5 (globe), d3-scale, Zustand, Vitest |
| Data | Static GeoJSON (already written, see step 2). No backend. |

---

## 1. Project setup

```bash
cd /home/rob
npm create vite@latest history-globe -- --template react-ts
cd history-globe
npm install
npm install maplibre-gl@^5 d3-scale zustand
npm install -D @types/d3-scale vitest tsx
```

Add these scripts to `package.json`:
```json
"test": "vitest run",
"validate-data": "tsx scripts/validate-data.ts"
```

Delete the Vite boilerplate: the `App.css` contents, the logo assets and the counter demo.

---

## 2. Data

Copy the pre-built dataset into the project unchanged:
```bash
mkdir -p public/data
cp /home/rob/.gemini/antigravity-cli/brain/3ea2a2be-9131-45bb-ad4c-bd09b32df817/entities.geojson public/data/entities.geojson
```

The dataset has 24 features covering 22 entities: 6 species, 7 cultures and 11 civilization snapshots. Egypt has three snapshots (Old, Middle and New Kingdom) that share `entity_id: "egypt"`.

### Conventions (must be respected everywhere)
- **Years use astronomical numbering**, stored as signed integers: `1` = 1 CE, `0` = 1 BCE, `-2999` = 3000 BCE, `-9999999` = 10,000,000 BCE.
  - Converting from BCE: `year = 1 - bce`.
  - Converting to BCE: `bce = 1 - year`.
- A feature is **active** at year `Y` when `start_year <= Y <= end_year`. Both ends are inclusive.
- **Properties are flat**: no nested objects or arrays. MapLibre stringifies nested properties on query, so avoid them.
- **Geometry rules:**
  - `species` and `culture` use `MultiPoint` or `Point`.
  - `civilization` uses `Polygon` or `MultiPolygon`.

---

## 3. File structure

```
history-globe/
├─ public/data/entities.geojson
├─ scripts/validate-data.ts
├─ src/
│  ├─ main.tsx                 # (vite default, keep; import 'maplibre-gl/dist/maplibre-gl.css')
│  ├─ App.tsx                  # layout: <MapView/> full-screen + overlays
│  ├─ index.css                # global styles (dark theme)
│  ├─ types.ts
│  ├─ config.ts                # category colours/labels, era presets
│  ├─ store.ts
│  ├─ time/scale.ts
│  ├─ time/scale.test.ts
│  ├─ map/MapView.tsx
│  ├─ map/layers.ts
│  ├─ ui/TimeSlider.tsx
│  ├─ ui/Legend.tsx
│  └─ ui/InfoPanel.tsx
```

---

## 4. Module specifications

### 4.1 `src/types.ts`
```ts
export type Category = "species" | "culture" | "civilization";
export const CATEGORIES: Category[] = ["species", "culture", "civilization"];

export interface EntityProps {
  id: string;
  entity_id: string;
  name: string;
  category: Category;
  start_year: number;   // astronomical
  end_year: number;     // astronomical
  description: string;
  weight?: number;      // culture heatmap intensity 0–1
}
```

### 4.2 `src/config.ts`
```ts
export const CATEGORY_STYLE = {
  species:      { label: "Species",       color: "#ffd166", shape: "Point sites" },
  culture:      { label: "Cultures",      color: "#06d6a0", shape: "Fuzzy zones" },
  civilization: { label: "Civilizations", color: "#ef476f", shape: "Territories" },
} as const;

// Era jump chips. Years are astronomical.
export const ERA_PRESETS = [
  { label: "Sahelanthropus", year: -6_499_999 },
  { label: "Lucy",           year: -3_199_999 },
  { label: "First tools",    year: -2_499_999 },
  { label: "Out of Africa",  year: -1_799_999 },
  { label: "Neanderthals",   year: -199_999 },
  { label: "Cave art",       year: -29_999 },
  { label: "Natufian",       year: -12_999 },
  { label: "First farmers",  year: -4_999 },
  { label: "Bronze Age",     year: -2_249 },
  { label: "Persia",         year: -499 },
  { label: "1 CE",           year: 1 },
];
```

### 4.3 `src/time/scale.ts`: piecewise time scale

**Do all calculations in BCE space** (`bce = 1 - year`), so snapped values display as round numbers.

| Segment | BCE range | Slider position range | Snap step (years) |
|---|---|---|---|
| 0 | 10,000,000 → 1,000,000 | 0.00 → 0.15 | 100,000 |
| 1 | 1,000,000 → 100,000 | 0.15 → 0.35 | 10,000 |
| 2 | 100,000 → 10,000 | 0.35 → 0.55 | 1,000 |
| 3 | 10,000 → 3,000 | 0.55 → 0.75 | 100 |
| 4 | 3,000 → 0 (= 1 CE) | 0.75 → 1.00 | 10 |

```ts
import { scaleLinear } from "d3-scale";

export const BCE_BREAKS = [10_000_000, 1_000_000, 100_000, 10_000, 3_000, 0];
export const POS_BREAKS = [0, 0.15, 0.35, 0.55, 0.75, 1];
export const STEPS      = [100_000, 10_000, 1_000, 100, 10];
export const MIN_YEAR = 1 - BCE_BREAKS[0];   // -9_999_999
export const MAX_YEAR = 1;

const posToBce = scaleLinear().domain(POS_BREAKS).range(BCE_BREAKS).clamp(true);
const bceToPos = scaleLinear().domain(BCE_BREAKS).range(POS_BREAKS).clamp(true);
```

Functions to export (all pure functions):

| Function | Behaviour |
|---|---|
| `segmentOfBce(bce): number` | Index `i` such that `BCE_BREAKS[i] >= bce > BCE_BREAKS[i+1]`. Use `i = 4` for `bce <= 3000`. |
| `snapYear(year): number` | `bce = 1 - year`; `step = STEPS[segmentOfBce(bce)]`; `bce = Math.round(bce / step) * step`; return `1 - bce`, clamped to `[MIN_YEAR, MAX_YEAR]`. |
| `posToYear(pos): number` | `snapYear(1 - posToBce(pos))`, rounded. |
| `yearToPos(year): number` | `bceToPos(1 - year)` |
| `stepYear(year, dir: 1 \| -1): number` | `dir = 1` means forward in time (toward 1 CE). Use the step of the segment you are moving *into*: `bce = 1 - year`; `step = STEPS[segmentOfBce(dir === 1 ? bce - 1 : bce + 1)]`; return `snapYear(1 - (bce - dir * step))`, clamped. |
| `formatYear(year): string` | See rules below. |
| `formatRange(start, end): string` | `` `${formatYear(start)} – ${formatYear(end)}` `` |

`formatYear` rules, with `bce = 1 - year`:
- `bce >= 1_000_000` → `"c. X million years ago"`, where X is `bce / 1e6` with at most 2 decimals and trailing zeros trimmed. Example: `1.8`, `10`.
- `1 <= bce < 1_000_000` → `` `${bce.toLocaleString("en-US")} BCE` ``. Example: `"43,000 BCE"`.
- `year >= 1` → `` `${year} CE` ``.

**`scale.test.ts` must cover:**
- `posToYear(0) === -9_999_999`
- `posToYear(1) === 1`
- `formatYear(1) === "1 CE"`
- `formatYear(-2999) === "3,000 BCE"`
- `formatYear(-1_799_999) === "c. 1.8 million years ago"`
- `formatYear(0) === "1 BCE"`
- Round trip: `posToYear(yearToPos(y)) === y` for snapped years in every segment, e.g. `-4_999_999`, `-499_999`, `-42_999`, `-4_999`, `-1_549`.
- `snapYear` gives multiples of 100,000 BCE in segment 0 and multiples of 10 BCE in segment 4.
- `stepYear(1, 1) === 1` (clamped at the end)
- `stepYear(-9_999_999, -1) === -9_999_999` (clamped at the start)
- `stepYear(-2999, 1) === -2989`
- `stepYear(-2999, -1) === -3099`
- `stepYear(-999_999, 1) === -989_999`

### 4.4 `src/store.ts` (Zustand)
```ts
interface AppState {
  year: number;                                // astronomical, always snapped
  enabled: Record<Category, boolean>;          // all true initially
  selectedId: string | null;                   // feature `id`
  hits: EntityProps[];                         // all entities under last click (for "also here")
  playing: boolean;
  setYear(y: number): void;                    // applies snapYear + clamp
  toggleCategory(c: Category): void;
  select(id: string | null, hits?: EntityProps[]): void;
  setPlaying(p: boolean): void;
}
```

Behaviour:
- The initial year is `-1_799_999`, so the user sees *Homo erectus*, *Homo habilis* and the Oldowan on load.
- When the year changes or a category is toggled off, clear the selection if the selected entity is no longer visible. Do this in `MapView`, which knows the features (see 4.6).

### 4.5 `src/map/layers.ts`

Export `SOURCE_ID = "entities"` and a function `timeFilter(category, year)`:
```ts
["all",
  ["==", ["get", "category"], category],
  ["<=", ["get", "start_year"], year],
  [">=", ["get", "end_year"], year]]
```

Export the layer specs, **added in this order** (bottom to top):

| id | type | category | key paint |
|---|---|---|---|
| `civ-fill` | fill | civilization | colour `#ef476f`; `fill-opacity`: `["case", ["boolean", ["feature-state", "selected"], false], 0.6, 0.3]` |
| `civ-line` | line | civilization | colour `#ef476f`, width 1.5 |
| `culture-heat` | heatmap | culture | `heatmap-weight`: `["coalesce", ["get", "weight"], 0.8]`; `heatmap-intensity` 1; `heatmap-radius`: `["interpolate", ["exponential", 2], ["zoom"], 0, 18, 3, 60, 6, 300]`; `heatmap-opacity` 0.75; `heatmap-color`: transparent at 0, ramping through `rgba(6,214,160,0.2)` and `#06d6a0` to `#e0fff4` at 1 |
| `culture-dots` | circle | culture | radius 4; colour `#06d6a0`; stroke white 1; opacity 0.9. This is the clickable layer. |
| `species-circles` | circle | species | radius `["case", selected, 10, 7]`; colour `#ffd166`; stroke `#1a1a1a` width 2 |

`INTERACTIVE_LAYERS = ["species-circles", "culture-dots", "civ-fill"]`. This is also the click priority order.

> [!NOTE]
> Heatmap click-testing and true geographic sizing of zones are intentionally out of scope. Clicks on cultures go through `culture-dots`.

### 4.6 `src/map/MapView.tsx`
- A full-screen `div` with a ref. Create the map **once** in `useEffect` and call `map.remove()` in cleanup, because React StrictMode mounts twice.
- Map options:
  ```ts
  new maplibregl.Map({
    container, center: [30, 20], zoom: 1.6,
    style: {
      version: 8,
      projection: { type: "globe" },
      sources: {
        basemap: {
          type: "raster", tileSize: 256, maxzoom: 17,
          tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
          attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
        },
      },
      layers: [
        { id: "bg", type: "background", paint: { "background-color": "#0b1020" } },
        { id: "basemap", type: "raster", source: "basemap", paint: { "raster-saturation": -0.3, "raster-brightness-max": 0.8 } },
      ],
    },
  });
  ```
  If `projection` in the style is rejected by the installed v5 version, call `map.setProjection({ type: "globe" })` in the `style.load` handler instead. Add `NavigationControl` at top-right.
- On `load`:
  1. Add the source: `addSource(SOURCE_ID, { type: "geojson", data: "/data/entities.geojson", promoteId: "id" })`.
  2. Add the layers.
  3. Apply filters for the current store state.
- Wire the store to the map **without React re-renders**. Use `useStore.subscribe` (Zustand v5 with the default store; compare previous and current state manually) so that:
  - When `year` changes, call `setFilter` on all 5 layers with `timeFilter(cat, year)`. Batch with `requestAnimationFrame` so that dragging stays smooth.
  - When `enabled` changes, call `setLayoutProperty(layer, "visibility", on ? "visible" : "none")` for each layer of that category.
- Click handling, using `map.on("click", ...)`:
  1. Run `queryRenderedFeatures(e.point, { layers: INTERACTIVE_LAYERS })`.
  2. Dedupe the results by `properties.id`.
  3. Sort them by `INTERACTIVE_LAYERS` index.
  4. If there are no hits, call `select(null)`.
  5. Otherwise call `select(first.id, allHitsProps)`.
- Selection highlight: keep `prevSelectedId` in a ref. On change, clear the old feature state and set `setFeatureState({ source: SOURCE_ID, id }, { selected: true })` on the new one.
- Change the cursor to a pointer on `mouseenter`/`mouseleave` of the interactive layers.
- Auto-deselect: when `year` or `enabled` changes and an entity is selected, check its `start_year`/`end_year`/category against the new state using the stored hit props. If it is no longer visible, call `select(null)`.
- Empty state: track whether any enabled category has an active feature at `year`. Load the GeoJSON once with `fetch` into a module-level array for this check (and for 4.8). If nothing is active, show a centred, translucent overlay: *"No mapped entities at this point in time."*

### 4.7 `src/ui/TimeSlider.tsx`
A bottom-docked panel, full width with max-width 1100 px, semi-transparent dark background. Contents, from top to bottom:
1. **Current year readout**: large text from `formatYear(year)`, plus a small subtitle naming the segment, e.g. "Resolution: 1,000 years".
2. **Controls row**:
   - ⏮ (go to `MIN_YEAR`)
   - ◀ step back (`stepYear(year, -1)`)
   - ▶/⏸ play toggle
   - step forward ▶ (`stepYear(year, 1)`)
   - ⏭ (go to `MAX_YEAR`)
3. **Range input**: `<input type="range" min={0} max={10000} step={1}>`. Its value is `Math.round(yearToPos(year) * 10000)`, and `onChange` calls `setYear(posToYear(v / 10000))`.
4. **Ticks** absolutely positioned under the track at `POS_BREAKS`, with labels `10 Ma`, `1 Ma`, `100 ka`, `10,000 BCE`, `3,000 BCE`, `1 CE`.
5. **Era chips**: a horizontally scrollable row of buttons from `ERA_PRESETS`. Clicking one calls `setYear`.

Also:
- **Keyboard**: ←/→ call `stepYear`, and Space toggles play. Ignore keys while focus is in a text input.
- **Play**: a `requestAnimationFrame` loop that advances *position* by `dt / 60000` (the full timeline in about 60 s) and calls `setYear(posToYear(pos))`. Keep a fractional position in a ref so that snapping doesn't stall progress. Stop at the end. Pressing play when at `MAX_YEAR` restarts from `MIN_YEAR`.

### 4.8 `src/ui/Legend.tsx`
A top-left panel titled **"Ancestor Atlas"**, with one row per category:
- Checkbox (calls `toggleCategory`)
- Colour swatch: a circle for species, a soft blurred circle for culture, a square for civilization
- Label, with the shape description in muted text
- Count of active entities at the current year, e.g. "3 active". Compute it from the fetched features, counting **unique `entity_id`** per category.

### 4.9 `src/ui/InfoPanel.tsx`
A right-side panel, 340 px wide, shown only when `selectedId` is set. It has a close ✕ button, and `Esc` also closes it. Contents:
- A category badge, coloured using `CATEGORY_STYLE`
- The **name** as a heading
- The time range from `formatRange(start_year, end_year)`
- The description
- If `hits.length > 1`: an **"Also here:"** list of the other hits as buttons. Clicking one calls `select(thatId, hits)`.

### 4.10 `App.tsx` and `index.css`
- `App` renders `<MapView/>` filling `100vw × 100vh`, with `<Legend/>`, `<InfoPanel/>` and `<TimeSlider/>` as absolutely positioned overlays.
- `index.css`:
  - `body { margin: 0; background: #0b1020; color: #e8ecf4; font-family: system-ui, sans-serif; }`
  - Overlay panels: `background: rgba(12,18,32,0.85); backdrop-filter: blur(6px); border-radius: 10px; padding: 12px 14px; border: 1px solid rgba(255,255,255,0.08)`.
- Import `maplibre-gl/dist/maplibre-gl.css` in `main.tsx`.

---

## 5. `scripts/validate-data.ts`
Read `public/data/entities.geojson` and exit non-zero, with clear messages, if any of these fail:
- `id` is unique.
- Required properties are present and of the right type.
- `category` is one of the three values.
- `MIN_YEAR <= start_year <= end_year <= MAX_YEAR` (import the constants from `src/time/scale.ts`).
- Geometry type matches the category rules in section 2.
- Every polygon ring is closed (first point === last point).
- Longitude is in [-180, 180] and latitude in [-90, 90].

On success, print the count per category.

---

## 6. Implementation order

1. Setup and copy the data (steps 1–2). Run `npm run validate-data`.
2. Write `types.ts`, `config.ts` and `time/scale.ts` with tests. **Get `npm test` green before touching any UI.**
3. Write `store.ts`.
4. Build `MapView` with basemap and globe only. Check that it renders, pans and zooms.
5. Add the source, layers and time filters. Hard-code a few years to check that features show and hide.
6. Build `TimeSlider` and wire it to the store.
7. Build `Legend` with toggles and counts.
8. Add click handling, selection highlight, `InfoPanel` and the "also here" list.
9. Add the empty-state overlay, keyboard shortcuts and play.
10. Run `npm run build`. It must pass with no TS errors. Then run through the acceptance checklist.

---

## 7. Known gotchas
- **MultiPoint** works for both circle and heatmap layers. Don't split it into separate points.
- `promoteId: "id"` is required for `setFeatureState` to work with string IDs.
- **Don't pass a new `data` object to the source on every slider move.** Filtering must happen only through `setFilter`.
- Heatmap radius is in pixels. The interpolation in 4.5 is a rough approximation, and that's fine for this MVP.
- **Year 0 is 1 BCE.** Never write `-year` to get a BCE number. Always use `1 - year`.
- If the Esri tiles fail (network or terms), fall back to the `bg` background colour only. The app must still work, just with a blank globe.

---

## 8. Out of scope (do not build)
- A backend or database
- Routing
- Authentication
- Search
- Heatmap hit-testing and geographic sizing for zones
- Interpolating borders between keyframes
- Fading in and out for dating uncertainty
- Paleo-coastlines
- Text labels on the map (they need a glyph server)
- Mobile-specific layout beyond not breaking

---

## 9. Acceptance checklist

| # | Check | How to verify |
|---|---|---|
| 1 | `npm test`, `npm run validate-data` and `npm run build` all pass | CLI |
| 2 | The globe renders with the satellite basemap, and pan, zoom and rotate all work | `npm run dev` |
| 3 | On load (≈1.8 Ma), *Homo erectus* and *Homo habilis* points and the Oldowan heatmap are visible, and no civilizations are shown. The Acheulean starts at 1.76 Ma, so it is not visible yet. | Visual |
| 4 | Dragging the slider covers the full range smoothly. Ticks line up with the segments. The readout and resolution text update. | Visual |
| 5 | At 3,000 BCE the step buttons move by 10 years. Near 500,000 BCE they move by 10,000 years. | Click ◀ ▶ |
| 6 | "Persia" chip (500 BCE): Achaemenid Persia and Carthage polygons plus *H. sapiens* points are shown | Visual |
| 7 | Egypt changes shape at ≈2,500, ≈1,800 and ≈1,300 BCE, and disappears at 1,000 BCE | Era scrub |
| 8 | "Cave art" chip (30,000 BCE): Aurignacian and Gravettian heatmaps and *H. sapiens* points are shown. Neanderthals are not (they end at 40,000 BCE). | Visual |
| 9 | Unchecking a category hides its layers immediately, and its count still updates | Legend |
| 10 | Clicking a species point, a culture dot or a polygon opens the panel with the correct name, range, category and description. The selected feature is highlighted. | Click |
| 11 | Clicking a point inside a polygon prefers the point and lists the polygon under "Also here" | At 500 BCE, click the *H. sapiens* point at Skhul (Levant, 34.97°E 32.67°N), which is inside Persia |
| 12 | Moving the slider so that the selected entity becomes inactive closes the panel | Scrub |
| 13 | At 10,000,000 BCE the empty-state message appears | ⏮ |
| 14 | Play runs from start to 1 CE in about 60 s and stops. ←/→ step and Space toggles play. | Keyboard |