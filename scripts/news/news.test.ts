import { describe, expect, it } from "vitest";
import { canonicalUrl, findDoi, idOf, parseFeed } from "./parse.ts";
import { addCoverage, finish, knownIds, sameAs, storyFrom } from "./merge.ts";
import type { Verdict } from "./classify.ts";
import { sectionsOf } from "../../src/news/news.ts";
import type { NewsStory } from "../../src/news/types.ts";

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>x</title>
<item><title>Neanderthal &amp; hand bones</title><link>https://example.org/a?utm_source=rss</link>
<pubDate>Thu, 22 Oct 2026 12:00:00 +0000</pubDate><description>&lt;p&gt;Dated to &lt;b&gt;46,000&lt;/b&gt; years ago. doi:10.1234/ABC.5.&lt;/p&gt;</description></item>
<item><title>No date</title><link>https://example.org/b</link></item>
</channel></rss>`;
const ATOM = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>y</title>
<entry><title type="html">Ochre and eland</title><link rel="alternate" href="https://example.org/c"/>
<published>2026-10-21T10:00:00Z</published><summary>Collagen on ochre.</summary></entry></feed>`;

describe("parseFeed", () => {
  it("reads RSS items, dropping tracking parameters and items without a date", () => {
    const items = parseFeed(RSS, "Test");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ title: "Neanderthal & hand bones", url: "https://example.org/a", source: "Test", published: "2026-10-22T12:00:00.000Z", doi: "10.1234/abc.5" });
    expect(items[0].text).toBe("Dated to 46,000 years ago. doi:10.1234/ABC.5.");
  });
  it("reads Atom entries", () => {
    expect(parseFeed(ATOM, "Atom")).toEqual([{ title: "Ochre and eland", url: "https://example.org/c", source: "Atom", published: "2026-10-21T10:00:00.000Z", text: "Collagen on ochre.", doi: undefined }]);
  });
});

describe("helpers", () => {
  it("derives a Nature article's DOI from its URL", () => {
    expect(findDoi("https://www.nature.com/articles/s41586-026-11132-z")).toBe("10.1038/s41586-026-11132-z");
    expect(findDoi("https://www.nature.com/articles/d41586-026-03360-0")).toBeUndefined(); // news, not a paper
  });
  it("gives one id to one article whatever its tracking tail", () => {
    expect(idOf("https://x.org/a?utm_medium=rss#top")).toBe(idOf("https://x.org/a"));
    expect(canonicalUrl("https://x.org/a?id=3&utm_source=z")).toBe("https://x.org/a?id=3");
  });
});

const item = { title: "T", url: "https://x.org/1", source: "S", published: "2026-10-20T00:00:00.000Z", text: "" };
const verdict = (v: Partial<Verdict> = {}): Verdict => ({
  index: 0, keep: true, reason: "", topic: "hominins", summary: "Hand bones were found.", period_from: -44050, period_to: -44050,
  period_text: "about 46,000 years ago", place: "Abauntz Cave, Spain", entities: ["neanderthal", "made-up"], same_as: "", ...v,
});
const ids = new Set(["neanderthal", "denisovan"]);

describe("storyFrom", () => {
  it("keeps a sound verdict, with only known entities", () => {
    const o = storyFrom(item, verdict(), ids);
    expect("story" in o && o.story).toMatchObject({ id: idOf(item.url), entities: ["neanderthal"], place: "Abauntz Cave, Spain", topic: "hominins" });
  });
  it("leaves out what the model dropped, stories after 1 CE and long summaries", () => {
    expect(storyFrom(item, verdict({ keep: false, reason: "dinosaurs" }), ids)).toEqual({ left: "dinosaurs" });
    expect("left" in storyFrom(item, verdict({ period_from: 79, period_to: 79 }), ids)).toBe(true);
    expect("left" in storyFrom(item, verdict({ summary: "word ".repeat(61) }), ids)).toBe(true);
    expect("left" in storyFrom(item, verdict({ period_from: -100, period_to: -200 }), ids)).toBe(true);
  });
  it("keeps a story that starts before 1 CE and runs past it, clipped at 1 CE", () => {
    const o = storyFrom(item, verdict({ period_from: -500, period_to: 300 }), ids);
    expect("story" in o && o.story.period.to).toBe(1);
  });
});

const story = (id: string, published: string, extra: Partial<NewsStory> = {}): NewsStory => ({
  id, title: id, url: `https://x.org/${id}`, source: "S", published, summary: "s", topic: "dna", period: { from: -1000, to: -1000, text: "" }, entities: [], ...extra,
});

describe("merging", () => {
  it("joins a report of the same paper by DOI, else by the model's same_as", () => {
    const a = story("a", "2026-10-01", { doi: "10.1/x" });
    const b = story("b", "2026-10-02");
    expect(sameAs(story("c", "2026-10-03", { doi: "10.1/x" }), undefined, [a, b])).toBe(a);
    expect(sameAs(story("c", "2026-10-03"), "b", [a, b])).toBe(b);
    expect(sameAs(story("c", "2026-10-03"), undefined, [a, b])).toBeUndefined();
  });
  it("records coverage once, filling gaps from it", () => {
    const a = story("a", "2026-10-01");
    const c = story("c", "2026-10-03", { doi: "10.1/y", entities: ["denisovan"], source: "Nature" });
    addCoverage(a, c);
    addCoverage(a, c);
    expect(a.also).toHaveLength(1);
    expect(a).toMatchObject({ doi: "10.1/y", entities: ["denisovan"] });
    expect(knownIds({ updated: "", stories: [a] })).toEqual(new Set(["a", idOf(c.url)]));
  });
  it("sorts newest first", () => {
    expect(finish([story("a", "2026-10-01"), story("b", "2026-10-05")]).map((s) => s.id)).toEqual(["b", "a"]);
  });
});

describe("sectionsOf", () => {
  it("groups by this week, last week, then month", () => {
    const now = new Date("2026-10-24T12:00:00Z");
    const s = sectionsOf([story("a", "2026-10-23T00:00:00Z"), story("b", "2026-10-15T00:00:00Z"), story("c", "2026-09-02T00:00:00Z")], now);
    expect(s.map((x) => [x.label, x.stories.map((y) => y.id)])).toEqual([["This week", ["a"]], ["Last week", ["b"]], ["September 2026", ["c"]]]);
  });
});
