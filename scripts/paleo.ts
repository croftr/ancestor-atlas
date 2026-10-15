// Builds the Ice Age geography layers and the climate strip from data/raw/paleo (scripts/fetch/paleo.ts):
//   npm run data:paleo
// Writes, all committed (not part of the data build or its fingerprint):
//   public/data/paleo/index.json        which snapshot to draw for each age, its sea level, and the sources
//   public/data/paleo/<snapshot>.json   GeoJSON: `land` (dry land then that is sea today), `sea` (sea then that
//                                       is land today) and `ice` (grounded ice sheets)
//   public/data/climate.json            LR04 benthic δ18O and the Spratt & Lisiecki sea level, by age
//
// Snapshots:
// - 0–80 ka, every 2,500 years: Gowan et al. 2021 (PaleoMIST 1.0). Its deformed base topography (relative to the
//   sea level of the time, so it carries the isostatic sinking under the ice sheets) changes ETOPO's present-day
//   relief: land then = ETOPO + (base(t) − base(0)) > 0. Ice: its grounded ice thickness.
// - 80–798 ka: Spratt & Lisiecki 2016 global sea level, applied evenly to ETOPO (no isostasy, no ice sheets),
//   rounded to 10 m so ages with about the same sea level share one snapshot.
// - Older: nothing (today's coastlines).
// All ages count back from 1950 (ka); the app converts the slider year.
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import h5wasm from "h5wasm/node";
import { contours } from "d3-contour";

const RAW = "data/raw/paleo";
const OUT = "public/data/paleo";

// ETOPO at 0.1°: row 0 is the southernmost (cell centres -89.95 + 0.1·row, -179.95 + 0.1·col).
const W = 3600, H = 1800;
const etopo = new Int16Array(readFileSync(`${RAW}/etopo-6min.i16`).buffer.slice(0));
if (etopo.length !== W * H) throw new Error("etopo grid has the wrong size");

/**
 * Low land counts as "under today's land" up to this height, so the land of the time reaches under
 * the basemap's own (Natural Earth) coastline and no thin gap of sea shows between them; likewise
 * the sea of the time reaches this far below sea level, out under today's sea.
 */
const TUCK = 20;
/** Snapshots whose sea level is within this of today's draw no land or sea (only ice). */
const MIN_SHIFT = 8;
/** Ice thinner than this (m, interpolated) is left off: the edge of the 1° grid's cells. */
const ICE_EDGE = 150;
/** Douglas–Peucker tolerance and smallest ring kept, in grid cells (0.1°). */
const SIMPLIFY = 0.35;
const MIN_AREA = 6;

// --- Gowan et al. 2021, 1° grid (lat -90..90, lon -180..180 inclusive) -------------------------------
await h5wasm.ready;
const nc = new h5wasm.File(`${RAW}/gowan-1deg.nc`, "r");
const variable = (name: string) => (nc.get(name) as InstanceType<typeof h5wasm.Dataset>).value;
const gTime = Array.from(variable("time") as Float64Array); // -80000 .. 0, years since 1950
const GW = 361, GH = 181;
const base = variable("base_topography") as Float32Array;
const iceT = variable("ice_thickness") as Float32Array;
const T0 = gTime.indexOf(0);

/** Bilinear value of a Gowan field at time index t, at fine grid cell (col, row). */
function gowanAt(field: Float32Array, t: number, col: number, row: number): number {
  const lon = -179.95 + 0.1 * col, lat = -89.95 + 0.1 * row;
  const x = lon + 180, y = lat + 90;
  const x0 = Math.min(GW - 2, Math.floor(x)), y0 = Math.min(GH - 2, Math.floor(y));
  const fx = x - x0, fy = y - y0;
  const o = t * GW * GH;
  const v = (xx: number, yy: number) => field[o + yy * GW + xx];
  return (v(x0, y0) * (1 - fx) + v(x0 + 1, y0) * fx) * (1 - fy) + (v(x0, y0 + 1) * (1 - fx) + v(x0 + 1, y0 + 1) * fx) * fy;
}

/** Sea level of a Gowan step relative to today: the median rise of the deep ocean floor. */
function gowanSeaLevel(t: number): number {
  const d: number[] = [];
  for (let i = 0; i < GW * GH; i++) if (base[T0 * GW * GH + i] < -3000) d.push(base[T0 * GW * GH + i] - base[t * GW * GH + i]);
  d.sort((a, b) => a - b);
  return d[d.length >> 1];
}

