import { readFileSync, existsSync } from "node:fs";
import { parse as parseYaml } from "yaml";

interface PictureGroup {
  id: string;
  label: string;
  image_url: string;
  image_credit: string;
  members: string[];
}

const pgs = parseYaml(readFileSync("data/curated/picture-groups.yaml", "utf8")) as PictureGroup[];
const yamlRaw = readFileSync("data/curated/picture-groups.yaml", "utf8");

console.log("=== Ancestor Atlas: Civilization Illustration Status ===\n");

const placeholders: { id: string; label: string; file: string; members: number }[] = [];
const bespoke: { id: string; label: string; file: string; members: number }[] = [];

for (const pg of pgs) {
  // Check if tagged as placeholder in yaml or filename
  const isPlaceholder =
    yamlRaw.includes(`[PLACEHOLDER`) &&
    yamlRaw.split(pg.id)[0].slice(-200).includes("PLACEHOLDER");

  const item = {
    id: pg.id,
    label: pg.label,
    file: pg.image_url,
    members: pg.members?.length ?? 0,
  };

  if (isPlaceholder) {
    placeholders.push(item);
  } else {
    bespoke.push(item);
  }
}

if (placeholders.length > 0) {
  console.log(`[!] PENDING BESPOKE ILLUSTRATIONS (${placeholders.length} picture-groups using placeholders):`);
  console.log("--------------------------------------------------------------------------------");
  for (const p of placeholders) {
    const file600 = p.file.replace(/\.webp$/, "-600.webp");
    console.log(`• Group: ${p.id}`);
    console.log(`  Label:    ${p.label}`);
    console.log(`  Files:    public${p.file} (1200x900) & public${file600} (600x450)`);
    console.log(`  Members:  ${p.members} polities`);
    console.log("");
  }
  console.log("-> Ready-to-copy generation prompts are documented in docs/civilization-placeholders.md\n");
} else {
  console.log("All civilization picture-groups have bespoke illustrations!\n");
}

console.log(`Bespoke picture groups active: ${bespoke.length}`);
console.log("Run `npm run build` to verify data freshness and picture integration.");
