// Raw data snapshots shared between machines (see scripts/lib/raw-store.ts):
//   npm run data:raw                       which sources are locked, and whether this machine has those files
//   npm run data:push -- <id>… [--version v0.2.1]   lock this machine's files for those sources and upload them
//   npm run data:pull [-- <id>…] [--force]  download locked files missing here (--force: also replace differing ones)
// Sources: xronos, cliopatria, wikidata, road, aadr, paleo. Needs Rob's AWS login (or RAW_STORE=<directory>).
import { defaultStore, LOCK_PATH, pull, push, RAW_SOURCES, readLock, status, writeLock } from "./lib/raw-store.ts";

const [cmd = "status", ...rest] = process.argv.slice(2);
const flag = (name: string) => rest.includes(name);
const option = (name: string) => {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : undefined;
};
const ids = rest.filter((a, i) => !a.startsWith("--") && rest[i - 1] !== "--version");
const unknown = ids.filter((id) => !RAW_SOURCES.some((s) => s.id === id));
if (unknown.length) {
  console.error(`✗ unknown source ${unknown.join(", ")} (known: ${RAW_SOURCES.map((s) => s.id).join(", ")})`);
  process.exit(1);
}
const chosen = ids.length ? RAW_SOURCES.filter((s) => ids.includes(s.id)) : RAW_SOURCES;
const mb = (n: number) => `${(n / 1e6).toFixed(1)} MB`;
const files = (n: number) => `${n} file${n === 1 ? "" : "s"}`;
const lock = readLock();

if (cmd === "status") {
  for (const source of chosen) {
    const st = status(source, lock);
    if (!st.entry) {
      console.log(`${source.id}: not locked${st.unlocked.length ? ` (${files(st.unlocked.length)} here: npm run data:push -- ${source.id})` : ""}`);
      continue;
    }
    const bad = st.files.filter((f) => f.state !== "match");
    const size = st.files.reduce((n, f) => n + f.file.bytes, 0);
    const head = `${source.id}: ${st.entry.version ? `${st.entry.version}, ` : ""}retrieved ${st.entry.retrieved}, ${files(st.files.length)}, ${mb(size)}`;
    console.log(`${head} — ${bad.length ? `${bad.length} ${bad.every((f) => f.state === "missing") ? "missing here (npm run data:pull)" : "missing or different here"}` : "all here ✓"}`);
    for (const { file, state } of bad) console.log(`    ${state}: ${file.path}`);
    for (const f of st.unlocked) console.log(`    not locked: ${f}`);
  }
} else if (cmd === "push") {
  if (!ids.length) {
    console.error("✗ name the sources to push, e.g. npm run data:push -- road paleo");
    process.exit(1);
  }
  const store = defaultStore();
  for (const source of chosen) {
    console.log(`${source.id} -> ${store.name}`);
    const before = lock[source.id];
    const entry = push(source, store, { version: option("--version") ?? before?.version });
    const changed = JSON.stringify(before?.files) !== JSON.stringify(entry.files);
    lock[source.id] = entry;
    writeLock(lock);
    console.log(`✓ ${source.id}: ${changed ? `locked ${files(entry.files.length)}` : "unchanged"}`);
  }
  console.log(`Commit ${LOCK_PATH}. A change to xronos, cliopatria or wikidata needs npm run data:build too.`);
} else if (cmd === "pull") {
  const store = defaultStore();
  let fetched = 0;
  const kept: string[] = [];
  for (const source of chosen) {
    const st = status(source, lock);
    if (!st.entry) continue;
    const r = pull(st, store, { force: flag("--force") });
    fetched += r.fetched;
    kept.push(...r.kept);
  }
  console.log(`✓ ${files(fetched)} downloaded`);
  if (kept.length) {
    console.log(`! ${files(kept.length)} here differ from the lock and were left alone (newer data not pushed yet? --force replaces them):`);
    for (const k of kept) console.log(`    ${k}`);
  }
} else {
  console.error(`✗ unknown command ${cmd} (status, push, pull)`);
  process.exit(1);
}
