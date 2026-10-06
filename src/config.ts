export const CATEGORY_STYLE = {
  species: { label: "Species", color: "#ffd166", shape: "Point sites" },
  culture: { label: "Cultures", color: "#06d6a0", shape: "Fuzzy zones" },
  civilization: { label: "Civilizations", color: "#ef476f", shape: "Territories" },
} as const;

// Era jump chips. Years are astronomical.
export const ERA_PRESETS = [
  { label: "Sahelanthropus", year: -6_499_999 },
  { label: "Lucy", year: -3_199_999 },
  { label: "First tools", year: -2_499_999 },
  { label: "Out of Africa", year: -1_799_999 },
  { label: "Neanderthals", year: -199_999 },
  { label: "Cave art", year: -29_999 },
  { label: "Natufian", year: -12_999 },
  { label: "First farmers", year: -4_999 },
  { label: "Bronze Age", year: -2_249 },
  { label: "Persia", year: -499 },
  { label: "1 CE", year: 1 },
];
