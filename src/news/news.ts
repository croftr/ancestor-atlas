import { useEffect, useState } from "react";
import { mediaUrl } from "../config";
import type { NewsFeed, NewsStory, NewsTopic } from "./types";

/** How each topic is named on the page. */
export const TOPIC_LABELS: Record<NewsTopic, string> = {
  hominins: "Human evolution",
  dna: "Ancient DNA",
  cultures: "Prehistoric cultures",
  civilizations: "Civilizations",
  methods: "Dating & methods",
};

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Whether a story matches a search: headline, summary, period, place and outlets. */
export function matches(s: NewsStory, query: string, entityName: (id: string) => string): boolean {
  const q = fold(query.trim());
  if (!q) return true;
  const hay = [s.title, s.summary, s.period.text, s.place ?? "", s.source, ...(s.also ?? []).map((c) => c.source), ...s.entities.map(entityName)].join(" ");
  return fold(hay).includes(q);
}

export interface NewsSection { label: string; stories: NewsStory[] }

/** Stories under "This week", "Last week", then one heading per month ("September 2026"), newest first. */
export function sectionsOf(stories: NewsStory[], now = new Date()): NewsSection[] {
  const day = 86_400_000;
  const sections: NewsSection[] = [];
  const add = (label: string, s: NewsStory) => {
    const last = sections[sections.length - 1];
    if (last?.label === label) last.stories.push(s);
    else sections.push({ label, stories: [s] });
  };
  for (const s of [...stories].sort((a, b) => b.published.localeCompare(a.published))) {
    const age = (now.getTime() - new Date(s.published).getTime()) / day;
    if (age < 7) add("This week", s);
    else if (age < 14) add("Last week", s);
    else add(new Date(s.published).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }), s);
  }
  return sections;
}

/** "23 Oct" this year, "23 Oct 2025" before. */
export function shortDay(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const sameYear = d.getUTCFullYear() === now.getUTCFullYear();
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }), timeZone: "UTC" });
}

// Loaded once a visit. The feed lives in the media bucket (news:update uploads it), so it changes without a deploy.
// The dev server first tries public/news/feed.json, which `news:update -- --no-upload` writes.
let feedPromise: Promise<NewsFeed | null> | null = null;

const read = (url: string) =>
  fetch(url, { cache: "no-cache" })
    .then((r) => (r.ok ? (r.json() as Promise<NewsFeed>) : null))
    .then((f) => (f && Array.isArray(f.stories) ? f : null))
    .catch(() => null);

/** The feed; an empty one when none is published yet, null when it could not be read. */
export const loadFeed = () =>
  (feedPromise ??= (async () => {
    if (import.meta.env.DEV) {
      const local = await read("/news/feed.json");
      if (local) return local;
    }
    const r = await fetch(mediaUrl("news/feed.json"), { cache: "no-cache" }).catch(() => null);
    // S3 answers 403 for a key that does not exist yet.
    if (r && (r.status === 404 || r.status === 403)) return { updated: "", stories: [] };
    if (!r?.ok) return null;
    return (r.json() as Promise<NewsFeed>).catch(() => null);
  })());

/** undefined while loading, null if it failed. */
export function useFeed(): NewsFeed | null | undefined {
  const [feed, setFeed] = useState<NewsFeed | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    loadFeed().then((f) => live && setFeed(f));
    return () => {
      live = false;
    };
  }, []);
  return feed;
}
