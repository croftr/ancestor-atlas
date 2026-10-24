// npm run news:update [-- --no-upload] [--dry-run] [--days <n>]
//
// The news feed (docs/news-feed.md): reads the outlets in feeds.ts, asks Claude which new items are about human
// evolution or the world before 1 CE and to describe them (classify.ts), joins reports of the same finding, and
// uploads news/feed.json to the media bucket, where #/news reads it. Fully automatic: nothing waits for a person,
// but doubtful items are left out. Run by Rob; no schedule yet.
//
//   --no-upload  write data/build/news/feed.json and public/news/feed.json (gitignored; the dev server reads it)
//                but leave the bucket alone
//   --dry-run    fetch the feeds and list the new items only; no Claude calls, nothing written
//   --days <n>   ignore items published more than n days ago (default 30)
//
// Settings in .env.local: ANTHROPIC_API_KEY (or an `ant auth login` profile), optional NEWS_MODEL.
// Uploading needs Rob's AWS login. data/build/news/seen.json remembers every item already judged, so each costs once
// per machine; data/build/news/report.md lists what this run kept and left out.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import type { NewsFeed, NewsStory } from "../../src/news/types.ts";
import { BUCKET, MEDIA_BASE_DEFAULT, REGION } from "../audio/encode.ts";
import { classify, MODEL, systemPrompt, type AtlasEntity, type KnownStory } from "./classify.ts";
import { FEEDS } from "./feeds.ts";
import { addCoverage, finish, knownIds, sameAs, storyFrom } from "./merge.ts";
import { idOf, parseFeed, type FeedItem } from "./parse.ts";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const KEY = "news/feed.json";
const OUT_DIR = "data/build/news";
const LOCAL_FEED = `${OUT_DIR}/feed.json`;
const DEV_FEED = "public/news/feed.json";
const SEEN = `${OUT_DIR}/seen.json`;
const REPORT = `${OUT_DIR}/report.md`;
/** Items per Claude request. */
const BATCH = 12;
/** How far back the stories offered for joining reach. */
const KNOWN_DAYS = 45;
const USER_AGENT = "AncestorAtlasNews/1.0 (+https://ancestor-atlas-lilac.vercel.app/; reads each feed once a day at most)";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const opt = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const upload = !flag("--no-upload");
const dryRun = flag("--dry-run");
const days = Number(opt("--days") ?? 30);
const fail = (msg: string): never => {
  console.error(msg);
  process.exit(1);
};

/** The published feed (the bucket's copy), or this machine's last one when only that is wanted. */
async function currentFeed(): Promise<NewsFeed> {
  const empty: NewsFeed = { updated: "", stories: [] };
  if (!upload) return existsSync(LOCAL_FEED) ? (JSON.parse(readFileSync(LOCAL_FEED, "utf8")) as NewsFeed) : empty;
  const base = process.env.VITE_MEDIA_BASE || MEDIA_BASE_DEFAULT;
  const r = await fetch(`${base}/${KEY}`, { cache: "no-store" });
  if (r.status === 404 || r.status === 403) return empty; // none published yet (S3 answers 403 for a missing key without list rights)
  if (!r.ok) return fail(`could not read the published feed (${r.status}); not uploading over it`);
  return (await r.json()) as NewsFeed;
}

