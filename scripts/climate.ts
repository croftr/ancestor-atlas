// Builds public/data/climate.json, the climate strip under the time slider and its popover (src/ui/ClimateStrip.tsx),
// from data/raw/paleo (scripts/fetch/paleo.ts) and the committed public/data/paleo/index.json (scripts/paleo.ts):
//   npm run data:climate
// Committed; not part of the data build or its fingerprint. All ages are ka, counting back from 1950.
//
//   d18o         [ka, ‰]            LR04 benthic δ18O stack, 0–5,320 ka (the strip's colour).
//   temperature  [ka, °C]           Global mean surface temperature compared with pre-industrial: Osman et al. 2021
//                                   (data assimilation) for 0–24 ka, relative to its youngest bin (0–200 years BP);
//                                   Friedrich et al. 2016 (model run through the glacial cycles) for 24–783 ka,
//                                   relative to its own 0 ka. The two agree at the join (both about −6.5 °C at 24 ka).
//   sea_level    [ka, m, lo?, hi?]  Compared with today. 0–80 ka: Gowan et al. 2021, as drawn on the globe (the ice-
//                                   sheet steps in public/data/paleo/index.json); 80–798 ka: Spratt & Lisiecki 2016's
//                                   long stack with its 95% range (it reads several metres above zero in the
//                                   Holocene, so it is not used for the last 80,000 years).
//   mis          [from ka, to ka, stage]  Marine Isotope Stages on the LR04 age model: 1 to 104, then the Pliocene's
//                                   lettered stages (G1 … TG6). Even numbers are cold (glacial), odd warm.
import { readFileSync, writeFileSync } from "node:fs";
import h5wasm from "h5wasm/node";
import { table } from "./lib/paleo-table.ts";

const RAW = "data/raw/paleo";
const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

// --- δ18O -------------------------------------------------------------------------------------------
const d18o = table("lisiecki2005.txt", /^\s*Time\s+d18O\s+Error/, [0, 1]);
if (d18o.length < 2100) throw new Error(`short LR04 table: ${d18o.length}`);

// --- Temperature --------------------------------------------------------------------------------------
await h5wasm.ready;
const osmanFile = new h5wasm.File(`${RAW}/LGMR_GMST_climo.nc`, "r");
const osmanVar = (name: string) => Array.from((osmanFile.get(name) as InstanceType<typeof h5wasm.Dataset>).value as Float32Array | Float64Array);
const osmanAge = osmanVar("age"); // years BP, bin mid-points, youngest first
const osmanT = osmanVar("gmst");
const youngest = osmanAge.indexOf(Math.min(...osmanAge));
const JOIN_KA = 24;
const osman = osmanAge
  .map((a, i) => [a / 1000, osmanT[i] - osmanT[youngest]])
  .filter(([ka]) => ka <= JOIN_KA)
  .sort((a, b) => a[0] - b[0]);
// ka, modelled anomaly, proxy anomaly (−999 where missing): the model column, against its own 0 ka.
const friedrich = table("friedrich2016temp.txt", /^age_calkaBP\t/, [0, 1]).sort((a, b) => a[0] - b[0]);
const f0 = friedrich.find(([ka]) => ka === 0)?.[1];
if (f0 === undefined || osman.length < 100) throw new Error("temperature tables missing rows");
const temperature = [...osman, ...friedrich.filter(([ka]) => ka > JOIN_KA).map(([ka, t]) => [ka, t - f0])].map(([ka, t]) => [round(ka, 2), round(t)]);
const atJoin = friedrich.find(([ka]) => ka === JOIN_KA)![1] - f0;
console.log(`Temperature at ${JOIN_KA} ka: Osman ${round(osman.at(-1)![1])} °C, Friedrich ${round(atJoin)} °C`);

// --- Sea level ----------------------------------------------------------------------------------------
const paleo = JSON.parse(readFileSync("public/data/paleo/index.json", "utf8")) as {
  snapshots: Record<string, { sea_level: number }>;
};
const gowan = Object.entries(paleo.snapshots)
  .flatMap(([id, s]) => (id.startsWith("gowan-") ? [[Number(id.slice(6)) / 10, s.sea_level]] : []))
  .sort((a, b) => a[0] - b[0]);
