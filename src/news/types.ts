// The news feed (docs/news-feed.md), written by `npm run news:update` (scripts/news/update.ts) to the media bucket as
// news/feed.json and shown at #/news. Shared with the scripts.

/** What a story is mainly about; one per story. */
export type NewsTopic = "hominins" | "dna" | "cultures" | "civilizations" | "methods";

export const NEWS_TOPICS: NewsTopic[] = ["hominins", "dna", "cultures", "civilizations", "methods"];

/** Another outlet's report of the same finding. */
export interface NewsCoverage { source: string; url: string; title: string; published: string }

export interface NewsStory {
  /** Short hash of the first report's URL. */
  id: string;
  /** Headline as the outlet published it. */
  title: string;
  url: string;
  /** The outlet ("ScienceDaily", "Nature"…). */
  source: string;
  /** When the outlet published it (ISO date-time). */
  published: string;
  /** One or two sentences in our own words, written by Claude from the feed item. */
  summary: string;
  topic: NewsTopic;
  /** The time the story is about, astronomical years (1 BCE = 0); always starts before 1 CE. */
  period: { from: number; to: number; text: string };
  /** Where, in words ("Jebel Irhoud, Morocco"), when the story names a place. */
  place?: string;
  /** Atlas entity ids the story concerns (species, cultures, civilizations, events). */
  entities: string[];
  /** The research paper, when the feed item gives its DOI. */
  doi?: string;
  /** The same finding reported elsewhere. */
  also?: NewsCoverage[];
}

export interface NewsFeed {
  /** When `news:update` last ran (ISO). */
  updated: string;
  /** Newest first. */
  stories: NewsStory[];
}