// --- Spratt & Lisiecki 2016, LR04 --------------------------------------------------------------------
function table(file: string, header: RegExp, cols: number[]): number[][] {
  const lines = readFileSync(`${RAW}/${file}`, "utf8").split("\n");
  const start = lines.findIndex((l) => header.test(l));
  const rows: number[][] = [];
  for (const line of lines.slice(start + 1)) {
    const v = line.trim().split(/\s+/).map(Number);
    if (v.length < Math.max(...cols) + 1 || v.some((x, i) => cols.includes(i) && !Number.isFinite(x))) {
      if (rows.length) break; // end of the table
      continue;
    }
    rows.push(cols.map((i) => v[i]));
  }
  return rows;
}
// ka, sea level (m relative to today): the long stack (0–798 ka, five records).
const seaLevel = table("spratt2016.txt", /^age_calkaBP\t/, [0, 5]);
// ka, δ18O (‰): LR04, 0–5,320 ka.
const lr04 = table("lisiecki2005.txt", /^\s*Time\s+d18O\s+Error/, [0, 1]);
if (seaLevel.length < 790 || lr04.length < 2100) throw new Error(`short tables: ${seaLevel.length}, ${lr04.length}`);

// --- Contouring ------------------------------------------------------------------------------------
type Ring = [number, number][];

function simplify(ring: Ring, tol: number): Ring {
  if (ring.length < 5) return ring;
  const keep = new Uint8Array(ring.length);
  // A closed ring starts and ends on one point: split it at the point farthest from there first.
  let split = 1;
  for (let i = 1; i < ring.length - 1; i++)
    if (Math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1]) > Math.hypot(ring[split][0] - ring[0][0], ring[split][1] - ring[0][1])) split = i;
  keep[0] = keep[split] = keep[ring.length - 1] = 1;
  const stack: [number, number][] = [
    [0, split],
    [split, ring.length - 1],
  ];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = ring[a], [bx, by] = ring[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    let best = -1, far = tol;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * (ring[i][0] - ax) - dx * (ring[i][1] - ay)) / len;
      if (d > far) (far = d), (best = i);
    }
    if (best > 0) {
      keep[best] = 1;
      stack.push([a, best], [best, b]);
    }
  }
  return ring.filter((_, i) => keep[i]);
}

const area = (r: Ring) => {
  let s = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]);
  return Math.abs(s / 2);
};

/** Whether any two edges of these rings cross (a spatial hash of edges, in grid units). */
function crosses(rings: Ring[]): boolean {
  const CELL = 8;
  const buckets = new Map<number, [Ring, number][]>();
  const side = (a: number[], b: number[], c: number[]) => (c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0]);
  for (const r of rings)
    for (let i = 0; i + 1 < r.length; i++) {
      const [a, b] = [r[i], r[i + 1]];
      for (let x = Math.floor(Math.min(a[0], b[0]) / CELL); x <= Math.floor(Math.max(a[0], b[0]) / CELL); x++)
        for (let y = Math.floor(Math.min(a[1], b[1]) / CELL); y <= Math.floor(Math.max(a[1], b[1]) / CELL); y++) {
          const key = x * 100_000 + y;
          const list = buckets.get(key) ?? buckets.set(key, []).get(key)!;
          for (const [r2, j] of list) {
            const [c, d] = [r2[j], r2[j + 1]];
            const d1 = side(c, d, a), d2 = side(c, d, b), d3 = side(a, b, c), d4 = side(a, b, d);
            if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
          }
          list.push([r, i]);
        }
    }
  return false;
}

/**
 * MultiPolygon (lon/lat) of the cells where field > 0. Each polygon is simplified as one: if that
 * makes its edges cross (a narrow neck pinched shut), gentler, then not at all; crossed rings
 * triangulate into wedges on the map.
 */
function polygons(field: Float64Array): number[][][][] {
  const [mp] = contours().size([W, H]).thresholds([0])(Array.from(field));
  const out: number[][][][] = [];
  for (const poly of mp.coordinates as Ring[][]) {
    if (area(poly[0]) < MIN_AREA) continue; // a tiny polygon: drop it, holes and all
    const kept = poly.filter((ring) => area(ring) >= MIN_AREA);
    let rings: Ring[] = [];
    for (const tol of [SIMPLIFY, SIMPLIFY / 3, 0]) {
      rings = kept.map((ring) => (tol ? simplify(ring, tol) : ring)).filter((r) => r.length >= 4);
      if (!crosses(rings)) break;
    }
    if (rings.length) out.push(rings.map((r) => r.map(([x, y]) => [round2(-180 + x * 0.1), round2(-90 + y * 0.1)])));
  }
  return out;
}
const round2 = (v: number) => Math.round(Math.min(180, Math.max(-180, v)) * 100) / 100;

