// Turning Claude's verdicts into stories and folding them into the feed (docs/news-feed.md). Pure, so it is tested.
import type { NewsFeed, NewsStory, NewsTopic } from "../../src/news/types.ts";
import type { Verdict } from "./classify.ts";
import { idOf, type FeedItem } from "./parse.ts";

/** Stories kept in the feed, newest first; older ones drop off. */
export const MAX_STORIES = 1000;
const MAX_SUMMARY_WORDS = 60;

export type Outcome = { story: NewsStory } | { left: string };

/** The story for a kept item, or why it is left out. Checks what the model was asked, as it can slip. */
export function storyFrom(item: FeedItem, v: Verdict, entityIds: Set<string>): Outcome {
  if (!v.keep) return { left: v.reason || "out of scope" };
  const summary = v.summary.trim();
  if (!summary) return { left: "no summary" };
  if (summary.split(/\s+/).length > MAX_SUMMARY_WORDS) return { left: "summary too long" };
  if (v.period_from > 0) return { left: `about ${v.period_text || "1 CE or later"}, after the atlas ends` };
  if (v.period_to < v.period_from) return { left: "period runs backwards" };
  const entities = [...new Set(v.entities)].filter((id) => entityIds.has(id)).slice(0, 4);
  const story: NewsStory = {
    id: idOf(item.url),
    title: item.title,
    url: item.url,
    source: item.source,
    published: item.published,
    summary,
    topic: v.topic as NewsTopic,
    period: { from: v.period_from, to: Math.min(v.period_to, 1), text: v.period_text.trim() },
    entities,
  };
  if (v.place.trim()) story.place = v.place.trim();
  if (item.doi) story.doi = item.doi;
  return { story };
}

/** The earlier report a story repeats: the same DOI, or what the model named in `same_as`. */
export function sameAs(story: NewsStory, sameAsId: string | undefined, stories: NewsStory[]): NewsStory | undefined {
  if (story.doi) {
    const byDoi = stories.find((s) => s.doi === story.doi);
    if (byDoi) return byDoi;
  }
  return sameAsId ? stories.find((s) => s.id === sameAsId) : undefined;
}

/** Records a second report of a finding on the first one (its DOI and entities too, when the first lacked them). */
export function addCoverage(first: NewsStory, other: NewsStory) {
  if (first.url === other.url || first.also?.some((c) => c.url === other.url)) return;
  (first.also ??= []).push({ source: other.source, url: other.url, title: other.title, published: other.published });
  first.doi ??= other.doi;
  first.place ??= other.place;
  for (const id of other.entities) if (first.entities.length < 4 && !first.entities.includes(id)) first.entities.push(id);
}

/** Every URL the feed already shows (first reports and coverage), as ids. */
export const knownIds = (feed: NewsFeed) =>
  new Set(feed.stories.flatMap((s) => [s.id, ...(s.also ?? []).map((c) => idOf(c.url))]));

/** Newest first, capped. */
export const finish = (stories: NewsStory[]) =>
  [...stories].sort((a, b) => b.published.localeCompare(a.published) || a.id.localeCompare(b.id)).slice(0, MAX_STORIES);
