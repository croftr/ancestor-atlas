// Downloads the Allen Ancient DNA Resource's annotation table (CC0, Harvard Dataverse doi:10.7910/DVN/FFIDCW) once:
// one pinned release, skipped when the local copy is already there with the right checksum.
//   npm run data:dna   (fetch, then scripts/ingest/aadr.ts)
// Output: data/raw/aadr/<FILE> (gitignored). To move to a newer release, change the three constants below
// (file id and MD5 from the dataset's file list on Dataverse) and rerun.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

export const AADR_RELEASE = "v66.p1";
export const AADR_FILE = `data/raw/aadr/${AADR_RELEASE}_1240K.aadr.PUB.anno`;
const FILE_ID = 13994515;
const MD5 = "a2db1ac16f0f3558ed66fb251e1d5c7d";

const md5 = (buf: Buffer) => createHash("md5").update(buf).digest("hex");

if (existsSync(AADR_FILE) && md5(readFileSync(AADR_FILE)) === MD5) {
  console.log(`${AADR_FILE} present (${AADR_RELEASE}, checksum ok)`);
} else {
  const url = `https://dataverse.harvard.edu/api/access/datafile/${FILE_ID}`;
  console.log(`GET ${url}`);
  const res = await fetch(url, { headers: { "User-Agent": "ancestor-atlas-data-fetch/0.1 (hobby project)" } });
  if (!res.ok) throw new Error(`Dataverse ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (md5(buf) !== MD5) throw new Error(`checksum mismatch for ${AADR_RELEASE} (got ${md5(buf)}): not saved`);
  mkdirSync("data/raw/aadr", { recursive: true });
  writeFileSync(AADR_FILE, buf);
  console.log(`Wrote ${AADR_FILE} (${(buf.length / 1e6).toFixed(1)} MB)`);
}
