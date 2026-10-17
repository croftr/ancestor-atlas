/**
 * The hominin family tree on the Species page. No single study places all 26 species (cladistic
 * analyses leave out the poorly known ones, and Denisovans are known mostly from DNA), so the tree is
 * put together branching point by branching point, each with the studies it rests on and how firmly:
 *
 * - "supported": most analyses agree (or genomes show it);
 * - "debated": a common reading that serious work disputes;
 * - "unresolved": the members belong here, but how they relate to each other is not known (drawn as a
 *   polytomy, every member branching from the same point).
 *
 * Kept in the app, not the data pipeline (like the tours). Citations written from recall (Oct 2026):
 * check them against the papers before treating the tree as sourced.
 */

export type Support = "supported" | "debated" | "unresolved";

export interface Clade {
  id: string;
  label: string;
  support: Support;
  /** A few plain words on what joins the members, and what is argued. */
  note: string;
  /** Keys into REFS. */
  refs: string[];
  /** Species ids (leaves) or clades. */
  children: (string | Clade)[];
}

export const REFS: Record<string, string> = {
  brunet2002: "Brunet, M. et al. 2002. A new hominid from the Upper Miocene of Chad, Central Africa. Nature 418, 145–151.",
  senut2001: "Senut, B. et al. 2001. First hominid from the Miocene (Lukeino Formation, Kenya). Comptes Rendus de l'Académie des Sciences 332, 137–144.",
  haileselassie2004: "Haile-Selassie, Y., Suwa, G. & White, T. D. 2004. Late Miocene teeth from Middle Awash, Ethiopia, and early hominid dental evolution. Science 303, 1503–1505.",
  white2009: "White, T. D. et al. 2009. Ardipithecus ramidus and the paleobiology of early hominids. Science 326, 75–86.",
  mongle2019: "Mongle, C. S., Strait, D. S. & Grine, F. E. 2019. Expanded character sampling underscores phylogenetic stability of Ardipithecus ramidus as a basal hominin. Journal of Human Evolution 131, 28–39.",
  mongle2023: "Mongle, C. S., Strait, D. S. & Grine, F. E. 2023. An updated analysis of hominin phylogeny with an emphasis on re-evaluating the phylogenetic relationships of Australopithecus sediba. Journal of Human Evolution 175, 103311.",
  kimbel2006: "Kimbel, W. H. et al. 2006. Was Australopithecus anamensis ancestral to A. afarensis? A case of anagenesis in the hominin fossil record. Journal of Human Evolution 51, 134–152.",
  haileselassie2019: "Haile-Selassie, Y. et al. 2019. A 3.8-million-year-old hominin cranium from Woranso-Mille, Ethiopia. Nature 573, 214–219.",
  brunet1995: "Brunet, M. et al. 1995. The first australopithecine 2,500 kilometres west of the Rift Valley (Chad). Nature 378, 273–275.",
  haileselassie2015: "Haile-Selassie, Y. et al. 2015. New species from Ethiopia further expands Middle Pliocene hominin diversity. Nature 521, 483–488.",
  leakey2001: "Leakey, M. G. et al. 2001. New hominin genus from eastern Africa shows diverse middle Pliocene lineages. Nature 410, 433–440.",
  strait2004: "Strait, D. S. & Grine, F. E. 2004. Inferring hominoid and early hominid phylogeny using craniodental characters: the role of fossil taxa. Journal of Human Evolution 47, 399–452.",
  asfaw1999: "Asfaw, B. et al. 1999. Australopithecus garhi: a new species of early hominid from Ethiopia. Science 284, 629–635.",
  berger2010: "Berger, L. R. et al. 2010. Australopithecus sediba: a new species of Homo-like australopith from South Africa. Science 328, 195–204.",
  wood1999: "Wood, B. & Collard, M. 1999. The human genus. Science 284, 65–71.",
  dembo2016: "Dembo, M. et al. 2016. The evolutionary relationships and age of Homo naledi: an assessment using dated Bayesian phylogenetic methods. Journal of Human Evolution 97, 17–26.",
  argue2017: "Argue, D. et al. 2017. The affinities of Homo floresiensis based on phylogenetic analyses of cranial, dental, and postcranial characters. Journal of Human Evolution 107, 107–133.",
  detroit2019: "Détroit, F. et al. 2019. A new species of Homo from the Late Pleistocene of the Philippines. Nature 568, 181–186.",
  welker2020: "Welker, F. et al. 2020. The dental proteome of Homo antecessor. Nature 580, 235–238.",
  stringer2012: "Stringer, C. 2012. The status of Homo heidelbergensis (Schoetensack 1908). Evolutionary Anthropology 21, 101–107.",
  prufer2014: "Prüfer, K. et al. 2014. The complete genome sequence of a Neanderthal from the Altai Mountains. Nature 505, 43–49.",
  meyer2016: "Meyer, M. et al. 2016. Nuclear DNA sequences from the Middle Pleistocene Sima de los Huesos hominins. Nature 531, 504–507.",
  reich2010: "Reich, D. et al. 2010. Genetic history of an archaic hominin group from Denisova Cave in Siberia. Nature 468, 1053–1060.",
};

