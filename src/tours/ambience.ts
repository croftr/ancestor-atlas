/**
 * Ambient sound for a tour stop: a quiet loop under the narration and music while the stop's card is up
 * (src/audio/ambience.ts plays it). Keyed by entity id, so any tour stopping there gets it; events for
 * now. `prompt` is what was asked of ElevenLabs' sound generator; `sound` is set by
 * `npm run audio:ambience` (key ambience/<category>/<id>-v<n>.mp3, `prompt_hash` the prompt's
 * fingerprint when generated, so an edited prompt shows as stale). An entry without `sound` plays nothing.
 * Prompts describe the place and the work, never speech or music (except the bone flute).
 */
export interface Ambience {
  prompt: string;
  sound?: { src: string; credit: string; prompt_hash: string };
}

export const AMBIENCE: Record<string, Ambience> = {
  "hominin-divergence": {
    prompt: "Late Miocene African woodland beside a lake at midday: insects humming, warm wind in grass and leaves, distant birds, occasional far-off ape calls, no human voices",
  },
  "lomekwian-tools": {
    prompt: "Dry East African lakeshore: soft wind, gentle lapping water, slow heavy knocks of stone striking stone nearby, distant birds",
  },
  "oldowan-tools": {
    prompt: "Close sharp clicks and knocks of a stone hammer flaking a cobble, small chips falling on gravel, savanna wind and insects behind",
  },
  "out-of-africa-dmanisi": {
    prompt: "Open grassland in mountain foothills: cool wind through long grass, a distant river, a few birds, slow footsteps on gravel",
  },
  "acheulean-handaxes": {
    prompt: "Patient knapping of a flint handaxe: rhythmic soft hammer blows on stone, flakes falling, light wind in an open valley",
  },
  "control-of-fire": {
    prompt: "Crackling campfire inside a rock shelter at night, wood popping and settling, soft wind outside, distant night insects",
  },
  "modern-humans-emerge": {
    prompt: "North African savanna at dawn: gentle wind, birdsong, cicadas warming up, distant animal calls",
  },
  "symbolic-culture": {
    prompt: "Sea cave on a rocky African coast: waves breaking below, wind across the cave mouth, water dripping, a stone softly grinding red ochre",
  },
  "sahul-seafaring": {
    prompt: "Small raft on the open sea: gentle ocean swell, water lapping against wood, a paddle dipping slowly, wind, distant seabirds",
  },
  "archaic-human-admixture": {
    prompt: "Cold forest edge in late autumn: wind in pine trees, a fast stream, ravens calling, a small fire crackling",
  },
  "figurative-cave-art": {
    prompt: "Deep limestone cave: slow water drips echoing, still hollow air, faint crackle of a burning torch, soft brush strokes on rock",
  },
  "earliest-musical-instruments": {
    prompt: "Distant breathy notes of a simple bone flute echoing in a cave, sparse and slow with long pauses, wind outside",
  },
  "peopling-of-the-americas": {
    prompt: "Ice Age northern coast: cold wind, sea ice creaking, waves on a pebble beach, distant gulls",
  },
  "first-pottery": {
    prompt: "Crackling bonfire firing clay pots, occasional ceramic clinks, steady rain falling outside a cave mouth",
  },
  "dog-domestication": {
    prompt: "Ice Age camp in a river valley at dusk: wolves howling far away, a dog panting and padding nearby, campfire crackling, wind",
  },
  "gobekli-tepe": {
    prompt: "Windy limestone hilltop: steady wind, a stone chisel tapping on limestone, footsteps on rock, a bird of prey calling",
  },
  "birth-of-agriculture": {
    prompt: "Ripe wheat field in a breeze: rustling grain stalks, a flint sickle cutting stems, larks singing, goats bleating in the distance",
  },
  "copper-smelting": {
    prompt: "Small clay furnace roaring as leather bellows pump air in rhythmic gusts, charcoal crackling and hissing",
  },
  "invention-of-the-wheel": {
    prompt: "Wooden cart with solid wheels creaking slowly along a dirt track, oxen hooves plodding, wind over open grassland",
  },
  "bronze-age": {
    prompt: "Bronze casting workshop: hammer ringing on metal, molten metal hissing in water, furnace roaring, metallic clinks",
  },
  "development-of-writing": {
    prompt: "A reed stylus pressing into soft clay tablets, quiet scratching and tapping in a mud-brick room, a distant busy city",
  },
  "great-pyramid": {
    prompt: "Desert wind over sand, huge stone blocks dragged on wooden sledges, ropes creaking, rhythmic copper chisels on limestone",
  },
  "indus-cities": {
    prompt: "Brick-paved riverside city: water running through drains, wooden cart wheels, birds, the gentle bustle of a market without speech",
  },
  "alphabetic-script": {
    prompt: "Desert mine in rocky hills: dry wind, a chisel scratching marks into sandstone, small stones falling, goats far away",
  },
  "code-of-hammurabi": {
    prompt: "Chisel carving into hard black basalt, steady taps, a palace courtyard with a trickling fountain and birds",
  },
  "iron-age": {
    prompt: "Blacksmith forging iron: heavy hammer strikes on hot metal, bellows breathing, sparks, a hiss of quenching in water",
  },
  "sea-peoples": {
    prompt: "Ancient sea battle: waves, oars splashing, wooden ships creaking and colliding, distant shouts and clashing bronze",
  },
  "minted-coinage": {
    prompt: "Ancient mint: hammer striking metal dies, coins clinking and dropping into a pile, a market murmuring far away",
  },
  papermaking: {
    prompt: "Making paper by hand: water sloshing in a vat, wet pulp beaten with wooden mallets, a bamboo screen lifted and dripping, gentle rain outside",
  },
};
