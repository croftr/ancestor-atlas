/**
 * The stages the Cultures page (#/cultures) groups cultures into. Kept in the app, like the routes and the family
 * tree: until every culture had its own picture the page grouped them by their shared stand-in picture, which left
 * the cultures that never had one in a catch-all "Other cultures". Every culture belongs to exactly one stage
 * (cultureStages.test.ts). `picture` is the stage's own painting (the old shared picture), shown as its banner;
 * a stage without one shows a strip of its members' pictures instead.
 */
export interface CultureStage {
  id: string;
  title: string;
  /** One or two plain sentences under the stage's title. */
  blurb: string;
  picture?: { url: string; credit: string };
  members: string[];
}

const painting = (file: string) => ({ url: `/images/cultures/${file}.webp`, credit: "AI-generated illustration" });

export const CULTURE_STAGES: CultureStage[] = [
  {
    id: "first-toolmakers",
    title: "The first stone tools",
    blurb: "Over three million years, early hominins went from sharp flakes struck off river cobbles to carefully shaped handaxes.",
    picture: painting("early-toolmakers"),
    members: ["lomekwian", "oldowan", "acheulean"],
  },
  {
    id: "middle-stone-age",
    title: "Middle Stone Age and Neanderthal toolmakers",
    blurb: "Prepared-core points and blades, ochre and the first ornaments, made by early modern humans in Africa and by Neanderthals in Europe and western Asia.",
    picture: painting("middle-stone-age-toolmakers"),
    members: ["middle-stone-age", "levallois-mousterian", "micoquian", "szeletian", "chatelperronian"],
  },
  {
    id: "ice-age-hunters",
    title: "Ice Age hunters",
    blurb: "Hunter-gatherers of the last glacial period, who carved ivory, painted caves and followed mammoth, reindeer and horse in Europe, made tiny bladelets along the coasts of North Africa, and, at its end, spread the first widespread culture of the Americas.",
    picture: painting("ice-age-hunters"),
    members: ["aurignacian", "gravettian", "solutrean", "epigravettian", "magdalenian", "iberomaurusian", "clovis"],
  },
  {
    id: "first-farmers-near-east",
    title: "First farmers of the Near East",
    blurb: "From settled foragers to the first farming villages, then painted pottery and the growing towns of Mesopotamia.",
    picture: painting("neolithic-near-east"),
    members: ["natufian", "pre-pottery-neolithic", "halaf", "ubaid"],
  },
  {
    id: "after-the-ice",
    title: "As the ice melted",
    blurb: "Hunter-gatherers of a warming world: pottery-making villages in Japan, camps by forest lakes and seashores in Europe, snail-shell middens in North Africa, and rock shelters across southern Africa.",
    members: ["jomon", "azilian", "capsian", "oakhurst", "maglemosian", "wilton", "ertebolle"],
  },
  {
    id: "first-farmers-south-asia",
    title: "First farmers of South Asia",
    blurb: "Barley, wheat and cattle at the foot of the Bolan Pass: the villages from which the Indus civilization grew.",
    members: ["mehrgarh"],
  },
  {
    id: "first-farmers-east-asia",
    title: "First farmers of East Asia",
    blurb: "Millet along the Yellow River and rice in the Yangtze delta: villages, carved jade and the first walled towns of China.",
    members: ["peiligang", "hemudu", "yangshao", "hongshan", "liangzhu", "longshan"],
  },
  {
    id: "early-farmers-europe",
    title: "Early farmers of Europe",
    blurb: "Farming spread from the Balkans up the Danube and along the Mediterranean coast, bringing longhouses, ditched enclosures and the first megaliths.",
    picture: painting("early-farmers"),
    members: [
      "starcevo-koros-cris", "cardial", "linear-pottery", "vinca", "cucuteni-trypillia", "hinkelstein-grossgartach",
      "lengyel", "stichbandkeramik", "rossen", "chasseen", "michelsberg", "funnelbeaker",
    ],
  },
  {
    id: "predynastic-egypt",
    title: "Predynastic Egypt",
    blurb: "Farming villages along the Nile in the centuries before the first pharaohs.",
    picture: painting("predynastic-egypt"),
    members: ["badarian", "naqada"],
  },
  {
    id: "on-the-move",
    title: "Farmers and seafarers on the move",
    blurb: "Two great expansions: Austronesian voyagers from Taiwan out across the Pacific, and Bantu-speaking farmers across Central and East Africa.",
    members: ["dapenkeng", "lapita", "bantu-farmers"],
  },
  {
    id: "copper-bronze-europe",
    title: "Copper and Bronze Age Europe",
    blurb: "Wagons, copper and then bronze, and new burial customs as steppe ancestry spread across Europe.",
    picture: painting("copper-bronze-europe"),
    members: ["baden", "globular-amphora", "corded-ware", "bell-beaker", "unetice"],
  },
  {
    id: "bronze-age-steppe",
    title: "Bronze Age steppe herders",
    blurb: "Herders with wagons, horses and later chariots, from the Pontic–Caspian steppe east to the Altai.",
    picture: painting("bronze-age-steppe"),
    members: ["yamnaya", "afanasievo", "sintashta", "andronovo"],
  },
];
