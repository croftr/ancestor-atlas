// The outlets the news feed reads (docs/news-feed.md). Only these: an allow-list keeps out pseudo-archaeology sites.
// Each was checked to answer with RSS or Atom on 24 Oct 2026. Feeds mixing in other subjects (dinosaurs, modern
// anthropology) are fine: the classifier drops what is out of scope.

export interface Feed { id: string; source: string; url: string }

export const FEEDS: Feed[] = [
  { id: "sd-early-humans", source: "ScienceDaily", url: "https://www.sciencedaily.com/rss/fossils_ruins/early_humans.xml" },
  { id: "sd-archaeology", source: "ScienceDaily", url: "https://www.sciencedaily.com/rss/fossils_ruins/archaeology.xml" },
  { id: "sd-civilizations", source: "ScienceDaily", url: "https://www.sciencedaily.com/rss/fossils_ruins/ancient_civilizations.xml" },
  { id: "physorg", source: "Phys.org", url: "https://phys.org/rss-feed/science-news/archaeology-fossils/" },
  { id: "ls-archaeology", source: "Live Science", url: "https://www.livescience.com/feeds/tag/archaeology" },
  { id: "ls-evolution", source: "Live Science", url: "https://www.livescience.com/feeds/tag/human-evolution" },
  { id: "nature-archaeology", source: "Nature", url: "https://www.nature.com/subjects/archaeology.rss" },
  { id: "nature-anthropology", source: "Nature", url: "https://www.nature.com/subjects/anthropology.rss" },
  { id: "conv-archaeology", source: "The Conversation", url: "https://theconversation.com/topics/archaeology-12/articles.atom" },
  { id: "conv-evolution", source: "The Conversation", url: "https://theconversation.com/topics/human-evolution-2386/articles.atom" },
  { id: "sapiens", source: "SAPIENS", url: "https://www.sapiens.org/feed/" },
  { id: "archaeology-mag", source: "Archaeology Magazine", url: "https://archaeology.org/feed/" },
  { id: "hawks", source: "John Hawks", url: "https://johnhawks.net/feed/" },
  { id: "newscientist", source: "New Scientist", url: "https://www.newscientist.com/subject/humans/feed/" },
  { id: "smithsonian", source: "Smithsonian", url: "https://www.smithsonianmag.com/rss/science-nature/" },
];