const clade = (id: string, label: string, support: Support, note: string, refs: string[], children: (string | Clade)[]): Clade => ({
  id,
  label,
  support,
  note,
  refs,
  children,
});

const neanderthalsAndDenisovans = clade(
  "neanderthals-denisovans",
  "Neanderthals and Denisovans",
  "supported",
  "Their genomes show Neanderthals and Denisovans are each other's closest relatives, splitting apart some time after their shared line left ours.",
  ["reich2010", "prufer2014", "meyer2016"],
  ["neanderthal", "denisovan"],
);

const usAndClosest = clade(
  "sapiens-and-archaics",
  "Us and our closest relatives",
  "supported",
  "Ancient genomes put the split between our ancestors and those of Neanderthals and Denisovans at about 550,000–765,000 years ago. The lines later met again: most people today carry some Neanderthal DNA, and some carry Denisovan DNA.",
  ["prufer2014", "meyer2016"],
  ["homo-sapiens", neanderthalsAndDenisovans],
);

const laterHomo = clade(
  "heidelbergensis-and-later",
  "H. heidelbergensis and later humans",
  "debated",
  "H. heidelbergensis is often drawn as the last shared ancestor of us and the Neanderthals. Others think its fossils mix several groups, some already on the Neanderthal line, and give the African ones other names.",
  ["stringer2012"],
  ["homo-heidelbergensis", usAndClosest],
);

const antecessorAndLater = clade(
  "antecessor-and-later",
  "H. antecessor and later humans",
  "supported",
  "Proteins from an 800,000-year-old tooth enamel from Atapuerca show H. antecessor as a close relative of the line that led to us, Neanderthals and Denisovans, branching off just before it.",
  ["welker2020"],
  ["homo-antecessor", laterHomo],
);

const erectusAndLater = clade(
  "erectus-and-later",
  "H. erectus and later humans",
  "supported",
  "Later humans are usually traced back through H. erectus (here including the African H. ergaster), the first human with a body like ours and the first to leave Africa.",
  ["wood1999", "dembo2016"],
  ["homo-erectus", antecessorAndLater],
);

const homo = clade(
  "homo",
  "The human genus, Homo",
  "unresolved",
  "These belong in Homo, but where the early and the small-brained late species fit is open. H. habilis and H. rudolfensis may be one line or two. H. naledi's place could not be pinned down. H. floresiensis may descend from early Homo or from a dwarfed H. erectus, and H. luzonensis' ancestry is unknown.",
  ["wood1999", "dembo2016", "argue2017", "detroit2019"],
  ["homo-habilis", "homo-rudolfensis", "homo-naledi", "homo-floresiensis", "homo-luzonensis", erectusAndLater],
);

const robustPair = clade(
  "boisei-robustus",
  "P. boisei and P. robustus",
  "debated",
  "The two later robust species, one in East Africa, one in South Africa, are usually grouped, with P. aethiopicus as their forerunner. Some think South Africa's robust jaws evolved separately.",
  ["strait2004", "mongle2023"],
  ["paranthropus-boisei", "paranthropus-robustus"],
);

const paranthropus = clade(
  "paranthropus",
  "Paranthropus, the robust australopiths",
  "supported",
  "Big jaws and teeth for tough food. Most cladistic analyses find the three robust species form one branch, though their shared features could have arisen more than once.",
  ["strait2004", "mongle2023"],
  ["paranthropus-aethiopicus", robustPair],
);

const homoAndParanthropus = clade(
  "homo-paranthropus",
  "Homo, Paranthropus and their relatives",
  "unresolved",
  "Homo and Paranthropus come out as close relatives, but A. sediba falls at that same branching point in the latest analysis, and A. garhi, once proposed as the first human's ancestor, is too poorly known to place.",
  ["asfaw1999", "berger2010", "mongle2023"],
  ["australopithecus-garhi", "australopithecus-sediba", paranthropus, homo],
);

const laterAustralopiths = clade(
  "africanus-and-later",
  "A. africanus and later hominins",
  "debated",
  "A. africanus usually comes out close to the base of the branch leading to Homo and Paranthropus, but some analyses put it nearer Paranthropus, or nearer A. sediba.",
  ["strait2004", "mongle2023"],
  ["australopithecus-africanus", homoAndParanthropus],
);

