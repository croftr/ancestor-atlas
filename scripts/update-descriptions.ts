import { readFileSync, writeFileSync } from "node:fs";

/**
 * Updates or inserts `description: ...` for entities in `data/curated/entities.yaml`.
 * Preserves comments, formatting, and other properties.
 */
export function applyDescriptions(descriptions: Record<string, string>, filePath = "data/curated/entities.yaml"): { updated: number; added: number } {
  const content = readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  const result: string[] = [];
  let updated = 0;
  let added = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^- id:\s+([a-zA-Z0-9_-]+)\s*$/);

    if (match) {
      const id = match[1];
      result.push(line);

      if (descriptions[id]) {
        const descText = descriptions[id].trim().replace(/\s+/g, " ");

        // Check if the following line is already a description
        if (i + 1 < lines.length && lines[i + 1].match(/^\s+description:/)) {
          // Check if it's a multiline description (>-, |, etc.) or single line
          const nextLine = lines[i + 1];
          if (nextLine.match(/^\s+description:\s*[>|]/)) {
            // Skip the multiline block
            i++;
            while (i + 1 < lines.length && (lines[i + 1].startsWith("    ") || lines[i + 1].trim() === "")) {
              i++;
            }
          } else {
            i++; // skip single line description
          }
          result.push(`  description: ${descText}`);
          updated++;
        } else {
          result.push(`  description: ${descText}`);
          added++;
        }
      }
    } else {
      result.push(line);
    }
  }

  writeFileSync(filePath, result.join("\n"));
  return { updated, added };
}

if (process.argv[1]?.endsWith("update-descriptions.ts")) {
  const mapPath = process.argv[2];
  if (!mapPath) {
    console.error("Usage: tsx scripts/update-descriptions.ts <descriptions-map.json>");
    process.exit(1);
  }
  const map = JSON.parse(readFileSync(mapPath, "utf8"));
  const stats = applyDescriptions(map);
  console.log(`Updated ${stats.updated}, added ${stats.added} descriptions.`);
}