async function fetchFeeds(): Promise<{ items: FeedItem[]; problems: string[] }> {
  const items: FeedItem[] = [];
  const problems: string[] = [];
  for (const f of FEEDS) {
    try {
      const r = await fetch(f.url, { headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const got = parseFeed(await r.text(), f.source);
      if (!got.length) throw new Error("no items");
      items.push(...got);
      console.log(`  ${f.id}: ${got.length}`);
    } catch (e) {
      problems.push(`${f.id} (${f.url}): ${(e as Error).message}`);
      console.warn(`  ${f.id}: ${(e as Error).message}`);
    }
  }
  return { items, problems };
}

const readJson = <T>(path: string, empty: T): T => (existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : empty);

async function main() {
  const entities = (JSON.parse(readFileSync("public/data/entities.json", "utf8")) as AtlasEntity[]).map(({ id, name, category, start_year, end_year }) => ({ id, name, category, start_year, end_year }));
  const entityIds = new Set(entities.map((e) => e.id));
  const seen = readJson<Record<string, string>>(SEEN, {});
  const feed = await currentFeed();
  const inFeed = knownIds(feed);

  console.log(`Reading ${FEEDS.length} feeds…`);
  const { items, problems } = await fetchFeeds();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const fresh = new Map<string, FeedItem>();
  for (const it of items) {
    const id = idOf(it.url);
    if (it.published >= since && !seen[id] && !inFeed.has(id) && !fresh.has(id)) fresh.set(id, it);
  }
  // Oldest first, so a finding's first report becomes the story and later ones its coverage.
  const todo = [...fresh.values()].sort((a, b) => a.published.localeCompare(b.published));
  console.log(`${todo.length} new item(s) in the last ${days} days (${items.length} read).`);
  if (dryRun) {
    for (const it of todo) console.log(`  ${it.published.slice(0, 10)} ${it.source}: ${it.title}`);
    return;
  }
  if (!todo.length) {
    writeReport([], [], problems, 0);
    return;
  }

  const client = new Anthropic();
  const system = systemPrompt(entities);
  const stories: NewsStory[] = feed.stories.map((s) => ({ ...s, also: s.also && [...s.also], entities: [...s.entities] }));
  const kept: NewsStory[] = [];
  const left: { item: FeedItem; reason: string }[] = [];
  let failed = 0;

  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    const cutoff = new Date(Date.now() - KNOWN_DAYS * 86_400_000).toISOString();
    const known: KnownStory[] = stories.filter((s) => s.published >= cutoff).map(({ id, title, summary }) => ({ id, title, summary }));
    process.stdout.write(`Judging items ${i + 1}–${i + batch.length}… `);
    let verdicts;
    try {
      verdicts = await classify(client, system, batch, known);
    } catch (e) {
      // Not marked seen, so the next run tries these again.
      failed += batch.length;
      console.warn(`failed: ${(e as Error).message}`);
      continue;
    }
    const byIndex = new Map(verdicts.map((v) => [v.index, v]));
    const batchIds = batch.map((it) => idOf(it.url));
    let n = 0;
    batch.forEach((item, j) => {
      const id = batchIds[j];
      const v = byIndex.get(j);
      if (!v) {
        left.push({ item, reason: "no verdict (left out as unsure)" });
        seen[id] = "left out: no verdict";
        return;
      }
      const outcome = storyFrom(item, v, entityIds);
      if ("left" in outcome) {
        left.push({ item, reason: outcome.left });
        seen[id] = `left out: ${outcome.left}`;
        return;
      }
      const story = outcome.story;
      const ref = /^\d+$/.test(v.same_as) ? (Number(v.same_as) < j ? batchIds[Number(v.same_as)] : undefined) : v.same_as || undefined;
      const first = sameAs(story, ref, stories);
      if (first) addCoverage(first, story);
      else {
        stories.push(story);
        kept.push(story);
      }
      seen[id] = first ? `kept, as coverage of ${first.id}` : "kept";
      n++;
    });
    console.log(`${n} kept`);
  }

  const out: NewsFeed = { updated: new Date().toISOString(), stories: finish(stories) };
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(SEEN, `${JSON.stringify(seen, null, 1)}\n`);
  const json = `${JSON.stringify(out)}\n`;
  writeFileSync(LOCAL_FEED, json);
  mkdirSync("public/news", { recursive: true });
  writeFileSync(DEV_FEED, json);
  writeReport(kept, left, problems, failed);

  if (upload) {
    const r = spawnSync("aws", ["s3", "cp", LOCAL_FEED, `s3://${BUCKET}/${KEY}`, "--content-type", "application/json", "--cache-control", "public, max-age=300", "--region", REGION, "--only-show-errors"], { encoding: "utf8", shell: process.platform === "win32" });
    if (r.status !== 0) fail(`upload failed (AWS login expired? aws sso login):\n${r.stderr.trim()}\nThe feed is in ${LOCAL_FEED}; rerun to try again.`);
    console.log(`Uploaded ${KEY}: ${out.stories.length} stories.`);
  } else console.log(`Wrote ${LOCAL_FEED} and ${DEV_FEED} (not uploaded).`);

  function writeReport(keptNow: NewsStory[], leftNow: typeof left, feedProblems: string[], failedCount: number) {
    mkdirSync(OUT_DIR, { recursive: true });
    const lines = [
      `# News update ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
      "",
      `Model ${MODEL}. Kept ${keptNow.length}, left out ${leftNow.length}${failedCount ? `, ${failedCount} not judged (request failed; tried again next run)` : ""}.`,
      "",
      "## Kept",
      ...keptNow.map((s) => `- **${s.title}** (${s.source}) · ${s.topic} · ${s.period.text}${s.entities.length ? ` · ${s.entities.join(", ")}` : ""}\n  ${s.summary}`),
      "",
      "## Left out",
      ...leftNow.map(({ item, reason }) => `- ${item.title} (${item.source}): ${reason}`),
    ];
    if (feedProblems.length) lines.push("", "## Feeds that failed", ...feedProblems.map((p) => `- ${p}`));
    writeFileSync(REPORT, `${lines.join("\n")}\n`);
    console.log(`Report: ${REPORT}`);
  }
}

main().catch((e) => fail(String(e?.stack ?? e)));