const afarensisTime = clade(
  "afarensis-contemporaries",
  "A. afarensis and its contemporaries",
  "unresolved",
  "Around 3.5 million years ago several kinds of hominin lived in East Africa and beyond. A. bahrelghazali, from Chad, may be a western A. afarensis. A. deyiremeda and Kenyanthropus platyops are known from few fossils, and how they relate to A. afarensis and to later hominins is unclear.",
  ["brunet1995", "leakey2001", "haileselassie2015", "mongle2023"],
  ["australopithecus-afarensis", "australopithecus-bahrelghazali", "australopithecus-deyiremeda", "kenyanthropus-platyops"],
);

const afarensisAndLater = clade(
  "afarensis-and-later",
  "A. afarensis and later hominins",
  "supported",
  "A. anamensis is widely seen as A. afarensis' ancestor. A 3.8-million-year-old skull suggests the two overlapped for a time, so A. afarensis may have budded off rather than replacing it.",
  ["kimbel2006", "haileselassie2019"],
  [afarensisTime, laterAustralopiths],
);

const australopiths = clade(
  "australopiths-and-homo",
  "Australopiths and Homo",
  "supported",
  "From A. anamensis on, hominins walked upright much as we do, on the ground, though they still climbed.",
  ["kimbel2006", "mongle2023"],
  ["australopithecus-anamensis", afarensisAndLater],
);

const ramidusAndLater = clade(
  "ramidus-and-later",
  "Ar. ramidus and later hominins",
  "supported",
  "Ardipithecus ramidus stays at the base of the hominin tree, below the australopiths, however its characters are sampled.",
  ["white2009", "mongle2019"],
  ["ardipithecus-ramidus", australopiths],
);

const ardipithecus = clade(
  "ardipithecus-and-later",
  "Ardipithecus and later hominins",
  "debated",
  "Ar. kadabba, known mostly from teeth, is usually taken as an earlier Ardipithecus, perhaps Ar. ramidus' ancestor.",
  ["haileselassie2004", "white2009"],
  ["ardipithecus-kadabba", ramidusAndLater],
);

/** The whole tree. */
export const PHYLOGENY: Clade = clade(
  "hominins",
  "Hominins",
  "unresolved",
  "The hominins are our side of the split from the chimpanzees' line, some 7 to 6 million years ago. Sahelanthropus and Orrorin are each put forward as the earliest, but they are known from few fossils, and how they relate to each other and to later hominins, or whether they belong on our side at all, is argued.",
  ["brunet2002", "senut2001", "white2009"],
  ["sahelanthropus", "orrorin-tugenensis", ardipithecus],
);

/** Every clade, the whole tree first. */
export function cladesOf(root: Clade = PHYLOGENY): Clade[] {
  return [root, ...root.children.flatMap((c) => (typeof c === "string" ? [] : cladesOf(c)))];
}

/** Every species id in the tree. */
export function leavesOf(root: Clade = PHYLOGENY): string[] {
  return root.children.flatMap((c) => (typeof c === "string" ? [c] : leavesOf(c)));
}

/** A drawn row (one species) and a drawn branching point. */
export interface TreeRow {
  id: string;
  /** Row index, top first. */
  row: number;
}
export interface TreeNode {
  clade: Clade;
  /** Where the branching point sits: its row (fractional, between its children) and time. */
  row: number;
  year: number;
  /** Nesting depth (0 = whole tree), which also sets how far left of its oldest member it is drawn. */
  depth: number;
  /** Each child's row and whether it is a species (its bar starts there) or a branching point. */
  children: { row: number; leaf: boolean; id: string }[];
}

/**
 * Lay the tree out: species in rows, top to bottom; within a branching point, species first (oldest
 * first), then branches (oldest first), so the main line runs down to the most recent. A branching
 * point sits halfway between its first and last child, at its oldest member's first appearance (the
 * drawing moves it a step left of its leftmost child; the tree gives no split dates).
 */
export function layoutTree(start: (id: string) => number, root: Clade = PHYLOGENY): { rows: TreeRow[]; nodes: TreeNode[] } {
  const rows: TreeRow[] = [];
  const nodes: TreeNode[] = [];
  const oldest = (c: string | Clade): number => (typeof c === "string" ? start(c) : Math.min(...c.children.map(oldest)));
  const visit = (c: Clade, depth: number): { row: number; year: number } => {
    const ordered = [...c.children].sort(
      (a, b) => Number(typeof a !== "string") - Number(typeof b !== "string") || oldest(a) - oldest(b),
    );
    const children = ordered.map((k) => {
      if (typeof k === "string") {
        rows.push({ id: k, row: rows.length });
        return { row: rows.length - 1, leaf: true, id: k };
      }
      return { row: visit(k, depth + 1).row, leaf: false, id: k.id };
    });
    const node: TreeNode = { clade: c, row: (children[0].row + children.at(-1)!.row) / 2, year: oldest(c), depth, children };
    nodes.push(node);
    return node;
  };
  visit(root, 0);
  return { rows, nodes: nodes.reverse() };
}
