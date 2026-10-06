// Downloads the Cliopatria release from Zenodo into data/raw/cliopatria/.
// Usage: tsx scripts/fetch/cliopatria.ts [--force]
// The release is a ~300 MB archive of the GitHub repo that contains cliopatria.geojson.zip.
import { execFileSync } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

// Pinned to a release for reproducibility; keep in sync with data/curated/sources.yaml.
const RECORD = process.env.CLIOPATRIA_RECORD ?? "23128623"; // v0.2.1, doi:10.5281/zenodo.23128623
const DIR = "data/raw/cliopatria";
export const CLIOPATRIA_GEOJSON = `${DIR}/cliopatria.geojson`;

const force = process.argv.includes("--force");
if (existsSync(CLIOPATRIA_GEOJSON) && !force) {
  console.log(`${CLIOPATRIA_GEOJSON} exists, skipping (use --force to refetch)`);
  process.exit(0);
}

mkdirSync(DIR, { recursive: true });
const HEADERS = { "User-Agent": "ancestor-atlas-data-fetch/0.1 (hobby project)", Accept: "application/json" };
const metaRes = await fetch(`https://zenodo.org/api/records/${RECORD}`, { headers: HEADERS });
if (!metaRes.ok) throw new Error(`Zenodo API ${metaRes.status}`);
const meta = (await metaRes.json()) as {
  doi: string;
  metadata: { title: string; version?: string; license?: { id: string } };
  files: { key: string; links: { self: string } }[];
};
console.log(`${meta.metadata.title}\n  doi:${meta.doi}  licence:${meta.metadata.license?.id}`);
const file = meta.files.find((f) => f.key.endsWith(".zip"));
if (!file) throw new Error("No zip file in Zenodo record");

const repoZip = `${DIR}/repo.zip`;
console.log(`Downloading ${file.key} ...`);
const res = await fetch(file.links.self, { headers: HEADERS, redirect: "follow" });
if (!res.ok || !res.body) throw new Error(`Download failed: ${res.status}`);
await pipeline(Readable.fromWeb(res.body as never), createWriteStream(repoZip));

// repo.zip -> <repo>/cliopatria.geojson.zip -> *polities_only*.geojson
execFileSync("unzip", ["-oj", repoZip, "*/cliopatria.geojson.zip", "-d", DIR], { stdio: "inherit" });
execFileSync("unzip", ["-o", `${DIR}/cliopatria.geojson.zip`, "-d", DIR], { stdio: "inherit" });
const extracted = readdirSync(DIR).find((f) => f.endsWith(".geojson") && f !== "cliopatria.geojson");
if (!extracted) throw new Error("Could not find geojson inside the release");
renameSync(`${DIR}/${extracted}`, CLIOPATRIA_GEOJSON);
rmSync(repoZip);
console.log(`Wrote ${CLIOPATRIA_GEOJSON}`);
