/**
 * Ambient sound for a tour stop: a few seconds under the narration, starting a couple of seconds after
 * the stop's card opens (src/audio/ambience.ts plays it; timings at the top of that file). Keyed by entity id, so any tour stopping there gets it; events for
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
  // hominin-divergence: no sound (Rob's call, 16 Oct 2026).
  "lomekwian-tools": {
    prompt: "Close, clear knocks of a heavy stone hammering a large stone core, sharp chips cracking off, by a lake with small waves lapping and birds calling",
    sound: { src: "ambience/events/lomekwian-tools-v3.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "1ef4be460b" },
  },
  "oldowan-tools": {
    prompt: "Close sharp clicks and knocks of a stone hammer flaking a cobble, small chips falling on gravel, savanna wind and insects behind",
    sound: { src: "ambience/events/oldowan-tools-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "927d5692af" },
  },
  "out-of-africa-dmanisi": {
    prompt: "Open grassland in mountain foothills: cool wind through long grass, a distant river, a few birds, slow footsteps on gravel",
    sound: { src: "ambience/events/out-of-africa-dmanisi-v2.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "caf9104e7b" },
  },
  "acheulean-handaxes": {
    prompt: "Patient knapping of a flint handaxe: rhythmic soft hammer blows on stone, flakes falling, light wind in an open valley",
    sound: { src: "ambience/events/acheulean-handaxes-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "15e92c2070" },
  },
  "control-of-fire": {
    prompt: "Crackling campfire inside a rock shelter at night, wood popping and settling, soft wind outside, distant night insects",
    sound: { src: "ambience/events/control-of-fire-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "3dc6d65d2a" },
  },
  "modern-humans-emerge": {
    prompt: "North African savanna at dawn: gentle wind, birdsong, cicadas warming up, distant animal calls",
    sound: { src: "ambience/events/modern-humans-emerge-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "7e197e4295" },
  },
  "symbolic-culture": {
    prompt: "Sea cave on a rocky African coast: waves breaking below, wind across the cave mouth, water dripping, a stone softly grinding red ochre",
    sound: { src: "ambience/events/symbolic-culture-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "446a7f0507" },
  },
  "sahul-seafaring": {
    prompt: "Small raft on the open sea: gentle ocean swell, water lapping against wood, a paddle dipping slowly, wind, distant seabirds",
    sound: { src: "ambience/events/sahul-seafaring-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "e405f8787f" },
  },
  "archaic-human-admixture": {
    prompt: "Cold forest edge in late autumn: wind in pine trees, a fast stream, ravens calling, a small fire crackling",
    sound: { src: "ambience/events/archaic-human-admixture-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "5bfe0824b2" },
  },
  "figurative-cave-art": {
    prompt: "Deep limestone cave: slow water drips echoing, still hollow air, faint crackle of a burning torch, soft brush strokes on rock",
    sound: { src: "ambience/events/figurative-cave-art-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "f48f6a6e72" },
  },
  "earliest-musical-instruments": {
    prompt: "Distant breathy notes of a simple bone flute echoing in a cave, sparse and slow with long pauses, wind outside",
    sound: { src: "ambience/events/earliest-musical-instruments-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "23254c8c17" },
  },
  "peopling-of-the-americas": {
    prompt: "Ice Age northern coast: cold wind, sea ice creaking, waves on a pebble beach, distant gulls",
    sound: { src: "ambience/events/peopling-of-the-americas-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "e05881f304" },
  },
  "first-pottery": {
    prompt: "Crackling bonfire firing clay pots, occasional ceramic clinks, steady rain falling outside a cave mouth",
    sound: { src: "ambience/events/first-pottery-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "d6c6957ecd" },
  },
  "dog-domestication": {
    prompt: "Ice Age camp in a river valley at dusk: wolves howling far away, a dog panting and padding nearby, campfire crackling, wind",
    sound: { src: "ambience/events/dog-domestication-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "dee6046a4e" },
  },
  "gobekli-tepe": {
    prompt: "Windy limestone hilltop: steady wind, a stone chisel tapping on limestone, footsteps on rock, a bird of prey calling",
    sound: { src: "ambience/events/gobekli-tepe-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "243d9f9f4f" },
  },
  "birth-of-agriculture": {
    prompt: "Ripe wheat field in a breeze: rustling grain stalks, a flint sickle cutting stems, larks singing, goats bleating in the distance",
    sound: { src: "ambience/events/birth-of-agriculture-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "9b11b9f397" },
  },
  "copper-smelting": {
    prompt: "Small clay furnace roaring as leather bellows pump air in rhythmic gusts, charcoal crackling and hissing",
    sound: { src: "ambience/events/copper-smelting-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "9d4bf797ca" },
  },
  "invention-of-the-wheel": {
    prompt: "Wooden cart with solid wheels creaking slowly along a dirt track, oxen hooves plodding, wind over open grassland",
    sound: { src: "ambience/events/invention-of-the-wheel-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "3c943232ed" },
  },
  "bronze-age": {
    prompt: "Bronze casting workshop: hammer ringing on metal, molten metal hissing in water, furnace roaring, metallic clinks",
    sound: { src: "ambience/events/bronze-age-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "ea733577a9" },
  },
  "development-of-writing": {
    prompt: "A reed stylus pressing into soft clay tablets, quiet scratching and tapping in a mud-brick room, a distant busy city",
    sound: { src: "ambience/events/development-of-writing-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "a70e71094a" },
  },
  "great-pyramid": {
    prompt: "Desert wind over sand, huge stone blocks dragged on wooden sledges, ropes creaking, rhythmic copper chisels on limestone",
    sound: { src: "ambience/events/great-pyramid-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "19e15e33a7" },
  },
  "indus-cities": {
    prompt: "Brick-paved riverside city: water running through drains, wooden cart wheels, birds, the gentle bustle of a market without speech",
    sound: { src: "ambience/events/indus-cities-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "5d1d67bbeb" },
  },
  "alphabetic-script": {
    prompt: "Desert mine in rocky hills: dry wind, a chisel scratching marks into sandstone, small stones falling, goats far away",
    sound: { src: "ambience/events/alphabetic-script-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "c4c236b4e7" },
  },
  "code-of-hammurabi": {
    prompt: "Chisel carving into hard black basalt, steady taps, a palace courtyard with a trickling fountain and birds",
    sound: { src: "ambience/events/code-of-hammurabi-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "c6e39452ff" },
  },
  "iron-age": {
    prompt: "Blacksmith forging iron: heavy hammer strikes on hot metal, bellows breathing, sparks, a hiss of quenching in water",
    sound: { src: "ambience/events/iron-age-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "a75cc0a93f" },
  },
  "sea-peoples": {
    prompt: "Ancient sea battle: waves, oars splashing, wooden ships creaking and colliding, distant shouts and clashing bronze",
    sound: { src: "ambience/events/sea-peoples-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "7d5a9cf0f4" },
  },
  "minted-coinage": {
    prompt: "Ancient mint: hammer striking metal dies, coins clinking and dropping into a pile, a market murmuring far away",
    sound: { src: "ambience/events/minted-coinage-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "f9abfcc44b" },
  },
  papermaking: {
    prompt: "Making paper by hand: water sloshing in a vat, wet pulp beaten with wooden mallets, a bamboo screen lifted and dripping, gentle rain outside",
    sound: { src: "ambience/events/papermaking-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "d80a041fbe" },
  },
};
