// Reads the numeric table of a NOAA NCEI paleo text file in data/raw/paleo (scripts/paleo.ts, scripts/climate.ts).
import { readFileSync } from "node:fs";

/** The rows after the header line matching `header`, keeping columns `cols`, up to the first non-numeric row. */
export function table(file: string, header: RegExp, cols: number[]): number[][] {
  const lines = readFileSync(`data/raw/paleo/${file}`, "utf8").split("\n");
  const start = lines.findIndex((l) => header.test(l));
  if (start < 0) throw new Error(`${file}: no header ${header}`);
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