interface Snapshot {
  sea_level: number;
  ice: boolean;
}

/**
 * Seas the flood starts from: the open ocean, and seas whose straits are too narrow for the 0.1° grid
 * to join them to it (Gibraltar, the Bosporus, the Danish straits, Bab-el-Mandeb). The Caspian is left
 * out: a lake, whose level did not follow the ocean's.
 */
const SEEDS: [lon: number, lat: number][] = [
  [-150, 0], // Pacific
  [-30, 30], // Atlantic
  [18, 35], // Mediterranean
  [34, 43], // Black Sea
  [19, 57], // Baltic
  [38.5, 20], // Red Sea
];
const cellOf = ([lon, lat]: [number, number]) => Math.round((lat + 89.95) / 0.1) * W + Math.round((lon + 179.95) / 0.1);

const queue = new Int32Array(W * H);
/**
 * Cells joined to the seeds (8-neighbours, wrapping east–west) through wet cells. Lakes and inland
 * basins below sea level (the Caspian, the Dead Sea, the Great Lakes' floors) are not reached, so
 * they never count as sea.
 */
function ocean(wet: Uint8Array): Uint8Array {
  const seen = new Uint8Array(W * H);
  let head = 0, tail = 0;
  for (const seed of SEEDS.map(cellOf)) {
    if (!wet[seed] || seen[seed]) continue;
    seen[seed] = 1;
    queue[tail++] = seed;
  }
  while (head < tail) {
    const i = queue[head++];
    const row = (i / W) | 0, col = i - row * W;
    const west = col === 0 ? W - 1 : -1, east = col === W - 1 ? 1 - W : 1;
    for (const r of [row - 1, row, row + 1]) {
      if (r < 0 || r >= H) continue;
      const c = r * W + col;
      for (const j of [c + west, c, c + east]) {
        if (wet[j] && !seen[j]) {
          seen[j] = 1;
          queue[tail++] = j;
        }
      }
    }
  }
  return seen;
}
const wetMask = (f: (i: number) => boolean) => {
  const m = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) m[i] = f(i) ? 1 : 0;
  return m;
};
const oceanToday = ocean(wetMask((i) => etopo[i] < 0));

function writeSnapshot(id: string, shift: Float64Array | number, ice: Float64Array | null): Snapshot {
  const features: object[] = [];
  const sl = typeof shift === "number" ? -shift : -median(shift);
  if (Math.abs(sl) >= MIN_SHIFT) {
    const then = new Float64Array(W * H);
    for (let i = 0; i < W * H; i++) then[i] = etopo[i] + (typeof shift === "number" ? shift : shift[i]);
    const oceanThen = ocean(wetMask((i) => then[i] < 0));
    const land = new Float64Array(W * H), sea = new Float64Array(W * H);
    for (let i = 0; i < W * H; i++) {
      const e = etopo[i];
      // Dry then, where today is sea (or low land, tucked under the basemap's coast); lakes left alone.
      land[i] = oceanToday[i] ? then[i] : e >= 0 ? Math.min(then[i], TUCK - e) : -1;
      // Sea then, where today is land (or shallow sea, tucked under it); only sea joined to the ocean.
      sea[i] = oceanThen[i] ? Math.min(-then[i], e + TUCK) : -1;
    }
    for (const [kind, f] of [["land", land], ["sea", sea]] as const) {
      const coordinates = polygons(f);
      if (coordinates.length) features.push({ type: "Feature", properties: { kind }, geometry: { type: "MultiPolygon", coordinates } });
    }
  }
  if (ice) {
    const coordinates = polygons(ice);
    if (coordinates.length) features.push({ type: "Feature", properties: { kind: "ice" }, geometry: { type: "MultiPolygon", coordinates } });
  }
  writeFileSync(`${OUT}/${id}.json`, JSON.stringify({ type: "FeatureCollection", features }));
  return { sea_level: Math.round(sl), ice: !!ice };
}

