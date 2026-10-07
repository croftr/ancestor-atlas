import { iso1A2Code } from "@rapideditor/country-coder";

// XRONOS "country" values are mostly ISO 3166-1 alpha-2 codes, but some source databases use alpha-3 codes,
// names in other languages, or regions. Each maps to the set of alpha-2 codes a correct point may geocode to.
// Sets with more than one code cover former states, disputed or ambiguous borders, and overseas territories.
const GB = ["GB", "IM", "GG", "JE"];
const IRELAND = ["IE", "GB"]; // island of Ireland: some databases code Northern Irish sites IE
const ISRAEL_PALESTINE = ["IL", "PS"];
const CZECHOSLOVAKIA = ["CZ", "SK"];
const YUGOSLAVIA = ["RS", "ME", "XK", "BA", "HR", "SI", "MK"];
const ALIASES: Record<string, string[]> = {
  GB, IM: GB, GG: GB, JE: GB, "England/Wales": GB, Scotland: GB, "Channel Isles": GB,
  IE: IRELAND,
  IL: ISRAEL_PALESTINE, PS: ISRAEL_PALESTINE, "Israel, Palestine": ISRAEL_PALESTINE,
  "Israel/West Bank/Gaza Strip": ISRAEL_PALESTINE, "Israël": ISRAEL_PALESTINE,
  CZ: CZECHOSLOVAKIA, SK: CZECHOSLOVAKIA, Moravia: CZECHOSLOVAKIA,
  SFRY: YUGOSLAVIA, Yugoslavia: YUGOSLAVIA, RS: ["RS", "XK"], Kosovo: ["XK", "RS"],
  UA: ["UA", "RU"], RU: ["RU", "UA"], // Crimea
  MD: ["MD", "RO"], Moldavia: ["MD", "RO"], // Moldavia is also a region of Romania
  CN: ["CN", "TW"], TW: ["TW", "CN"],
  EG: ["EG", "SD"], SD: ["SD", "EG"], // Halaib triangle and Bir Tawil
  MA: ["MA", "EH"], "West Sahara": ["EH", "MA"], "Sahara Occidental": ["EH", "MA"],
  CY: ["CY"],
  "St. Martin": ["MF", "SX", "FR", "NL"],
  Bonaire: ["BQ", "NL"],
  "Spain/Portugal": ["ES", "PT"],
  Crete: ["GR"], Sicily: ["IT"], Corsica: ["FR"], Mallorca: ["ES"],
  Espagne: ["ES"], "España": ["ES"], Italie: ["IT"], Italia: ["IT"], Turquie: ["TR"], "Algérie": ["DZ"],
  Suisse: ["CH"], Suiza: ["CH"], Belgique: ["BE"], Chypre: ["CY"], Tunisie: ["TN"], Francia: ["FR"],
  Syrie: ["SY"], Croatie: ["HR"], Allemagne: ["DE"], Alemania: ["DE"], Roumanie: ["RO"], "Égypte": ["EG"],
  Libye: ["LY"], "Monténégro": ["ME"], Mauretania: ["MR"],
  CMR: ["CM"], COG: ["CG"], GAB: ["GA"], COD: ["CD"], CAF: ["CF"], CAR: ["CF"], RWA: ["RW"], GNQ: ["GQ"],
  AGO: ["AO"], BDI: ["BI"], TCD: ["TD"],
};

/** Alpha-2 codes a point labelled with this XRONOS country may lie in; undefined when the label is not a country. */
export function countryCodes(label: string): string[] | undefined {
  const l = label.trim();
  if (ALIASES[l]) return ALIASES[l];
  return /^[A-Z]{2}$/.test(l) ? [l] : undefined;
}

// Probe the point and eight neighbours about 25 km away, so sites near a border or coast are not flagged.
const STEP = 0.25;
const PROBES = [[0, 0], [STEP, 0], [-STEP, 0], [0, STEP], [0, -STEP], [STEP, STEP], [STEP, -STEP], [-STEP, STEP], [-STEP, -STEP]];

/**
 * True when the point clearly lies outside the stated country: none of the probes falls in it, and at least one
 * falls in another country. Unknown labels and points with all probes at sea are not judged.
 */
export function outsideCountry(label: string, lat: number, lon: number): boolean {
  const codes = countryCodes(label);
  if (!codes) return false;
  // Both levels: a point in an overseas territory geocodes to the territory (TC, GF) and to its country (GB, FR).
  const found = PROBES.flatMap(([dy, dx]) => [iso1A2Code([lon + dx, lat + dy]), iso1A2Code([lon + dx, lat + dy], { level: "territory" })])
    .filter((c): c is string => !!c);
  return found.length > 0 && !found.some((c) => codes.includes(c));
}
