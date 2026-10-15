// Fetches the raw inputs for the Ice Age geography layers and the climate strip (scripts/paleo.ts):
//   npm run data:fetch:paleo
// Output, in data/raw/paleo/ (each skipped if already there; delete a file to fetch it again):
//   etopo-6min.i16      ETOPO 2022 surface elevation (NOAA NCEI, public domain), every 6th cell of the
//                       60 arc-second grid (0.1°), via OPeNDAP: int16 metres, 1800 rows (south to north)
//                       × 3600 columns (west to east), cell centres at -89.95 + 0.1·row, -179.95 + 0.1·col.
//   gowan-1deg.nc       Gowan et al. 2021, PaleoMIST 1.0 ice sheet reconstruction (CC BY 4.0), the 1° global
//                       grid (33 time steps, 80 ka to present), read out of the 3.7 GB PANGAEA zip with
//                       HTTP range requests so only this 35 MB file is downloaded.
//   spratt2016.txt      Spratt & Lisiecki 2016 sea level stack, 0–798 ka (NOAA NCEI paleo archive).
//   lisiecki2005.txt    LR04 benthic δ18O stack, 0–5.32 Ma (NOAA NCEI paleo archive).
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

const DIR = "data/raw/paleo";
mkdirSync(DIR, { recursive: true });

const NCEI = "https://www.ncei.noaa.gov/pub/data/paleo/contributions_by_author";
const ETOPO =
  "https://www.ngdc.noaa.gov/thredds/dodsC/global/ETOPO2022/60s/60s_surface_elev_netcdf/ETOPO_2022_v1_60s_N90W180_surface.nc";
const GOWAN_ZIP = "https://hs.pangaea.de/Maps/Global_Ice_Sheets/Gowan_ice_reconstruction.zip";
const GOWAN_ENTRY = "ice_reconstruction/global_grid/reconstruction_1_degree.nc";
const UA = { "User-Agent": "ancestor-atlas-data-fetch/0.1 (hobby project)" };

async function get(url: string, headers: Record<string, string> = {}): Promise<Buffer> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { ...UA, ...headers } });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      if (attempt >= 3) throw e;
      console.warn(`  retrying (${(e as Error).message})`);
    }
  }
}

async function text(name: string, url: string) {
  const out = `${DIR}/${name}`;
  if (existsSync(out)) return console.log(`have ${out}`);
  console.log(`GET ${url}`);
  writeFileSync(out, await get(url));
}

/** ETOPO 2022 at 0.1°: OPeNDAP ASCII, in bands of rows so no one request is huge. */
async function etopo() {
  const out = `${DIR}/etopo-6min.i16`;
  if (existsSync(out)) return console.log(`have ${out}`);
  const ROWS = 1800, COLS = 3600, STRIDE = 6, BAND = 150;
  const grid = new Int16Array(ROWS * COLS);
  for (let r0 = 0; r0 < ROWS; r0 += BAND) {
    // Index 3 + 6k: the middle of each 0.1° block of the 1/60° grid.
    const lat = `[${3 + r0 * STRIDE}:${STRIDE}:${3 + (r0 + BAND - 1) * STRIDE}]`;
    const lon = `[3:${STRIDE}:${3 + (COLS - 1) * STRIDE}]`;
    const url = `${ETOPO}.ascii?z${encodeURIComponent(lat + lon)}`;
    console.log(`GET ETOPO rows ${r0}–${r0 + BAND - 1}`);
    const body = (await get(url)).toString("utf8");
    let n = 0;
    for (const line of body.split("\n")) {
      const m = line.match(/^\[(\d+)\], (.*)$/);
      if (!m) continue;
      const row = r0 + Number(m[1]);
      const vals = m[2].split(", ").map(Number);
      if (vals.length !== COLS) throw new Error(`ETOPO row ${row}: ${vals.length} values`);
      for (let c = 0; c < COLS; c++) grid[row * COLS + c] = Math.round(vals[c]);
      n++;
    }
    if (n !== BAND) throw new Error(`ETOPO band at ${r0}: ${n} rows`);
  }
  writeFileSync(out, Buffer.from(grid.buffer));
}

/** One file out of a remote zip (ZIP64 aware), by HTTP range requests. */
async function zipEntry(url: string, entry: string): Promise<Buffer> {
  const head = await fetch(url, { method: "HEAD", headers: UA });
  const size = Number(head.headers.get("content-length"));
  const range = (a: number, b: number) => get(url, { Range: `bytes=${a}-${b - 1}` });
  const tail = await range(size - 65_536, size);
  const eocd = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error("no end of central directory");
  let cdSize = tail.readUInt32LE(eocd + 12);
  let cdOffset = tail.readUInt32LE(eocd + 16);
  const loc64 = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x06, 0x07]), eocd);
  if (loc64 >= 0) {
    const rec = await range(Number(tail.readBigUInt64LE(loc64 + 8)), Number(tail.readBigUInt64LE(loc64 + 8)) + 56);
    cdSize = Number(rec.readBigUInt64LE(40));
    cdOffset = Number(rec.readBigUInt64LE(48));
  }
  const cd = await range(cdOffset, cdOffset + cdSize);
  for (let p = 0; p < cd.length; ) {
    const method = cd.readUInt16LE(p + 10);
    let csize = cd.readUInt32LE(p + 20);
    let usize = cd.readUInt32LE(p + 24);
    const nameLen = cd.readUInt16LE(p + 28), extraLen = cd.readUInt16LE(p + 30), commentLen = cd.readUInt16LE(p + 32);
    let local = cd.readUInt32LE(p + 42);
    const name = cd.toString("utf8", p + 46, p + 46 + nameLen);
    if (name === entry) {
      // ZIP64 extra field: the 0xffffffff values, in order.
      for (let e = p + 46 + nameLen; e < p + 46 + nameLen + extraLen; ) {
        const id = cd.readUInt16LE(e), len = cd.readUInt16LE(e + 2);
        if (id === 1) {
          let q = e + 4;
          if (usize === 0xffffffff) (usize = Number(cd.readBigUInt64LE(q))), (q += 8);
          if (csize === 0xffffffff) (csize = Number(cd.readBigUInt64LE(q))), (q += 8);
          if (local === 0xffffffff) local = Number(cd.readBigUInt64LE(q));
        }
        e += 4 + len;
      }
      const lh = await range(local, local + 30);
      const start = local + 30 + lh.readUInt16LE(26) + lh.readUInt16LE(28);
      const data = await range(start, start + csize);
      const out = method === 0 ? data : inflateRawSync(data);
      if (out.length !== usize) throw new Error(`${entry}: ${out.length} bytes, expected ${usize}`);
      return out;
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`${entry} not in ${url}`);
}

async function gowan() {
  const out = `${DIR}/gowan-1deg.nc`;
  if (existsSync(out)) return console.log(`have ${out}`);
  console.log(`GET ${GOWAN_ENTRY} from ${GOWAN_ZIP}`);
  writeFileSync(out, await zipEntry(GOWAN_ZIP, GOWAN_ENTRY));
}

await text("spratt2016.txt", `${NCEI}/spratt2016/spratt2016.txt`);
await text("lisiecki2005.txt", `${NCEI}/lisiecki2005/lisiecki2005.txt`);
await gowan();
await etopo();
console.log("Done. Next: npm run data:paleo");
