/**
 * Interbreeding between human species, drawn on the globe (geneflow/geometry.ts, map/MapView.tsx): hand-picked,
 * like the migration routes, and kept in the app rather than the data pipeline. Each episode is a link from a
 * site of the species the DNA came from to a site of the species that received it, or a single site where a
 * hybrid was found. The genomes say that it happened and roughly when, but rarely where: the sites only stand
 * for the two populations, near where they could have met. Shown while the slider is within the episode's
 * window (geometry.ts, `shownAt`). geneflow.test.ts checks every site is on the globe.
 */

export interface GeneFlow {
  id: string;
  name: string;
  description: string;
  /** How the date reads on the popup. */
  date_text: string;
  /** Astronomical years: the window the episode is shown in. */
  start_year: number;
  end_year: number;
  /** From a site of the donor species to a site of the receiving species, or one site where a hybrid was found. */
  link: { from: string; to: string } | { at: string };
  source: { label: string; url: string };
}

const INTERBREEDING = {
  label: "Wikipedia: Interbreeding between archaic and modern humans (revision 1380498103, 16 Oct 2026)",
  url: "https://en.wikipedia.org/w/index.php?title=Interbreeding_between_archaic_and_modern_humans&oldid=1380498103",
};

const NEANDERTHAL_GENETICS = {
  label: "Wikipedia: Neanderthal genetics (revision 1378845898, 6 Oct 2026)",
  url: "https://en.wikipedia.org/w/index.php?title=Neanderthal_genetics&oldid=1378845898",
};

const DENNY = {
  label: "Wikipedia: Denny (hybrid hominin) (revision 1369637836, 16 Aug 2026)",
  url: "https://en.wikipedia.org/w/index.php?title=Denny_(hybrid_hominin)&oldid=1369637836",
};

/** Years ago (counted back from 1950) as an astronomical year. */
const ka = (k: number) => Math.round(1950 - k * 1000);

export const GENE_FLOWS: GeneFlow[] = [
  {
    id: "superarchaic-denisovan",
    name: "An older human lineage into the Denisovans",
    description:
      "Denisovan genomes carry DNA from a far older lineage, which had split from ours about 2 million years earlier: an \"erectus-like\" population that still lived in Eurasia. It came into the Denisovan line about 350,000 years ago, the most distantly related pair of human groups known to have interbred.",
    date_text: "c. 350,000 years ago",
    start_year: ka(400),
    end_year: ka(300),
    link: { from: "homo-erectus@13", to: "denisovan@3" }, // Hexian, Harbin
    source: INTERBREEDING,
  },
  {
    id: "sapiens-neanderthal-250ka",
    name: "Early modern humans into the Neanderthals",
    description:
      "Long before modern humans left Africa for good, an early wave of them met Neanderthals. About 250,000 years ago they passed on so much DNA that roughly 6% of a later Neanderthal's genome came from them; at some point between 370,000 and 100,000 years ago the Neanderthals' Y chromosome was even replaced by one from modern humans. None of this early mixing survives in people today.",
    date_text: "c. 250,000 years ago",
    start_year: ka(300),
    end_year: ka(200),
    link: { from: "homo-sapiens@3", to: "neanderthal@16" }, // Misliya, Apidima 2
    source: INTERBREEDING,
  },
  {
    id: "sapiens-neanderthal-levant",
    name: "Modern humans and Neanderthals in the Levant",
    description:
      "Between about 120,000 and 100,000 years ago modern humans lived at Qafzeh and Skhul, close to the Neanderthals of Tabun Cave. Neanderthal genomes from Denisova Cave in Siberia carry DNA from modern humans of about this time, from a dispersal out of Africa older than the one that led to people living outside Africa today.",
    date_text: "c. 120,000–100,000 years ago",
    start_year: ka(120),
    end_year: ka(100),
    link: { from: "homo-sapiens@7", to: "neanderthal@3" }, // Qafzeh, Tabun
    source: NEANDERTHAL_GENETICS,
  },
  {
    id: "denny",
    name: "Denny, a Neanderthal–Denisovan child",
    description:
      "A single fragment of long bone from Denisova Cave belonged to a girl of about 13 who died some 90,000 years ago. Her mother was a Neanderthal and her father a Denisovan, who himself had a Neanderthal ancestor hundreds of generations back. She is the only first-generation hybrid of two human species ever found.",
    date_text: "c. 90,000 years ago",
    start_year: ka(95),
    end_year: ka(85),
    link: { at: "denisovan@1" }, // Denisova Cave
    source: DENNY,
  },
  {
    id: "neanderthal-sapiens",
    name: "Neanderthals into modern humans",
    description:
      "As modern humans spread out of Africa, they interbred with Neanderthals, between about 65,000 and 47,000 years ago. Nearly everyone whose ancestors lived outside sub-Saharan Africa carries about 2% Neanderthal DNA from these encounters, including genes linked to fighting viruses.",
    date_text: "c. 65,000–47,000 years ago",
    start_year: ka(65),
    end_year: ka(47),
    link: { from: "neanderthal@4", to: "homo-sapiens@20" }, // Shanidar, Manot
    source: INTERBREEDING,
  },
  {
    id: "denisovan-sapiens",
    name: "Denisovans into the ancestors of Papuans and Australians",
    description:
      "The common ancestors of Aboriginal Australians, New Guineans and Aboriginal Filipinos interbred with Denisovans, probably in Southeast Asia, about 54,000 to 44,000 years ago, before they reached Sahul. Melanesians today carry 4–6% Denisovan DNA. A later, separate meeting left the Ayta Magbukon of the Philippines with the most of anyone living.",
    date_text: "c. 54,000–44,000 years ago",
    start_year: ka(54),
    end_year: ka(44),
    link: { from: "denisovan@5", to: "homo-sapiens@22" }, // Tam Ngu Hao 2, Tabon
    source: INTERBREEDING,
  },
  {
    id: "oase",
    name: "A Neanderthal great-great-grandparent at Oase",
    description:
      "One of the first modern humans in Europe, from Peștera cu Oase in Romania, had 6–9% Neanderthal DNA, from a Neanderthal ancestor only four to six generations back. This mixed population seems to have died out: it left no clear trace in later Europeans.",
    date_text: "c. 40,000 years ago",
    start_year: ka(42),
    end_year: ka(38),
    link: { from: "neanderthal@10", to: "homo-sapiens@9" }, // Vindija, Peștera cu Oase
    source: NEANDERTHAL_GENETICS,
  },
];
