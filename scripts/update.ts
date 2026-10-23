// Semi-automated data update (docs/data-updates.md).
//   npm run data:update -- --check [--offline]
// Step 2: checks every source against the latest upstream, the pinned Wikipedia revisions and Wikidata coordinates,
// and lists what is not mapped yet. Writes data/build/update-report.md (read this) and update-check.json (the
// next check marks what is new against it). Read-only; never contacts XRONOS (npm run data:fetch:xronos does, by hand).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { markNew, runCheck, type CheckResult } from "./update/check.ts";
import { renderReport, summary } from "./update/report.ts";

const REPORT = "data/build/update-report.md";
const JSON_OUT = "data/build/update-check.json";
const args = process.argv.slice(2);

if (!args.includes("--check")) {
  console.error("Only `npm run data:update -- --check` exists so far (fetching, rebuilding and publishing come in step 3).");
  process.exit(1);
}

const previous = existsSync(JSON_OUT) ? (JSON.parse(readFileSync(JSON_OUT, "utf8")) as CheckResult) : undefined;
const result = await runCheck({ offline: args.includes("--offline"), log: (s) => console.log(`… ${s}`) });
markNew(result, previous);
mkdirSync("data/build", { recursive: true });
writeFileSync(REPORT, renderReport(result));
writeFileSync(JSON_OUT, JSON.stringify(result, null, 2) + "\n");
console.log(summary(result).join("\n"));
console.log(`Report: ${REPORT}`);
