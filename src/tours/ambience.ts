/**
 * Ambient sound for a tour stop: a few seconds under the narration, starting a couple of seconds after
 * the stop's card opens (src/audio/ambience.ts plays it; timings at the top of that file). Keyed by entity id, so any tour stopping there gets it; events, cities,
 * cultures and civilizations (not species). `prompt` is what was asked of ElevenLabs' sound generator; `sound` is set by
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
    prompt: "Evening at a slow African river between forest and open grassland: water gently flowing, leaves rustling in the trees, chimpanzee-like apes hooting softly in the canopy, dry grass swishing in a warm breeze, insects and frogs starting up at dusk",
    sound: { src: "ambience/events/hominin-divergence-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "189709aac0" },
  },
  "laetoli-footprints": {
    prompt: "Slow bare footsteps pressing into damp volcanic ash after light rain, gentle East African savanna wind, distant birds calling",
    sound: { src: "ambience/events/laetoli-footprints-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "7bc93dff7e" },
  },
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
  "kalambo-falls-wood": {
    prompt: "Stone adze chopping and scraping heavy wet timber by a river, wood chips falling, rushing river water and a distant waterfall",
    sound: { src: "ambience/events/kalambo-falls-wood-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "ac62eb9810" },
  },
  "modern-humans-emerge": {
    prompt: "North African savanna at dawn: gentle wind, birdsong, cicadas warming up, distant animal calls",
    sound: { src: "ambience/events/modern-humans-emerge-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "7e197e4295" },
  },
  "schoningen-spears": {
    prompt: "Reedy lakeshore in cool wind: flint flake scraping a spruce wooden spear shaft, water lapping in reeds, distant wild horses",
    sound: { src: "ambience/events/schoningen-spears-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "b41d4dd892" },
  },
  "earliest-burials": {
    prompt: "Quiet limestone cave mouth at dusk: soft wind over dry hills, gentle digging in earth and gravel, distant doves calling",
    sound: { src: "ambience/events/earliest-burials-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "b49dfbe975" },
  },
  "symbolic-culture": {
    prompt: "Sea cave on a rocky African coast: waves breaking below, wind across the cave mouth, water dripping, a stone softly grinding red ochre",
    sound: { src: "ambience/events/symbolic-culture-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "446a7f0507" },
  },
  "sahul-seafaring": {
    prompt: "Small raft on the open sea: gentle ocean swell, water lapping against wood, a paddle dipping slowly, wind, distant seabirds",
    sound: { src: "ambience/events/sahul-seafaring-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "e405f8787f" },
  },
  "bow-and-arrow": {
    prompt: "A wooden bowstring twanging with a sharp thunk, an arrow whistling swiftly through the air, rustling reeds and distant birds calling",
    sound: { src: "ambience/events/bow-and-arrow-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "b9c0fd415c" },
  },
  "archaic-human-admixture": {
    prompt: "Cold forest edge in late autumn: wind in pine trees, a fast stream, ravens calling, a small fire crackling",
    sound: { src: "ambience/events/archaic-human-admixture-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "5bfe0824b2" },
  },
  "figurative-cave-art": {
    prompt: "Deep limestone cave: slow water drips echoing, still hollow air, faint crackle of a burning torch, soft brush strokes on rock",
    sound: { src: "ambience/events/figurative-cave-art-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "f48f6a6e72" },
  },
  "eyed-needle-clothing": {
    prompt: "Inside a warm hide tent in winter: rhythmic scratching and pulling of sinew thread through leather with a fine bone needle, wind howling outside",
    sound: { src: "ambience/events/eyed-needle-clothing-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "cffe056e8a" },
  },
  "neanderthal-extinction": {
    prompt: "A lonely cold wind blowing across desolate coastal cliffs, solitary distant sea eagle cry, waves surging onto rocky shores",
    sound: { src: "ambience/events/neanderthal-extinction-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "ab8c7fb32b" },
  },
  "earliest-musical-instruments": {
    prompt: "Distant breathy notes of a simple bone flute echoing in a cave, sparse and slow with long pauses, wind outside",
    sound: { src: "ambience/events/earliest-musical-instruments-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "23254c8c17" },
  },
  "peopling-of-the-americas": {
    prompt: "Ice Age northern coast: cold wind, sea ice creaking, waves on a pebble beach, distant gulls",
    sound: { src: "ambience/events/peopling-of-the-americas-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "e05881f304" },
  },
  clovis: {
    prompt: "Open Ice Age river valley: wind rustling tall grass, a shallow stream babbling over stones, low deep rumbles and heavy footsteps of mammoths grazing across the water",
    sound: { src: "ambience/cultures/clovis-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "022525a7f0" },
  },
  "first-pottery": {
    prompt: "Crackling bonfire firing clay pots, occasional ceramic clinks, steady rain falling outside a cave mouth",
    sound: { src: "ambience/events/first-pottery-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "d6c6957ecd" },
  },
  "dog-domestication": {
    prompt: "A lone wolf howling in the far distance across an empty Ice Age valley at night, echoing, soft wind, nothing else",
    sound: { src: "ambience/events/dog-domestication-v2.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "491cb5d564" },
  },
  "quaternary-megafauna-extinction": {
    prompt: "A vast empty windswept tundra steppe, distant low mammoth trumpets fading into the distance, gusting Arctic wind through dry tundra grass",
    sound: { src: "ambience/events/quaternary-megafauna-extinction-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "edb6d91ba1" },
  },
  "gobekli-tepe": {
    prompt: "Windy limestone hilltop: steady wind, a stone chisel tapping on limestone, footsteps on rock, a bird of prey calling",
    sound: { src: "ambience/events/gobekli-tepe-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "243d9f9f4f" },
  },
  "birth-of-agriculture": {
    prompt: "Ripe wheat field in a breeze: rustling grain stalks, a flint sickle cutting stems, larks singing, goats bleating in the distance",
    sound: { src: "ambience/events/birth-of-agriculture-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "9b11b9f397" },
  },
  "cattle-and-pigs": {
    prompt: "Neolithic village pen at morning: cattle lowing and shifting, pigs grunting and rooting in mud, a wooden gate creaking, birdsong",
    sound: { src: "ambience/events/cattle-and-pigs-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "0813c9e747" },
  },
  "maize-and-squash": {
    prompt: "Dry hillside in southern Mexico: warm wind through tall grass and maize leaves, a stone hoe chopping soil, cicadas and distant birds",
    sound: { src: "ambience/events/maize-and-squash-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "500e31e212" },
  },
  "rice-and-millet": {
    prompt: "Flooded rice paddy beside a river: water trickling between fields, frogs croaking, a wooden hoe splashing in mud, birds calling",
    sound: { src: "ambience/events/rice-and-millet-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "3ac0940378" },
  },
  "new-guinea-farming": {
    prompt: "Highland swamp garden in New Guinea: a digging stick cutting wet earth, water running in ditches, tropical birds and insects, light rain",
    sound: { src: "ambience/events/new-guinea-farming-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "a1aa432362" },
  },
  "dairying": {
    prompt: "Milk squirting rhythmically into a clay pot, a cow breathing and shifting its hooves, a calf calling, quiet farmyard behind",
    sound: { src: "ambience/events/dairying-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "c2de3945eb" },
  },
  "andean-domestication": {
    prompt: "High Andean grassland by a lake: cold wind, llamas humming softly, their footsteps on stony ground, a distant bird call",
    sound: { src: "ambience/events/andean-domestication-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "9dea1a9640" },
  },
  "chinchorro-mummies": {
    prompt: "Hyper-arid Pacific desert coast: steady ocean waves breaking onto sand and coastal rocks, dry desert wind sweeping over dunes, gulls crying in the distance, soft rustle of dry reed mats",
    sound: { src: "ambience/events/chinchorro-mummies-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "534e34171c" },
  },
  "caral-supe": {
    prompt: "Sacred Andean valley city: haunting breathy notes of ancient bone flutes playing in a sunken circular court, gentle river breeze, footsteps on stone terraces, swallows calling overhead",
    sound: { src: "ambience/events/caral-supe-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "ddbf7f84b3" },
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
  "sorghum-and-millet": {
    prompt: "Hot savanna field at midday: dry sorghum stalks rustling in the wind, a stone grinding grain on a quern, weaver birds chattering",
    sound: { src: "ambience/events/sorghum-and-millet-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "fbd4794bbf" },
  },
  "great-pyramid": {
    prompt: "Desert wind over sand, huge stone blocks dragged on wooden sledges, ropes creaking, rhythmic copper chisels on limestone",
    sound: { src: "ambience/events/great-pyramid-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "19e15e33a7" },
  },
  "indus-cities": {
    prompt: "Brick-paved riverside city: water running through drains, wooden cart wheels, birds, the gentle bustle of a market without speech",
    sound: { src: "ambience/events/indus-cities-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "5d1d67bbeb" },
  },
  "horse-domestication": {
    prompt: "Open steppe: a herd of horses galloping past, hooves drumming, snorts and whinnies, wind over the grass",
    sound: { src: "ambience/events/horse-domestication-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "12b3a0f054" },
  },
  sintashta: {
    prompt: "Windy Eurasian steppe outside a fortified settlement: two chariot horses snorting, shifting their hooves and jingling bronze harness rings, steady wind in dry grass, distant smelting furnaces crackling",
    sound: { src: "ambience/cultures/sintashta-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "b25b51d205" },
  },
  "alphabetic-script": {
    prompt: "Desert mine in rocky hills: dry wind, a chisel scratching marks into sandstone, small stones falling, goats far away",
    sound: { src: "ambience/events/alphabetic-script-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "c4c236b4e7" },
  },
  "code-of-hammurabi": {
    prompt: "Warm evening in the open outside the mud-brick walls of an ancient city: a large crowd gathered round a stone monument, low indistinct murmuring with no clear words, sandals shuffling on dusty ground, a soft desert wind, swallows calling overhead, a donkey braying far off",
    sound: { src: "ambience/events/code-of-hammurabi-v2.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "6c111212ec" },
  },
  "chicken-domestication": {
    prompt: "Tropical forest edge at dawn in Southeast Asia: a junglefowl rooster crowing, hens clucking and scratching in leaves, insects and birds",
    sound: { src: "ambience/events/chicken-domestication-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "a196add0fd" },
  },
  "poverty-point": {
    prompt: "Prehistoric Louisiana bayou: warm evening breeze through Spanish moss and cypress trees, crickets and bullfrogs, crackling wood fire in an earth oven, distant waterfowl",
    sound: { src: "ambience/events/poverty-point-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "47bc290d41" },
  },
  "lapita-voyaging": {
    prompt: "Open Pacific ocean voyage: large outrigger canoe wooden timbers creaking as it rides ocean swells, water rushing past the hulls, wind in woven pandanus sails, distant tropical terns calling",
    sound: { src: "ambience/events/lapita-voyaging-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "05f72e75df" },
  },
  "amarna-letters": {
    prompt: "Late afternoon in a shaded colonnade beside the Nile in ancient Egypt: soft indistinct murmuring of a few people with no clear words, small clay tablets set down on a wooden table, the rustle of linen robes, a horse snorting and shifting its hooves, gentle river water lapping, distant birds over the reeds",
    sound: { src: "ambience/events/amarna-letters-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "5dc254f9fd" },
  },
  "iron-age": {
    prompt: "Blacksmith forging iron: heavy hammer strikes on hot metal, bellows breathing, sparks, a hiss of quenching in water",
    sound: { src: "ambience/events/iron-age-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "a75cc0a93f" },
  },
  "sea-peoples": {
    prompt: "Ancient sea battle: waves, oars splashing, wooden ships creaking and colliding, distant shouts and clashing bronze",
    sound: { src: "ambience/events/sea-peoples-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "7d5a9cf0f4" },
  },
  "late-bronze-age-collapse": {
    prompt: "A burning ancient stone palace at dusk: roaring crackling fire, timbers cracking and crashing down, a donkey cart's wooden wheels creaking along a dusty road, footsteps of people fleeing, distant anxious voices with no clear words, the low rumble of a coastal wind",
    sound: { src: "ambience/events/late-bronze-age-collapse-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "cddf744ad4" },
  },
  "nok-terracotta": {
    prompt: "Ancient West African savanna settlement: clay pottery being burnished and tapped, rhythmic leather bellows pumping air into an iron furnace, crackling charcoal embers, tropical birds calling",
    sound: { src: "ambience/events/nok-terracotta-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "abd44470a7" },
  },
  "first-olympic-games": {
    prompt: "Ancient stadium at Olympia: rhythmic bare footfalls sprinting on compacted sand, athletic breathing, distant applause from spectators on the grassy embankment, cicadas in summer pine trees",
    sound: { src: "ambience/events/first-olympic-games-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "b91a4addd6" },
  },
  "minted-coinage": {
    prompt: "Ancient mint: hammer striking metal dies, coins clinking and dropping into a pile, a market murmuring far away",
    sound: { src: "ambience/events/minted-coinage-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "f9abfcc44b" },
  },
  "unification-of-china": {
    prompt: "Imperial Qin military encampment: marching rhythmic footsteps of armored soldiers, bronze weapons clinking, chariot harness rings jingling, a deep bronze war bell chiming in the distance",
    sound: { src: "ambience/events/unification-of-china-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "509b657d67" },
  },
  papermaking: {
    prompt: "Making paper by hand: water sloshing in a vat, wet pulp beaten with wooden mallets, a bamboo screen lifted and dripping, gentle rain outside",
    sound: { src: "ambience/events/papermaking-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "d80a041fbe" },
  },
  "silk-road": {
    prompt: "Silk Road desert caravan: bronze camel bells rhythmically chiming as camels tread softly on desert sand dunes, dry wind whistling across the sands, distant flute melody",
    sound: { src: "ambience/events/silk-road-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "e1d30c0bdf" },
  },
  "cucuteni-trypillia": {
    prompt: "Neolithic village by a river valley: crackling pottery kiln fire, a distant timber bonfire roaring softly, gentle breeze in grass, birds calling",
    sound: { src: "ambience/cultures/cucuteni-trypillia-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "6da13cb61e" },
  },
  carthage: {
    prompt: "Ancient Mediterranean harbour: gentle waves lapping against stone quays, rhythmic wooden galley oars dipping in water, creaking ship timbers, distant gulls",
    sound: { src: "ambience/civilizations/carthage-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "a7b7c6bcd1" },
  },
  // Cities (cities.yaml), oldest first.
  jericho: {
    prompt: "Neolithic town beside a desert spring: water bubbling up from the spring, a stone rubbing grain on a grinding stone, goats bleating, dry valley wind, desert birds",
    sound: { src: "ambience/cities/jericho-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "336d854423" },
  },
  catalhoyuk: {
    prompt: "Neolithic mud-brick town on a plain: a wooden ladder creaking on a flat roof, soft clicks of obsidian being flaked, a hearth crackling below, wind over marshland, cattle lowing far off",
    sound: { src: "ambience/cities/catalhoyuk-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "0e0b3a5dd2" },
  },
  uruk: {
    prompt: "Ancient Mesopotamian city by a canal: reed boats poled through still water, a potter's wheel turning, a stylus pressing into wet clay, palm fronds in a warm wind, distant donkeys",
    sound: { src: "ambience/cities/uruk-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "24e19f7b4d" },
  },
  memphis: {
    prompt: "Nile riverside workshops: chisels tapping on stone, water lapping against moored wooden boats, palm leaves in a warm breeze, distant ibis and egret calls",
    sound: { src: "ambience/cities/memphis-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "c9c1798de0" },
  },
  ur: {
    prompt: "Sumerian temple quarter by the marshes: soft footsteps on baked brick, sheep and goats bleating in the distance, water lapping in a canal, reeds rustling in a light wind, marsh birds",
    sound: { src: "ambience/cities/ur-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "8dad2054cc" },
  },
  "mohenjo-daro": {
    prompt: "Brick city street near a great river: water trickling through a covered drain, a bucket drawn up a brick well on a rope, ox-cart wheels creaking slowly, sparrows chirping in warm air",
    sound: { src: "ambience/cities/mohenjo-daro-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "4f14292d06" },
  },
  harappa: {
    prompt: "Brick workshop yard by a river: small hammers tapping beads and shell, a potter's wheel turning, ox-cart wheels on packed earth, river birds and a dry warm breeze",
    sound: { src: "ambience/cities/harappa-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "1eeaed2047" },
  },
  knossos: {
    prompt: "Minoan palace courtyard on a hillside: footsteps on stone paving, clay storage jars set down gently, a bull lowing in the distance, cicadas and a warm Mediterranean breeze",
    sound: { src: "ambience/cities/knossos-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "6e1ba2e993" },
  },
  yinxu: {
    prompt: "Bronze Age capital by a river in northern China: distant ringing of bronze being worked, chariot wheels rolling over packed earth, horses snorting, wind across millet fields",
    sound: { src: "ambience/cities/yinxu-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "8ac86f5020" },
  },
  babylon: {
    prompt: "Brick processional way in a great ancient city: many footsteps on stone paving, a donkey braying in the distance, palm leaves rustling in a warm wind, faint river water",
    sound: { src: "ambience/cities/babylon-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "8bad29da21" },
  },
  "sumerian-city-states": {
    prompt: "Mudbrick city on a canal in southern Mesopotamia: reed boats creaking and paddles dipping in slow water, a stylus pressing into soft clay, sheep bleating in the distance, reeds rustling in a warm wind",
    sound: { src: "ambience/civilizations/sumerian-city-states-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "9c9999e748" },
  },
  "akkadian-empire": {
    prompt: "Royal workshop by the Euphrates: small hammers tapping and chasing bronze, a chisel on stone, footsteps on baked brick, palm leaves rustling, river water and birds in the distance",
    sound: { src: "ambience/civilizations/akkadian-empire-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "e388e27703" },
  },
  hittites: {
    prompt: "Stone citadel on a windy Anatolian upland: chariot wheels rattling over paving, horses snorting and hooves on stone, bronze armour clinking, clay tablets set down on wood, wind across the hills",
    sound: { src: "ambience/civilizations/hittites-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "e1a8216f89" },
  },
  "minoan-civilization": {
    prompt: "Palace terrace above the sea on Crete: footsteps on stone paving, clay storage jars knocked gently, oars and waves in a harbour below, gulls, cicadas and a warm Mediterranean breeze",
    sound: { src: "ambience/civilizations/minoan-civilization-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "4597381d6a" },
  },
  "mycenaean-greece": {
    prompt: "Hilltop citadel of huge stone walls: heavy wooden gate creaking, bronze spears and shields clinking, footsteps on gravel, a stylus scratching clay, wind over dry hills and distant goat bells",
    sound: { src: "ambience/civilizations/mycenaean-greece-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "d2d1180b69" },
  },
  "new-kingdom-of-egypt": {
    prompt: "Festival procession at a great Nile temple: many bare footsteps on stone, the rattle of sistra, wooden carrying poles creaking, river water lapping against boats, ibis calls in hot still air",
    sound: { src: "ambience/civilizations/new-kingdom-of-egypt-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "91c61096fa" },
  },
  phoenicia: {
    prompt: "Busy island harbour: waves slapping wooden hulls, mooring ropes creaking, cedar logs rolled and thumped onto a quay, a large vat bubbling over a fire, gulls crying",
    sound: { src: "ambience/civilizations/phoenicia-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "f30fe6d43e" },
  },
  "neo-assyrian-empire": {
    prompt: "Palace city on the Tigris: marching footsteps and iron scale armour jingling, chisels tapping on stone reliefs, clay tablets stacked, horses in the distance, a hot dry wind",
    sound: { src: "ambience/civilizations/neo-assyrian-empire-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "502b595246" },
  },
  "greek-city-states": {
    prompt: "Classical harbour town below a temple hill: oars dipping in rhythm and water against trireme hulls, bronze shields and spears clinking, a brush on pottery, gulls and cicadas",
    sound: { src: "ambience/civilizations/greek-city-states-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "cc213348a7" },
  },
  "macedonian-empire": {
    prompt: "Army camp on a plain: hundreds of footsteps marching in step, long wooden pikes knocking together, cavalry hooves and horses snorting, armour clinking, wind over the fields",
    sound: { src: "ambience/civilizations/macedonian-empire-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "03bcc0009a" },
  },
  "achaemenid-empire": {
    prompt: "Great stone palace terrace: footsteps on stone stairways, a messenger's horse galloping past on a hard road, metal cups set down, banners flapping in a dry upland wind",
    sound: { src: "ambience/civilizations/achaemenid-empire-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "9a441b9fd5" },
  },
  "maurya-empire": {
    prompt: "Stone stupa and pillar in the Indian countryside: chisels tapping on sandstone, silver coins clinking into a pile, temple bells in the distance, birds and a warm breeze in the trees",
    sound: { src: "ambience/civilizations/maurya-empire-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "1b16f6d0ec" },
  },
  "qin-dynasty": {
    prompt: "Imperial palace courtyard in ancient China: soldiers marching in step with armour clinking, chariot wheels and horses on packed earth, bronze coins clinking, bamboo slips rustling, wind",
    sound: { src: "ambience/civilizations/qin-dynasty-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "c3743e6df9" },
  },
  "han-dynasty": {
    prompt: "City gate on the Silk Road: camel bells and camels grunting, bundles of silk thumped down, hooves on packed earth, wind blowing through watchtowers, paper scrolls unrolled",
    sound: { src: "ambience/civilizations/han-dynasty-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "d6bce2aa1b" },
  },
  "roman-empire": {
    prompt: "Imperial Rome: hobnailed boots marching on stone paving, a cart's wheels rattling over cobbles, a fountain splashing in a square, pigeons, distant hammering from a building site",
    sound: { src: "ambience/civilizations/roman-empire-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "c2c108f263" },
  },
  "olmec-civilization": {
    prompt: "Tropical Gulf lowland ceremonial centre: stone tools pecking and grinding at a huge basalt boulder, jade beads clicking, humid rainforest with frogs, insects and howler monkeys in the distance",
    sound: { src: "ambience/civilizations/olmec-civilization-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "3b2bf8f849" },
  },
  "mayan-city-states": {
    prompt: "Maya city in the rainforest: howler monkeys and tropical birds, insects buzzing, footsteps on plaster steps, a brush stroking bark paper, light rain on leaves",
    sound: { src: "ambience/civilizations/mayan-city-states-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "df99d99c75" },
  },
  teotihuacan: {
    prompt: "Wide stone avenue in a great highland city: rhythmic knapping of obsidian, sharp flakes clinking, footsteps on stone, a brush on plaster, dry wind across the valley",
    sound: { src: "ambience/civilizations/teotihuacan-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "098960289c" },
  },
  "zapotec-civilization": {
    prompt: "Mountaintop ceremonial plaza above a valley: footsteps on stone stairs, clay urns set down, chisels tapping on carved slabs, strong mountain wind, hawks calling far below",
    sound: { src: "ambience/civilizations/zapotec-civilization-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "62f13b3350" },
  },
  lomekwian: {
    prompt: "Wooded stream near an East African lake: heavy stone cobble thudding down onto a stone anvil, sharp rock flakes cracking and falling on gravel, shallow stream water babbling over stones, warm breeze in acacia leaves, distant birds",
    sound: { src: "ambience/cultures/lomekwian-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "dfc829bd8c" },
  },
  oldowan: {
    prompt: "East African lakeshore: sharp clicks and knocks of a river cobble hammerstone striking flakes from a stone core, stone flake scraping bone, gentle lake waves lapping on pebbles, savanna wind",
    sound: { src: "ambience/cultures/oldowan-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "9da2f96043" },
  },
  acheulean: {
    prompt: "Savanna riverbank camp: rhythmic tapping of a bone soft-hammer shaping a stone handaxe, stone flakes clinking on gravel, a small campfire crackling, river water flowing past reeds, distant zebras",
    sound: { src: "ambience/cultures/acheulean-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "1b27dc2810" },
  },
  "middle-stone-age": {
    prompt: "Seaside cave in southern Africa: a stone rubbed back and forth grinding ochre on a slab, careful scratching of stone on stone, waves breaking on rocks outside, wind and seabirds",
    sound: { src: "ambience/cultures/middle-stone-age-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "8515eb156b" },
  },
  "levallois-mousterian": {
    prompt: "Rock shelter above a river valley: steady knocks of a hammerstone flaking flint, a scraper rasping across hide, embers crackling softly in a hearth, distant horses and wind",
    sound: { src: "ambience/cultures/levallois-mousterian-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "8414abb43e" },
  },
  micoquian: {
    prompt: "Limestone rock shelter camp in autumn: rhythmic tapping of antler and stone hammers knapping flint knives, stone flakes clinking, a wood campfire crackling, wind rustling birch leaves, distant bison",
    sound: { src: "ambience/cultures/micoquian-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "2706662c8a" },
  },
  szeletian: {
    prompt: "Mountain cave mouth in early winter: careful pressure-flaking clicks shaping a stone spear point, sinew binding a point to a wooden shaft, a stone-ringed campfire crackling, cold mountain wind in pine trees",
    sound: { src: "ambience/cultures/szeletian-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "0492774682" },
  },
  chatelperronian: {
    prompt: "Cave camp in Ice Age France: gentle pressing and clicking of an antler tool flaking stone, a stone awl drilling, a grinding stone rubbing on a slab, crackling campfires, cold wind outside",
    sound: { src: "ambience/cultures/chatelperronian-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "238c5f09e3" },
  },
  aurignacian: {
    prompt: "Ice Age cave by firelight: a crackling campfire and a hissing torch, light tapping as ivory is carved, a few soft breathy notes from a bone flute, cold wind at the cave mouth",
    sound: { src: "ambience/cultures/aurignacian-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "ca28c55c36" },
  },
  gravettian: {
    prompt: "Winter camp on a frozen plain: a campfire and a small clay kiln crackling, ivory beads clicking on a cord, snow crunching underfoot, bitter wind, mammoths rumbling far off",
    sound: { src: "ambience/cultures/gravettian-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "48050c3024" },
  },
  solutrean: {
    prompt: "Snowy Ice Age camp: careful clicks of an antler tool pressure-flaking a long stone point, a bone needle pulling sinew through hide, crackling campfires, a horse snorting, snow crunching",
    sound: { src: "ambience/cultures/solutrean-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "2affc59599" },
  },
  iberomaurusian: {
    prompt: "Coastal limestone cave camp in North Africa: sharp clicks of flint bladelets being backed, small sea shells clinking as they are strung on cord, meat sizzling on hot stones over a crackling fire, distant waves and gulls",
    sound: { src: "ambience/cultures/iberomaurusian-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "8f93fbae0a" },
  },
  magdalenian: {
    prompt: "Riverside camp at the end of the Ice Age: a fast river rushing over stones, a salmon splashing, a harpoon striking water, stones grinding ochre by a crackling fire, reindeer hooves in the shallows",
    sound: { src: "ambience/cultures/magdalenian-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "6a93de475d" },
  },
  epigravettian: {
    prompt: "Mediterranean shore camp at the end of the Ice Age: flint knapping and wood shaving, fish sizzling over a crackling fire, baskets woven, soft waves on the beach and gulls",
    sound: { src: "ambience/cultures/epigravettian-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "8c6a7f0d21" },
  },
  azilian: {
    prompt: "Riverside rock shelter: a clear river flowing over pebbles, a flint burin scraping bone, pebbles clicking together, a small fire crackling, footsteps on grass, birds in the trees",
    sound: { src: "ambience/cultures/azilian-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "5b63568d10" },
  },
  jomon: {
    prompt: "Forest village by a river in prehistoric Japan: twisted cord pressed into wet clay pots, chestnuts rattling into a woven basket, wooden canoe paddles dipping in river water, wind in autumn forest leaves, birds",
    sound: { src: "ambience/cultures/jomon-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "e4f89ecdc1" },
  },
  oakhurst: {
    prompt: "Southern African rock shelter above a river valley: heavy hammerstone striking stone scrapers from a boulder core, hides scraped on wooden frames, a small campfire crackling, river water flowing below, cape birds calling",
    sound: { src: "ambience/cultures/oakhurst-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "9a83bd42ea" },
  },
  wilton: {
    prompt: "Rock shelter in the southern African hills: fine stone drill boring ostrich eggshell beads, a soft brush painting ochre on sandstone rock, small hearth crackling, warm wind over fynbos and grassland, distant antelopes",
    sound: { src: "ambience/cultures/wilton-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "6dae2a92e1" },
  },
  natufian: {
    prompt: "Stone village in the Levant hills: heavy stone pestles pounding grain in stone mortars, a hearth crackling, a dog panting, footsteps on a stone path, dry wind and larks",
    sound: { src: "ambience/cultures/natufian-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "01e78c0426" },
  },
  "pre-pottery-neolithic": {
    prompt: "Hilltop stone enclosure in the Fertile Crescent: stone hammers pecking and chiselling limestone pillars, a grinding stone rubbing grain back and forth on a quern, dry upland wind, larks singing",
    sound: { src: "ambience/cultures/pre-pottery-neolithic-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "6f85f17c19" },
  },
  halaf: {
    prompt: "Northern Mesopotamian village courtyard: soft brush strokes on clay bowls, grain winnowed and shaken in flat baskets, a small kiln fire crackling, sheep bleating on grassy hills, warm breeze",
    sound: { src: "ambience/cultures/halaf-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "ade5888903" },
  },
  ubaid: {
    prompt: "Southern Mesopotamian canal village: water lapping gently against a wooden canoe, a paddle dipping slowly, a brush painting a clay pot, palm fronds and reeds rustling in a warm breeze, waterbirds",
    sound: { src: "ambience/cultures/ubaid-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "82d01f04e9" },
  },
  mehrgarh: {
    prompt: "Neolithic mudbrick village in Balochistan: a wooden bow drill whirring softly as it bores stone beads, grain poured from baskets into brick storage bins, zebu cattle lowing and goats bleating, warm dry breeze",
    sound: { src: "ambience/cultures/mehrgarh-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "1fe229f919" },
  },
  peiligang: {
    prompt: "Early Neolithic village in the Yellow River valley: a stone roller grinding millet grain back and forth on a stone quern, gentle high notes of a bone flute, pigs grunting softly, river water lapping and cranes calling",
    sound: { src: "ambience/cultures/peiligang-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "32ac54b0ee" },
  },
  hemudu: {
    prompt: "Neolithic stilt-house village over a lush wetland: water lapping gently against wooden pilings, a dugout canoe paddle dipping slowly, a stylus incising clay, water buffalo lowing softly, frogs and wetland birds",
    sound: { src: "ambience/cultures/hemudu-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "4fc2bd9b6f" },
  },
  yangshao: {
    prompt: "Neolithic loess terrace village overlooking the Yellow River: a fine brush painting clay bowls, wet clay smoothed by hand, a pottery kiln crackling softly, millet grain raked on mats, gentle river breeze",
    sound: { src: "ambience/cultures/yangshao-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "1b421976e3" },
  },
  hongshan: {
    prompt: "Neolithic ceremonial complex in the hills of northeastern China: fine stone abrasives and leather straps polishing jade, footsteps on stone paving, small hearth fires crackling by a timber temple, upland breeze in birch and pine trees",
    sound: { src: "ambience/cultures/hongshan-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "3cd5755b13" },
  },
  liangzhu: {
    prompt: "Water-gated Neolithic city in the Yangtze delta: bamboo bow drills whirring softly with wet sand abrasive on jade, flat-bottomed boats poled gently through a canal, water lapping against earthworks, wetland birds",
    sound: { src: "ambience/cultures/liangzhu-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "e253ef2e29" },
  },
  longshan: {
    prompt: "Walled town in the Yellow River plain: a wooden fast potter's wheel spinning softly, wooden rammers thumping earth in timber formwork, domed pottery kilns crackling in the courtyard, dry breeze",
    sound: { src: "ambience/cultures/longshan-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "797e93695d" },
  },
  "starcevo-koros-cris": {
    prompt: "Early Neolithic riverside village in the Balkans: a stone roller grinding wheat grain back and forth on a saddle quern, a fine brush painting clay pottery, sheep and goats bleating, cattle lowing, river water and birds",
    sound: { src: "ambience/cultures/starcevo-koros-cris-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "d7664295d5" },
  },
  cardial: {
    prompt: "Sunny Mediterranean coastal cove: cockle shells gently pressing rhythmic impressions into wet clay pots under a rock shelter, small waves lapping on a pebble beach, a dugout canoe bumping softly, a small beach fire crackling, gulls and cicadas",
    sound: { src: "ambience/cultures/cardial-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "81c812474f" },
  },
  maglemosian: {
    prompt: "Misty lake at dusk in a northern forest: gentle water lapping, a dugout canoe bumping, a fishing spear splashing, a dog breathing nearby, a crackling fire, frogs and waterbirds",
    sound: { src: "ambience/cultures/maglemosian-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "7a03242138" },
  },
  capsian: {
    prompt: "Dry North African hillside camp: stone tools scratching ostrich eggshell, hammerstones knapping flint blades, small hearths crackling, a dry wind and distant birds",
    sound: { src: "ambience/cultures/capsian-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "67f7207819" },
  },
  ertebolle: {
    prompt: "Rocky Baltic shore by an oak forest: small waves lapping, a paddle dipping beside a dugout canoe, fish sizzling on a rack over a fire, bone scraped with flint, gulls",
    sound: { src: "ambience/cultures/ertebolle-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "05956ad5fa" },
  },
  "linear-pottery": {
    prompt: "Early farming village of timber longhouses: a stone adze ground on a wet whetstone, a quern rolling and crushing grain, a small fire, cattle lowing, pigs grunting and sheep in a pasture",
    sound: { src: "ambience/cultures/linear-pottery-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "1a48512073" },
  },
  vinca: {
    prompt: "Neolithic tell settlement above the Danube: air blown softly through a reed blowpipe into a glowing charcoal copper-smelting bowl, a stylus incising clay figurines, river water lapping against dugout canoes, cattle lowing",
    sound: { src: "ambience/cultures/vinca-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "0ab77fb41d" },
  },
  "hinkelstein-grossgartach": {
    prompt: "Middle Neolithic longhouse village in the Rhine valley: a polished stone adze chopping a timber log, a bone stylus incising geometric bands into clay pots, a courtyard fire crackling, cattle and sheep in a woodland pasture",
    sound: { src: "ambience/cultures/hinkelstein-grossgartach-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "efd20610f7" },
  },
  lengyel: {
    prompt: "Neolithic village with a circular timber rondel enclosure: a soft brush painting red and yellow ochre inside a pedestal clay bowl, small village hearths crackling, long-horned cattle lowing in the meadow, gentle breeze in oak trees",
    sound: { src: "ambience/cultures/lengyel-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "923a986a8e" },
  },
  stichbandkeramik: {
    prompt: "Neolithic longhouse village surrounded by golden wheat fields: a bone comb pricking tiny rhythmic rows into a dark clay pot, a stone quern grinding grain in the yard, goats bleating softly, breeze in ripe wheat",
    sound: { src: "ambience/cultures/stichbandkeramik-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "76d5290f9b" },
  },
  rossen: {
    prompt: "Autumnal Neolithic longhouse village by a woodland clearing: a heavy perforated stone axe head rubbed back and forth on a wet sandstone grinding block with sand, white paste pressed into incised pottery, a smoking rack fire crackling, cattle lowing",
    sound: { src: "ambience/cultures/rossen-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "ad44c8e0f1" },
  },
  chasseen: {
    prompt: "Hilltop stone-walled Neolithic enclosure above a river valley: an antler hammer striking honey-coloured flint blades, a bone stylus scratching fine geometric crosshatching into a dark clay bowl, sheep bleating, upland breeze",
    sound: { src: "ambience/cultures/chasseen-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "5ae1f29a29" },
  },
  michelsberg: {
    prompt: "Causewayed ditched enclosure in a misty river valley: rawhide lashing pulled tight around a polished flint axe head in a wooden haft, wet clay tulip beakers smoothed by hand, long-horned cattle lowing as they walk across a wooden bridge, morning birds",
    sound: { src: "ambience/cultures/michelsberg-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "35ff43d8c1" },
  },
  funnelbeaker: {
    prompt: "Northern European coastal clearing by a megalithic dolmen: thick hemp ropes creaking under tension on timber rollers, rawhide lashing bound onto a polished flint axe, oxen pulling a wooden ard plough through soil, coastal breeze and gulls",
    sound: { src: "ambience/cultures/funnelbeaker-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "d5bf1cd673" },
  },
  badarian: {
    prompt: "Predynastic Nile valley village: a smooth pebble burnishing a rippled black-topped red clay bowl, green malachite ground on a slate palette, wheat harvested with sickles by an irrigation ditch, cattle and sheep, warm desert breeze",
    sound: { src: "ambience/cultures/badarian-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "b0f42bacc9" },
  },
  naqada: {
    prompt: "Predynastic mudbrick town on the Nile: an antler tine pressure-flaked against a flint knife, a fine brush painting red boats and flamingos on a buff clay jar, river waves lapping against sailed wooden boats, warm breeze in date palms",
    sound: { src: "ambience/cultures/naqada-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "b7ed8ce9b6" },
  },
  dapenkeng: {
    prompt: "Tropical coastal village in Taiwan: a green nephrite adze ground back and forth on a wet sandstone slab, a cord-wrapped paddle tapping a clay pot, gentle surf on a sandy beach, outrigger canoes, tropical forest birds",
    sound: { src: "ambience/cultures/dapenkeng-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "f500acc175" },
  },
  baden: {
    prompt: "Copper Age village in the Carpathian Basin: solid wooden disc wheels of an ox-drawn wagon creaking slowly over a dirt track, cattle lowing, sheep and horses in the meadow, a courtyard fire crackling, autumn breeze",
    sound: { src: "ambience/cultures/baden-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "82cbfaadb4" },
  },
  "globular-amphora": {
    prompt: "Late Neolithic stone-cist burial ceremony on the northern European plain: wooden spades scraping sandy earth, a pair of oxen breathing softly, village hearth smoke drifting in the distance, wind rustling autumn birch and pine trees",
    sound: { src: "ambience/cultures/globular-amphora-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "07841f3cfd" },
  },
  lapita: {
    prompt: "Pacific island lagoon: soft surf on a sandy beach, a canoe hull and pandanus sail creaking in the wind, stamps tapping into soft clay, palm fronds rustling, small pigs grunting",
    sound: { src: "ambience/cultures/lapita-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "b7f2ebd92e" },
  },
  "bantu-farmers": {
    prompt: "African village forge: leather bellows pumping, a furnace roaring, a hammer ringing on hot iron with sparks, pots burnished by hand, millet stalks rustling in a savanna breeze, cattle lowing",
    sound: { src: "ambience/cultures/bantu-farmers-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "1fa50ec047" },
  },
  yamnaya: {
    prompt: "Open steppe grassland: tall feathergrass hissing in a steady wind, powder trickling into a pit, oxen-drawn wooden wagons creaking, horses' hooves on turf, cattle and sheep in the distance",
    sound: { src: "ambience/cultures/yamnaya-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "22ece6606a" },
  },
  afanasievo: {
    prompt: "Mountain river valley in the Altai: lively river water over stones, a copper blade polished on stone, clay smoothed by hand, footsteps on grass, horses, cattle and sheep grazing",
    sound: { src: "ambience/cultures/afanasievo-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "9162df7cd6" },
  },
  "corded-ware": {
    prompt: "Green pasture on the European plain: oxen pulling creaking four-wheeled wooden wagons, cattle lowing, sheep and horses grazing, wind in the grass, birds",
    sound: { src: "ambience/cultures/corded-ware-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "c62891fe72" },
  },
  "bell-beaker": {
    prompt: "Chalk downland: a copper dagger polished over glowing charcoal, baskets of chalk tipped onto a mound, wooden shovels scraping, skylarks and a light wind",
    sound: { src: "ambience/cultures/bell-beaker-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "78d0c0bdf5" },
  },
  unetice: {
    prompt: "Bronze Age workshop: leather bellows pumping, a stone furnace roaring, molten bronze hissing into a stone mould, a bronze axe set down on wood, wind across fields",
    sound: { src: "ambience/cultures/unetice-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "8e1669cd5f" },
  },
  andronovo: {
    prompt: "Steppe river valley: chariot horses snorting and shifting, spoked wooden wheels creaking, bellows pumping a furnace, molten bronze hissing in a mould, cattle and sheep in the distance",
    sound: { src: "ambience/cultures/andronovo-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "edce18855e" },
  },
  "late-bronze-age-cyprus": {
    prompt: "Copper-smelting harbour town on Cyprus: furnaces roaring with bellows, heavy copper ingots clanking as they are stacked, donkeys braying, waves against ships in the bay, gulls",
    sound: { src: "ambience/cultures/late-bronze-age-cyprus-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "3adca1f37b" },
  },
  "canaanite-city-states": {
    prompt: "Walled hill town above olive groves: a stylus pressing into clay, a potter's wheel turning, a hammer tapping metal, chariot wheels creaking at the gate, goats and wind in olive trees",
    sound: { src: "ambience/cultures/canaanite-city-states-v1.mp3", credit: "AI-generated sound (ElevenLabs)", prompt_hash: "bddd54ed10" },
  },
};

