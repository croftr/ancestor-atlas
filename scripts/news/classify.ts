// Asks Claude which feed items belong in the news feed, and to describe the ones that do (docs/news-feed.md).
// One request per batch of items. The instructions and the atlas's entity list come first and are cached, so
// later batches in a run pay little for them.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { NEWS_TOPICS } from "../../src/news/types.ts";
import type { FeedItem } from "./parse.ts";

export const MODEL = process.env.NEWS_MODEL || "claude-opus-5-5";

export interface AtlasEntity { id: string; name: string; category: string; start_year: number; end_year: number }
/** A story already in the feed, offered so a new report of the same finding can be joined to it. */
export interface KnownStory { id: string; title: string; summary: string }

const Verdict = z.object({
  index: z.number().int(),
  keep: z.boolean(),
  /** Why it was left out, or any doubt about it. */
  reason: z.string(),
  topic: z.enum(NEWS_TOPICS as [string, ...string[]]),
  summary: z.string(),
  period_from: z.number().int(),
  period_to: z.number().int(),
  period_text: z.string(),
  place: z.string(),
  entities: z.array(z.string()),
  /** Index of an earlier item in this batch, or the id of a known story, reporting the same finding; else "". */
  same_as: z.string(),
});
export type Verdict = z.infer<typeof Verdict>;
const Answer = z.object({ items: z.array(Verdict) });

const span = (y: number) => (y <= 0 ? `${(1 - y).toLocaleString("en-US")} BCE` : `${y} CE`);

/** The fixed part of the prompt: rules, then every atlas entity (stable order, so it caches). */
export function systemPrompt(entities: AtlasEntity[]): string {
  const lines = [...entities]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((e) => `${e.id} | ${e.name} | ${e.category} | ${span(e.start_year)} to ${span(e.end_year)}`);
  return `You choose stories for the news page of Ancestor Atlas, an interactive globe of human evolution and the ancient
world up to 1 CE (hominin species, archaeological cultures, early civilizations, major events). Each item is a headline
and teaser from a science news feed. Decide for each one whether it belongs, and describe the ones that do.

Keep an item (keep: true) only when all of these hold:
- It reports new research, a new find or a new analysis (a paper, an excavation, a dating study), or explains recent
  research in depth. Not opinion columns, book reviews, travel pieces, listicles, quizzes, podcasts or event notices.
- Its subject is human evolution and our extinct relatives, ancient DNA of past people, or human cultures and
  civilizations, and the period it is about began before 1 CE. Leave out dinosaurs and other non-human palaeontology,
  stories wholly about 1 CE or later (Roman Empire after 1 CE, medieval, Maya Classic period, colonial), modern
  anthropology, and living people unless the story is about ancient ancestry.
- You are sure of the period it is about. When unsure about anything, leave it out: the atlas would rather miss a story
  than show a wrong one. Pseudo-archaeology, "lost civilization" or alien claims are always left out.

For kept items:
- topic: hominins (fossils, species, early human behaviour), dna (ancient genomes, proteins), cultures (prehistoric
  toolmakers, farmers, herders, rock art), civilizations (states, cities, writing, empires), methods (dating, new
  techniques, climate and environment of the human past). Pick the one it is mainly about.
- summary: one or two plain sentences, at most 45 words, in your own words (never copy the teaser), British spelling.
  Say what was found and why it matters. No hype ("rewrites history", "stunning"), and keep the hedges the research has.
- period_from, period_to: the time the story is about, as astronomical years (1 BCE = 0, 300,000 years ago = -298050,
  i.e. 1950 minus the years ago). period_from must be 0 or less. period_text: the period in words ("about 300,000 years
  ago", "2600–2500 BCE").
- place: the site and country ("Jebel Irhoud, Morocco"), or "" when none is named.
- entities: ids from the list below that the story is directly about (a species found, a culture or civilization
  studied, an event it concerns). Only ids from the list, at most four, none when nothing fits closely.
- same_as: when the item reports the same finding as an earlier item in this batch (give its index as a string) or as a
  known story listed with the items (give that story's id). Otherwise "".
For items left out, give reason and fill the other fields with empty values (topic: "methods", numbers 0).

Atlas entities (id | name | category | span):
${lines.join("\n")}`;
}

function userPrompt(items: FeedItem[], known: KnownStory[]): string {
  const k = known.length
    ? `Known stories (for same_as):\n${known.map((s) => `${s.id}: ${s.title} | ${s.summary}`).join("\n")}\n\n`
    : "";
  const body = items
    .map((it, i) => `[${i}] ${it.source}, ${it.published.slice(0, 10)}\nTitle: ${it.title}\nTeaser: ${it.text || "(none)"}`)
    .join("\n\n");
  return `${k}Items:\n\n${body}\n\nAnswer with one entry per item, in order, with its index.`;
}

/** Verdicts for one batch, one per item (an item the answer skipped is left out, as unsure). */
export async function classify(client: Anthropic, system: string, items: FeedItem[], known: KnownStory[]): Promise<Verdict[]> {
  // `fallbacks: "default"`: should a safety check decline the batch, the API retries it on another model itself.
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userPrompt(items, known) }],
    output_config: { effort: "low", format: betaZodOutputFormat(Answer) },
  });
  if (response.stop_reason === "refusal") throw new Error("the model declined this batch");
  if (response.stop_reason === "max_tokens") throw new Error("the answer was cut off (max_tokens)");
  const answer = response.parsed_output;
  if (!answer) throw new Error("the answer could not be read");
  return answer.items.filter((v) => v.index >= 0 && v.index < items.length);
}
