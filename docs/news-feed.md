# News feed

A public page (`#/news`) of recent research and finds on human evolution and the world before 1 CE, refreshed by a
command Rob runs. Plan agreed with Rob 24 Oct 2026.

## Decisions (Rob, 24 Oct 2026)

- **Fully automatic**: no approval step. Claude picks and summarises the stories; doubtful items are left out (the
  atlas rule: when unsure, leave it out), and the page says the summaries are machine-written.
- **Rob runs the command** (`npm run news:update`); no schedule yet.
- **A page of its own**, separate from `#/updates`.
- **Only stories about the time before 1 CE** (where the globe ends). A story that starts before 1 CE and runs past
  it is kept, its period clipped at 1 CE.

## How it works

1. `scripts/news/feeds.ts`: the allow-list of outlets (RSS/Atom; each checked 24 Oct 2026): ScienceDaily (3),
   Phys.org, Live Science (2), Nature (2), The Conversation (2), SAPIENS, Archaeology Magazine, John Hawks, New
   Scientist, Smithsonian. An allow-list keeps out pseudo-archaeology sites. Polite: one read per feed per run.
2. `scripts/news/parse.ts`: items (title, link, date, plain-text teaser, DOI from the text or a Nature article URL).
3. New items (last 30 days, not already in the feed or in `data/build/news/seen.json`) go to Claude in batches of 12
   (`scripts/news/classify.ts`, structured output; the rules and the list of every atlas entity form a cached system
   prompt). For each: keep or leave out (with a reason), topic (hominins, dna, cultures, civilizations, methods), a
   summary in its own words (≤ 45 words, British spelling, no hype), the period it is about (astronomical years plus
   words), place in words, up to four atlas entity ids, and whether it reports the same finding as an earlier item.
4. `scripts/news/merge.ts` checks the answer (period starts ≤ 0, summary length, entity ids exist) and joins reports
   of one finding (same DOI, or the model's `same_as`): the first report is the story, later ones its "Also in" links.
5. The feed (`news/feed.json`, newest first, at most 1,000 stories; types in `src/news/types.ts`) is uploaded to the
   media bucket with a 5-minute cache, the one key there that is overwritten on purpose. The page reads it at
   runtime, so news goes live without a deploy or a merge. `data/build/news/report.md` lists what the run kept and
   left out, and why.

Settings in `.env.local`: `ANTHROPIC_API_KEY` (or an `ant auth login` profile); optional `NEWS_MODEL` (default
`claude-opus-5-5` at low effort; `claude-haiku-5-5` is far cheaper if the quality holds). Uploading needs Rob's
AWS login. `--no-upload` writes only `data/build/news/feed.json` and `public/news/feed.json` (gitignored; the dev
server reads it before the bucket); `--dry-run` lists the new items without calling Claude; `--days <n>` widens or
narrows the window.

## The page (`src/news/`)

- Pinned search (headline, summary, period, place, outlet, entity names) and topic chips; the title and counts scroll
  away, like the other browse pages.
- A deep-time strip on the time slider's scale: one mark per story of the last 30 days at the time it is about; a
  tap scrolls to the story.
- Stories under This week / Last week / month headings: the atlas's own picture of the first linked entity (never the
  outlet's photo), topic, outlet and date, the headline linking to the article, the summary, the period and place,
  chips to the linked atlas entries, "The paper" (DOI) and "Also in" other outlets.
- In the rail (News, above Updates); on phones in the drawer only, like Updates.

## Next: into the atlas

- News pins on the globe while the slider is near a story's period (needs coordinates: from the linked site or a
  Wikidata lookup of the place, never the model's guess).
- "In the news" on entity cards and pages (stories whose `entities` name them).
- "Show on the globe / timeline" from a story: jump the slider to its period.
- Possibly a "new" badge on the rail, and a weekly schedule once the output has been trusted for a while.