function median(a: Float64Array): number {
  // The open ocean's shift: sample deep cells.
  const d: number[] = [];
  for (let i = 0; i < a.length; i += 7) if (etopo[i] < -3000) d.push(a[i]);
  d.sort((x, y) => x - y);
  return d[d.length >> 1];
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const snapshots: Record<string, Snapshot> = {};
/** [from ka, to ka, snapshot id]: the snapshot drawn for ages from ≤ ka < to. */
const ranges: [number, number, string][] = [];

// Gowan steps, each covering ±1.25 ka around it.
for (const [t, year] of gTime.entries()) {
  const ka = -year / 1000;
  const id = `gowan-${String(ka * 10).padStart(3, "0")}`;
  const shift = new Float64Array(W * H);
  const ice = new Float64Array(W * H);
  for (let row = 0; row < H; row++)
    for (let col = 0; col < W; col++) {
      const i = row * W + col;
      shift[i] = gowanAt(base, t, col, row) - gowanAt(base, T0, col, row);
      ice[i] = gowanAt(iceT, t, col, row) - ICE_EDGE;
    }
  snapshots[id] = writeSnapshot(id, shift, ice);
  ranges.push([Math.max(0, ka - 1.25), ka + 1.25, id]);
  console.log(`${id}: sea level ${snapshots[id].sea_level} m (stack: ${gowanSeaLevel(t).toFixed(0)})`);
}

// Spratt & Lisiecki beyond, in 10 m steps.
const gowanEnd = Math.max(...ranges.map((r) => r[1]));
const slRows = seaLevel.filter(([ka]) => ka >= Math.ceil(gowanEnd));
for (const [n, [ka, sl]] of slRows.entries()) {
  const step = Math.round(sl / 10) * 10;
  const id = `sl${step < 0 ? "m" : "p"}${String(Math.abs(step)).padStart(3, "0")}`;
  if (!snapshots[id]) {
    snapshots[id] = writeSnapshot(id, -step, null);
    console.log(`${id}: sea level ${step} m`);
  }
  const from = n === 0 ? gowanEnd : ka - 0.5;
  const to = ka + 0.5;
  const last = ranges.at(-1)!;
  if (last[2] === id && Math.abs(last[1] - from) < 1e-9) last[1] = to;
  else ranges.push([from, to, id]);
}

const SOURCES = [
  {
    name: "Ice sheets and sea level, 0–80 ka: Gowan et al. 2021, PaleoMIST 1.0",
    citation:
      "Gowan, E.J. et al., 2021. A new global ice sheet reconstruction for the past 80 000 years. Nature Communications 12: 1199. Data: PANGAEA, https://doi.org/10.1594/PANGAEA.905800",
    url: "https://doi.org/10.1038/s41467-021-21469-w",
    licence: "CC BY 4.0",
  },
  {
    name: "Sea level, 80–800 ka: Spratt & Lisiecki 2016",
    citation: "Spratt, R.M. & Lisiecki, L.E., 2016. A Late Pleistocene sea level stack. Climate of the Past 12: 1079–1092.",
    url: "https://doi.org/10.5194/cp-12-1079-2016",
    licence: "NOAA NCEI Paleoclimatology archive (free use, cite the authors)",
  },
  {
    name: "Present-day relief and sea floor: ETOPO 2022",
    citation: "NOAA National Centers for Environmental Information, 2022. ETOPO 2022 15 Arc-Second Global Relief Model. https://doi.org/10.25921/fd45-gt74",
    url: "https://doi.org/10.25921/fd45-gt74",
    licence: "Public domain (US Government)",
  },
  {
    name: "Climate strip: LR04 benthic δ18O stack",
    citation: "Lisiecki, L.E. & Raymo, M.E., 2005. A Pliocene-Pleistocene stack of 57 globally distributed benthic δ18O records. Paleoceanography 20: PA1003.",
    url: "https://doi.org/10.1029/2004PA001071",
    licence: "NOAA NCEI Paleoclimatology archive (free use, cite the authors)",
  },
];

writeFileSync(`${OUT}/index.json`, JSON.stringify({ snapshots, ranges: ranges.map(([a, b, id]) => [round3(a), round3(b), id]), sources: SOURCES }, null, 1));
function round3(v: number) {
  return Math.round(v * 1000) / 1000;
}

// Climate strip: δ18O by ka, and sea level by ka (for the tooltip).
writeFileSync(
  "public/data/climate.json",
  JSON.stringify({
    d18o: lr04.map(([ka, v]) => [ka, v]),
    sea_level: seaLevel.map(([ka, v]) => [ka, Math.round(v)]),
  }),
);

const files = readdirSync(OUT);
const bytes = files.reduce((s, f) => s + readFileSync(`${OUT}/${f}`).length, 0);
console.log(`Wrote ${files.length} files to ${OUT} (${(bytes / 1e6).toFixed(1)} MB), ${ranges.length} ranges, and public/data/climate.json`);