const GOWAN_END = gowan.at(-1)![0];
// ka, long-stack sea level, its 95% lower and upper bounds.
const spratt = table("spratt2016.txt", /^age_calkaBP\t/, [0, 5, 7, 8]).filter(([ka]) => ka > GOWAN_END);
const seaLevel = [...gowan, ...spratt.map(([ka, m, lo, hi]) => [ka, Math.round(m), Math.round(lo), Math.round(hi)])];

// --- Marine Isotope Stages -----------------------------------------------------------------------------
// "a/b <age>" rows: stage b starts at that age (and a ends). "5.5(peak)" rows are substage peaks.
const rows = readFileSync(`${RAW}/LR04_MISboundaries.txt`, "utf8")
  .split(/\r?\n/)
  .map((l) => l.trim().split(/\s+/))
  .filter((p) => p.length === 2 && /^[A-Za-z0-9]+\/[A-Za-z0-9]+$/.test(p[0]) && Number.isFinite(Number(p[1])));
const mis: [number, number, string][] = [];
let start = 0;
for (const [pair, age] of rows) {
  const [younger, older] = pair.split("/");
  if (mis.length && mis.at(-1)![2] !== younger) throw new Error(`MIS table out of order at ${pair}`);
  if (!mis.length) mis.push([0, 0, younger]);
  mis.at(-1)![1] = Number(age);
  start = Number(age);
  mis.push([start, start, older]);
}
mis.at(-1)![1] = d18o.at(-1)![0]; // the oldest stage runs to the end of the record
if (mis.length < 200) throw new Error(`only ${mis.length} stages`);

const SOURCES = [
  {
    name: "Climate (colour) and Marine Isotope Stages: LR04 benthic δ18O stack",
    citation:
      "Lisiecki, L.E. & Raymo, M.E., 2005. A Pliocene-Pleistocene stack of 57 globally distributed benthic δ18O records. Paleoceanography 20: PA1003. Stage boundaries: https://lorraine-lisiecki.com/LR04_MISboundaries.txt",
    url: "https://doi.org/10.1029/2004PA001071",
    licence: "NOAA NCEI Paleoclimatology archive (free use, cite the authors)",
  },
  {
    name: "Global temperature, 0–24 ka: Osman et al. 2021",
    citation: "Osman, M.B. et al., 2021. Globally resolved surface temperatures since the Last Glacial Maximum. Nature 599: 239–244.",
    url: "https://doi.org/10.1038/s41586-021-03984-4",
    licence: "NOAA NCEI Paleoclimatology archive (free use, cite the authors)",
  },
  {
    name: "Global temperature, 24–783 ka: Friedrich et al. 2016",
    citation:
      "Friedrich, T., Timmermann, A., Tigchelaar, M., Elison Timm, O. & Ganopolski, A., 2016. Nonlinear climate sensitivity and its implications for future greenhouse warming. Science Advances 2: e1501923.",
    url: "https://doi.org/10.1126/sciadv.1501923",
    licence: "NOAA NCEI Paleoclimatology archive (free use, cite the authors)",
  },
  {
    name: "Sea level, 80–798 ka: Spratt & Lisiecki 2016 (0–80 ka as on the globe: Gowan et al. 2021)",
    citation: "Spratt, R.M. & Lisiecki, L.E., 2016. A Late Pleistocene sea level stack. Climate of the Past 12: 1079–1092.",
    url: "https://doi.org/10.5194/cp-12-1079-2016",
    licence: "NOAA NCEI Paleoclimatology archive (free use, cite the authors)",
  },
];

writeFileSync(
  "public/data/climate.json",
  JSON.stringify({ sources: SOURCES, d18o, temperature, sea_level: seaLevel, mis }),
);
console.log(
  `Wrote public/data/climate.json: ${d18o.length} δ18O, ${temperature.length} temperature, ${seaLevel.length} sea level rows, ${mis.length} stages (${mis[0][2]} … ${mis.at(-1)![2]})`,
);
