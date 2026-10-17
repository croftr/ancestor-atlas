# Ancestor Atlas: notes for agents

Read README.md first (pipeline, data files, XRONOS, provenance rules). This file adds the working agreements and
current state that the README does not cover. Data state as of 12 Oct 2026.

## Working agreements

- Work on a branch, not `main` (Rob's call, 17 Oct 2026, as the app grows): one branch per piece of work, named for it
  (`family-tree`, `link-previews`), from an up-to-date `main`. When another agent is working in the same checkout, use
  a git worktree so the two don't switch branches under each other. Merge into `main` and push only when Rob asks.
- Check `git status` first and stage only your own files: Rob often has uncommitted work (README, `src/` UI,
  `src/index.css`, images). Never overwrite or sweep up his changes.
- `public/data` is built, so never hand-merge it: on a conflict there (or in `build-meta.json`), merge the sources,
  then run `npm run data:build` and commit the result.
- Never fetch from xronos.ch automatically. Rob downloads `data/raw/xronos/data.csv` by hand. The XRONOS team (Joe Roe,
  Oct 2026) confirmed use is welcome: download the export once or at most about daily and cache it; no crawling or
  repeated requests (their robots.txt disallows the CSVs for that reason).
- Cite XRONOS in its requested format (in `data/curated/sources.yaml` and the README), together with the original
  publications listed on each point.
- Species images are AI-generated illustrations; every `image_url` needs an `image_credit` (the validator enforces it).

## Pipeline

- `data/raw` (gitignored) -> `data/curated` (hand-edited) -> `public/data` (built, committed).
- `npm run data:build` builds, validates and writes `data/build/qa-report.md`, `recall-queue.csv`,
  `xronos-set-aside.csv` and `xronos-dropped-coords.csv` (all gitignored).
- `npm run build` refuses to build when `public/data` is stale (fingerprint in `public/data/build-meta.json`; covers
  `data/curated`, `data/reference`, `scripts/build-data.ts`, `scripts/ingest`, and the date/colour/calibration/country libs).
  After changing any of those, run `npm run data:build` and commit `public/data` in the same commit.
- Years are astronomical (1 CE = 1, 1 BCE = 0); ka and cal BP count back from 1950.

## Curated sites (`data/curated/species-sites.csv`, `culture-sites.csv`)

- 208 rows: 183 sourced, 21 partial, 4 recall (Lokalalei, Kokiselei, Majuangou, Dent).
- Added 17 Oct 2026 for the migration routes: cultures Early Bantu-speaking farmers (Shum Laka, Katuruka), Dapenkeng
  (Fengbitou) and Lapita (Talepakemalai/Mussau, Teouma, Site 13, Moturiki, Nukuleka, Mulifanua), Wikidata coordinates
  (several place-level) and dates from pinned Wikipedia revisions; descriptions written from those articles (Rob to
  review); no pictures or narration yet.
- Added 12 Oct 2026: A. bahrelghazali (Koro Toro) and A. deyiremeda (Woranso-Mille), both place-level points without
  pictures yet; Denisovan sites Harbin (Homo longi holotype, kept as Denisovan per the 2025 protein/mtDNA work, so the
  Denisovan span now starts 309 ka), Penghu 1 and Tam Ngu Hao 2. H. ergaster stays in H. erectus (Rob's call).
- Each row carries `wikidata`, `coord_source`, `date_source`, `checked`, `notes`. A row leaves `source_id: recall`
  only when both coordinate and date evidence are set (validator-enforced). Place-level coordinates are acceptable
  if the note says so.
- 44 hominin fossils come from Wikipedia's "List of human evolution fossils" at a pinned revision.
- Open: the 21 partial rows need full papers or excavation reports. Koeln-Lindenthal (excavated before radiocarbon)
  has no dates to find and stays recall-sourced. Swartkrans and Kromdraai are marked `review keep-coords`.

## Events (`data/curated/events.yaml`)

- 38 major events (category `event`): 29 from Rob's initial list plus 9 domestication events added 17 Oct 2026
  (cattle and pigs, Mesoamerica, China, New Guinea, milk, the Andes, Africa, horse, chicken). All 38 events have
  bespoke 1000x1000 square WebP title cards with painted serif titles in `public/images/events/`, authentic Commons
  photos in `extra_images`, and narration/ambience. Each has a best `year` (optional `start_year`/`end_year`
  range), `date_text`, a paragraph `description`, `related` entity ids, and `places` (one globe point each).
- Coordinates from Wikidata P625 (item recorded); `note` marks place-level or region points. `date_source` pins the
  English Wikipedia revision the date was checked against. A place is `wikimedia`-sourced only with both, else `recall`.
- On the globe an event shows while the slider is within 3 slider steps of it (`eventTolerance` in `src/map/data.ts`).
- The jump-to chips under the time slider (`ERA_PRESETS` in `src/config.ts`) each name an event id and jump to
  that event's snapped year; `src/eraPresets.test.ts` checks every chip lands on its event.
- Narration (the description read aloud): `narration: { src, credit, text_hash }` on an event, or on a species,
  culture or civilization in entities.yaml (straight after `description`). One text per entity: the card, the page and
  the narration always match, in every tour. `npm run audio:narrate -- <id>…` (or `--missing` for events, `--tour <id>`
  for a tour's stops, `--stale`; batches list the cost and need `--yes`) does it all: ElevenLabs text-to-speech
  of the description (cached by text in `data/build/audio/tts`), two-pass normalisation to -16 LUFS, mono 96 kbps MP3,
  upload to `narration/<events|species|cultures|civilizations>/<id>-v<n>.mp3` (new key each time; refuses to overwrite), then sets events.yaml and that
  event in public/data (and build-meta, if it was fresh): no data build needed, just commit. `--file <mp3>` uses a
  recording instead; `--no-upload` prepares only; `--voices` lists voices. Settings in `.env.local` (gitignored):
  `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, optional `ELEVENLABS_MODEL` (default eleven_multilingual_v2). Uploading
  needs Rob's AWS login; without it, `npm run audio:upload` later uploads every referenced clip missing from the bucket
  (checked over the public URL; `--dry-run` lists them). `text_hash` is the description's fingerprint
  at recording time; the validator warns when the description changes (`--stale` re-records those). Played by the
  Listen button (card and event page, `src/audio/`; hidden while a tour plays) and by tours, where the clip's length sets the hold.
- Pictures: square 1000×1000 WebP in `public/images/events/` (title painted in, so always shown whole, never cropped);
  `image_url` + `image_credit` in events.yaml. Events without one show a placeholder tile.
- Video and audio: `media` list on an event (`kind` video|audio, `src`, `title`, `credit`; validator-enforced). Files live
  in the S3 bucket `robs-ancestors-atlas` (eu-west-2), never in the repo; `src` is the bucket key (`events/x.mp4`), resolved
  by `mediaUrl` in `src/config.ts` (override the base with `VITE_MEDIA_BASE`). A video `src` may instead be a YouTube link
  (played embedded from youtube-nocookie.com; `src/youtube.ts`); credit the channel. Nothing loads until the viewer picks a
  clip on the event detail view (`src/events/EventMedia.tsx`). Encode MP4s with `-movflags +faststart`; never overwrite a
  key (uploads are cached for a year), upload a new name instead.

## Guided tours (`src/tours/`)

**To make a tour, follow `docs/tours.md`** (stops, descriptions, narration, music, upload, release).

- A tour is a hand-picked list of stops in `src/tours/tours.ts` (entity id, optional `year` and `hold` seconds; optional
  `layers` per tour). Kept in the app, not the data pipeline. `tours.test.ts` checks each stop is on the globe then.
- `TourPlayer.tsx` runs it: play the slider forward to the stop (card closed), turn the globe (`showEntity`, `flyTo`
  turn mode), open the card, hold (default from description length, 8–22 s), next. Only the tour bar's pause
  button (or Space) pauses; touching the globe, card or slider does not (Rob's call). Play ends the tour. Keys: arrows step stops, Space pauses, Escape ends.
- `TourBar.tsx`: the Tours button and menu, and the bar that replaces the transport buttons. Link: `#/tour/<id>`.
- Music: `music: { src, credit }` on a tour; `npm run audio:music -- <track> <tour id> "<credit>"` encodes (stereo
  128 kbps, -16 LUFS), sets it in tours.ts and prints the upload command (key `music/tours/<id>-v<n>.mp3`).
  `src/audio/music.ts` loops it through Web Audio (needs the bucket's CORS, which allows `*`), fades, and dips it under
  narration (levels at the top of that file); a music on/off button on the tour bar (remembered). The music credit (CC BY) shows on the title card and in that button's tooltip, not on the bar.
- The screen stays on while a tour plays (Screen Wake Lock, `src/tours/useWakeLock.ts`; released on pause or end,
  taken again when the page comes back into view).
- Sound needs a tap: the Tours menu primes audio; a tour opened from a link waits behind a "Start tour" button (`gate`).
- A stop may set `site` (a feature id) to frame and open the card on one place. Tours can mix categories.
- Tours (Oct 2026): Events and inventions (every event, oldest first: its stops come from `src/tours/event-ids.json`, written by `npm run data:build`, so a new event joins it after the next build; Rob's call, 17 Oct 2026); Human evolution (13 species + 2
  events); Out of Africa (9); Ice Age artists and toolmakers (14); Rise and fall of civilizations (15 civilizations +
  4 events, Sumer to Rome); Out of the steppe (`steppe-migration`, 16 Oct 2026: the wheel + 7 steppe-descended
  cultures, Yamnaya to Andronovo; `dna: "y"` turns the ancient DNA layer on for the tour and puts the viewer's setting
  back after). Every stop narrated; 36 species/culture/civilization descriptions were rewritten as
  narration-length paragraphs for them (Rob to review). Music: Human evolution and Out of Africa have "Apeman Suite" by Paul Lawler (16 Oct 2026; no licence for it, see backlog item 5); the others share "Adrift Among Infinite Stars" (Scott Buckley, CC BY 4.0).
- Tours page `#/tours` (`ToursPage.tsx`, in the rail and phone tabs): a card per tour (cover of four stop pictures,
  blurb, span, stops, running time, narrated/music), Watch, and the stop list to start from any stop
  (`startTour(id, { index })`). The time bar's Tours menu shows a thumbnail and running time, and links to the page.
  Running time and covers come from `src/tours/summary.ts`.
- Title card before stop 1 (`TitleCard.tsx`, `tour.intro` in the store): title, blurb, length, while the globe turns to
  the first stop and `announcement` (ElevenLabs reading `announcementText`: the title only; `npm run audio:narrate --
  --announce <id>|all`, key `narration/tours/<id>-v<n>.mp3`) plays after 1.5 s; the music comes in as it ends (`tour.musicIn`). Skip intro / Next / → skip it; starting from a
  later stop leaves it out. Announcements are read slowly, as a title: `eleven_v3` with "<title> [slowly]" (Rob's
  choice; Out of Africa's v3 is his own recording made that way).
- Epilogue after the last stop (added 16 Oct 2026; `tour.epilogue`, `index` = number of stops; Next on the last stop
  goes there too): the card closes, the globe pulls back, turns to the first stop and redraws the journey as a gold
  thread (`trail` layers in `MapView.tsx`; schedule and great-circle geometry in `src/tours/epilogue.ts`), then
  turns slowly; touching the globe hands the camera back. `EndCard.tsx` sits in the card's place (phones: over the
  top, the globe fitted below it): stop pictures light as the thread reaches them (tap one to go back to that stop),
  span, the tour's `closing` line (written by Claude, Rob approved), Watch again / More tours / Explore the globe.
  Once the thread is drawn the closing line appears and `closingNarration` reads it (stops' voice and model;
  `npm run audio:narrate -- --closing <id>|all`, key `narration/tours/<id>-closing-v<n>.mp3`; `--stale` covers it).
  Music plays on at least 17 s and 1 s past the closing line (never fading before the line is read), then fades
  out over 3 s, and 1 s after it has gone the outro plays (`OUTRO` in `tours.ts`, `music/tours/outro-v1.mp3`, every tour; timings in
  `epilogue.ts`). As the outro starts the tour's
  title comes up over the globe like the time captions (`TourFinale.tsx`, store `tourFinale`, which outlasts the
  tour); when the outro has finished the tour ends by itself (Rob's call, 17 Oct 2026): time bar, climate panels and
  end card go back to normal and the title fades.
- During a tour (added 16 Oct 2026): the path so far is drawn on the globe, faint dashed gold with a dark casing
  (`tour-path` layers in `MapView.tsx`, `pathSoFar` in `epilogue.ts`); each new leg draws in over 1.8 s as the globe
  turns to the stop; Back / Next put it straight in place. While the slider travels between stops an intertitle
  says how much time passes ("40,000 years later", "Meanwhile" for none; `TimeGap.tsx`, `tour.gap`), from the
  stop before's year; it stays 1.6 s past arrival, then fades.
- Ambient sound per stop (added 16 Oct 2026; events only for now): `AMBIENCE` in `src/tours/ambience.ts` (entity id ->
  ElevenLabs `prompt`, plus `sound` once made), played by `src/audio/ambience.ts`: a short burst (decoded buffer, random start
  point), 2 s after the card opens, about 5 s at full level, then faded out (Rob's call, 16 Oct 2026: playing all
  through the narration was too long; `DELAY`/`HOLD`/fades at the top of that file), ducked under narration, on
  the music's audio context; the tour bar's music button mutes both. The Listen button (card and event page) plays
  it too, the same way, pausing with it (a resume carries on, a replay starts it again) (not muted by the tour's music button). `npm run audio:ambience` (missing or stale
  prompts; `-- <id>` to redo one) generates 22 s loops (`eleven_text_to_sound_v2`, `loop: true`), normalises to
  -16 LUFS stereo 96 kbps (the first 0.75 s blended under the end, so the join never clicks), uploads to
  `ambience/<category>/<id>-v<n>.mp3` and sets `sound`. The API key needs the Sound Effects permission. Levels at
  the top of `src/audio/ambience.ts`. All events but hominin-divergence (removed, Rob's call) made 16 Oct 2026 (Rob to review by ear); Lomekwi needed a second
  prompt (the first came back a near-silent rumble).
- Phones (globe): a pick, and every tour stop, opens the compact card (`.info-compact` in `InfoPanel.tsx`,
  `ui/stacked.css`): badge, name (serif), short date range, the picture filling the right edge (events square,
  never faded or covered), and the site stepper; a tap opens the full card, whose minimise button returns to it.
  Above the globe normally, floating over its top during a tour. It replaced both the old minimised card and the
  tour strip (Rob's call, 13 Oct 2026). The full card itself is unchanged.
- Card width (desktop, over 900 px): a drag handle on the info card's left edge (`src/ui/CardResizer.tsx`) sets
  `cardWidth` in the store (in memory only: kept for the visit, reset by a reload, Rob's call). CSS clamps it to
  300 px .. window minus rail minus 480 px (`--card-user-w` -> `--card-w` in `ui/sidenav.css`; `--card-tl-w` on the
  timeline); the search and timeline chart make room. Double-click resets; arrow keys when focused.
  On the globe the card never moves the globe, search or time slider (Rob's call, 17 Oct 2026, replacing the
  16 Oct `stageInset` scheme): they stay centred beside the rail, as the legend column on the left never moves them
  either, and the card covers the space on the right. The map's left padding is the rail's width (`leftInset` in
  `src/map/MapView.tsx`), its right padding 0; flights still frame their target clear of the card (420 px on the
  right). The slider and search narrow from both ends to keep clear of the card (`.has-card` in `ui/sidenav.css`).
  Moving the globe by hand (added 17 Oct 2026, desktop only, not in tours): right-drag or Shift+drag slides the globe
  aside (store `globeOffset`, in memory; MapLibre's dragRotate and boxZoom are off). It is map padding
  (`globePadding` in `MapView.tsx`: twice the offset on one side), so zoom, rotation and flights centre on the new
  spot. A Recentre button under the search glides it back; starting a tour resets it.
- Climate gauges (added 17 Oct 2026, desktop): while a tour plays, past the title card, `src/tours/ClimateHud.tsx`
  takes the search bar's place: a thermometer (°C vs pre-industrial, −8..+2) and a coast in cross-section with the
  sea of the time (−130..+20 m; the exposed shelf glows gold), the ice in words on a tab below. The climate panel then
  leaves those three out (`ClimateFacts gauged`), keeping the MIS and the chart; they come back when the tour ends.
  Shown only where a record reaches (Rob's call, 17 Oct 2026). Before the temperature record (783 ka) back to 5.32 Ma
  the thermometer is a simple one read from LR04 δ18O: no degrees, "Cold (glacial)" / "Warm" (the MIS; "Cooler stage" for a cold stage with no more ice than today, δ18O < 3.5‰) with the ice
  words under it, gold tick at today's ice; the sea gauge shows only where sea level is known (798 ka). The panel's
  warm/cold chip moves up to it too. The "40,000 years later" intertitle drops below it.
- While a tour plays (`.app.touring`, `src/tours/tours.css`) the search bar fades out and the welcome hint goes (the
  legend and climate panel stay, Rob's call 16 Oct 2026; phones still drop the legend); on phones the menu button goes too. The `/` and Ctrl+K search shortcuts are off. The nav rail stays.

### Tour polish: next up (as of 13 Oct 2026)

Five tours are live (events-and-inventions, human-evolution, out-of-africa, ice-age-artists, civilizations),
every stop narrated. Rob chose to polish next. Backlog, roughly in his order of interest:

1. Done 13 Oct 2026: search bar, legend and welcome hint hidden during tours (see above).
2. Done 13 Oct 2026: title card and announcement. Intro videos were tried (Out of Africa) and dropped: Rob did not
   like them; the code was reverted (commit 9badd1f). Don't bring them back unless he asks.
3. Done 13 Oct 2026: Tours page and a better Tours menu (see above).
4. Done 17 Oct 2026: Events and inventions runs every event, picked up automatically (Rob chose all over a trimmed list).
5. Music: Human evolution and Out of Africa play "Apeman Suite" by Paul Lawler (keys human-evolution-v2,
   out-of-africa-v2; 6:22); Rob believes it is not
   licensed, so swap it for a licensed track (or get permission) before relying on it publicly. The other three
   share "Adrift Among Infinite Stars" (separate keys, so each can be swapped); its 6:45 loop seam is audible on
   longer tours. Levels and the dip under narration are untested by ear on phones (iOS Web Audio, the Start tour tap).
6. Rob reviews the 36 rewritten descriptions (species, cultures, civilizations; commits fd9cc09, c537034, fe91b57,
   9303da5); an edit makes that narration stale (`npm run audio:narrate -- --stale`).
7. Housekeeping: `scripts/ingest/cliopatria.test.ts` times out at 5 s on most full runs (passes with a longer
   timeout). The committed data is a full build with XRONOS (16 Oct 2026, 5,006 features); a build without the
   XRONOS export drops most culture points, so don't commit one.
   `npm run audio:upload -- --dry-run` shows any clips still to upload.

## Ice Age geography, climate strip, routes, contemporaries (added 15 Oct 2026)

- Coastlines and ice sheets of the slider's year: `npm run data:fetch:paleo` (ETOPO 2022 at 0.1° over OPeNDAP; the
  35 MB 1° grid out of Gowan et al.'s 3.7 GB PANGAEA zip by HTTP range requests; Spratt & Lisiecki 2016; LR04) then
  `npm run data:paleo` (`scripts/paleo.ts`, ~11 min) writes `public/data/paleo/` (index.json + 49 GeoJSON snapshots,
  ~0.6 MB each, loaded one at a time); rerun `npm run data:climate` after it. Committed; outside `data:build` and its
  fingerprint. Snapshots: 0–80 ka every 2.5 kyr from Gowan (topography change + grounded ice); 80–798 ka from the
  Spratt & Lisiecki sea level in 10 m steps (no ice); older none. Only ocean-connected sea counts (flood fill from
  `SEEDS`: open ocean plus Mediterranean, Black Sea, Baltic, Red Sea; never the Caspian). Land then is drawn under
  the Natural Earth land (`paleo-land`, tucked 20 m under today's coast), sea then over it (`paleo-sea`), ice on top
  (`paleo-ice`; `ice` colour per theme in `BASEMAP_THEMES`). `src/map/paleo.ts` picks the snapshot; the slider shows
  "Sea level −120 m". Settings toggle (store `paleo`, remembered).
- Climate popover (`src/ui/ClimatePopover.tsx`, data in `src/time/climate.ts`): the "MIS 2 · Sea level −120 m" badge
  under the year opens it following the slider. (The climate strip under the slider was removed 17 Oct 2026 to make
  the play bar shorter, Rob's call: the panel and the tour gauges show the same.) It shows global
  temperature (Osman 2021 0–24 ka, Friedrich 2016 model 24–783 ka, both vs pre-industrial; they agree within 0.5 °C at
  the join), sea level (Gowan 0–80 ka, Spratt & Lisiecki beyond with 95% range; the two disagree at 80 ka, −10 vs
  −33 m), the MIS (1–104, then G1…TG6; even = cold; a few `STAGE_NOTES`), and a chart of the cycles around it.
  Data: `npm run data:climate` (`scripts/climate.ts`, seconds; reads public/data/paleo/index.json for Gowan's sea
  level). Climate panel: a Settings option (store `climatePanel`, remembered, on by default; not offered on small
  screens) keeps the same details (`ClimateFacts` in `ClimatePopover.tsx`) open under the legend, following the
  slider (`src/ui/ClimatePanel.tsx`). The legend and the panel stay on during tours (desktop).
  Left column (`src/ui/Legend.tsx`): legend, climate panel, Ancient DNA panel (with the DNA layer; moved under the climate panel 17 Oct 2026), each a Settings
  option, all on by default; the legend's is store `legendPanel` (off: the panels start at the corner, and on phones
  no legend at all). The corner toggle hides and shows the whole column (Rob's call, 16 Oct 2026). Snyder 2016 and Clark 2024 (longer temperature records) were not openly downloadable here.
- Migration routes (`src/routes/`): five Out of Africa routes joining existing H. sapiens sites (dated at the middle
  of each site's range); `via` points only shape the line. Lines grow with the slider, arrowhead while growing,
  hidden after `until` (end of the Ice Age for these). Tap a route for a popup (name, description, source). Settings
  toggle (store `routes`). `routes.test.ts` checks every site exists in the committed features and dates run forward.
  Added 17 Oct 2026: farming into Europe (Danube and Mediterranean, from Çatalhöyük over XRONOS Starčevo, Linear
  Pottery and Cardial points, ids `entity@x:slug`; until 4000 BCE), the Austronesian expansion (Fengbitou to Nukuleka,
  via the Marianas), and the Bantu eastern stream (Shum Laka to Katuruka); the last two stay up to the end of the
  timeline. Not drawn, because the globe ends at 1 CE (Rob's call: stop there): the Polynesian Triangle (Hawaiʻi,
  Rapa Nui, Aotearoa, 700–1300 CE; anchor sites with Wikipedia dates were found: Faʻahia, Hane, Ka Lae, Anakena,
  Wairau Bar) and the Bantu route on to South Africa (Lydenburg Heads, Broederstroom). The Bantu western stream has no
  dated site with a source (nothing in Angola or Gabon on Wikipedia).
- "Alive at the same time" chips on species cards and species pages (`src/ui/contemporaries.ts`).
- `data:paleo` deletes and rewrites `public/data/paleo/`: restart a running Vite dev server afterwards (it serves the
  folder's files as missing until then).
- Fixed 16 Oct 2026: the straight-edged wedge over western Europe (Norway to Spain, at some zooms) came from the
  basemap, not these layers. Natural Earth's Eurasia, Wrangel Island, a Fiji sliver and Antarctica were joined across
  ±180° by edges that run right round the world, which crossed Norway's coast (and Antarctica's own) and broke the
  fill's triangulation. `npx tsx scripts/basemap.ts` splits them at the antimeridian and closes Antarctica through the
  pole (rewrites `public/data/basemap/land.geojson` in place; rerunning changes nothing). Run it again if the
  basemap is ever replaced. The thin curved line across the southern half was probably Antarctica's; not rechecked.

## Interbreeding (added 17 Oct 2026)

- `src/geneflow/geneflow.ts`: seven hand-picked episodes (like the routes, in the app): an erectus-like lineage into
  Denisovans (~350 ka, Hexian -> Harbin), early modern humans into Neanderthals (~250 ka, Misliya -> Apidima 2; and
  120–100 ka, Qafzeh -> Tabun), Denny (~90 ka, a ring at Denisova Cave), Neanderthals into modern humans (65–47 ka,
  Shanidar -> Manot), Denisovans into the ancestors of Papuans and Australians (54–44 ka, Tam Ngu Hao 2 -> Tabon),
  Oase (~40 ka, Vindija -> Oase). Each has a date window, a description written from the pinned Wikipedia source, and
  a link `{ from, to }` (donor site to receiving site) or `{ at }`. The sites only stand for the two populations
  (the popup says so). Shown while the slider is within half a slider step of the window (`shownAt` in
  `geometry.ts`), so each catches at least one stop; `geneflow.test.ts` checks that and that every site exists.
- Drawn in `MapView.tsx` (`gene-flow-*` layers, pink dashed line with the routes' arrowhead at the receiving end;
  the ring is 22 px so a tap on it misses the site marker inside). Tap for a popup. Settings toggle (store
  `geneFlow`, on by default, remembered). Sources listed in the Sources panel.
- Possible next: draw the episodes on the family tree too (ideas.md).
- Wikipedia's *Neanderthal genetics* calls the Oase genome Oase 2; it was Oase 1 (Fu et al. 2015). The description
  avoids naming the jaw.

## Ancient DNA layer (added 16 Oct 2026)

- AADR v66.p1 (CC0, Harvard Dataverse): `npm run data:dna` (pinned file id + MD5 in `scripts/fetch/aadr.ts`; downloads
  only when missing) then `scripts/ingest/aadr.ts` -> `public/data/dna.json` (committed, ~1.4 MB, outside
  `data:build`; loaded only when the layer is on). Rules and citation in the README. Shared types in `src/dna/types.ts`.
- Client in `src/dna/`: Settings toggle (store `dna`, on by default since 16 Oct 2026 (Rob: every left panel on by default), remembered), colour mode in the legend's DNA row
  (`dnaColour`: y | mt | plain), `DnaCard.tsx` opened by `dnaSite` (shown only while no other card is open; a tap opens
  it only when a DNA site is nearer than any other marker). Colours: three families per mode
  (`haplogroups.ts`; validated colour-blind-safe all-pairs, which caps a map at three) plus grey "other" and hollow
  "not known". Map layers `dna-sites` / `dna-selected` sit above territories, under the other markers.
- Legend section (`DnaLegend.tsx`, redone 16 Oct 2026 for non-experts): helix badge (`DnaIcon.tsx`, also on the site
  card), sites-now count, an "i" button whose tooltip says what the dots are (hover, focus or tap), switch labelled Father's line / Mother's line / Sites only, a key with a
  few plain words per colour (`short` in `haplogroups.ts`), and a "What are father's and mother's lines?" explainer.
  No Hide button: the layer is switched only in Settings (Rob's call).
  On desktop it is a panel of its own in the legend's column, under the climate panel (`.dna-panel`; the column
  in index.css may be as tall as the window, nothing scrolling until the panels together need more, then it shrinks the legend first, then the climate panel, the DNA panel last, so it shows in full unless the
  window is too short); on small screens it stays at the foot of the compact legend.
- Culture links: `aadr` rows in `culture-labels.csv` (exact "_"-part of AADR's group label, suffixes like `-o` stripped;
  dropped if the date misses the culture's span by 500+ years). Yamnaya links 207 genomes at 97 sites.
- Culture cards and pages show "N ancient genomes from M sites · Show on the globe" (`DnaCultureLink.tsx`, counts
  from the small `public/data/dna-cultures.json`, written by the ingest); while a culture card is open and the layer
  is on, its genome sites are ringed in the culture colour (`dna-culture` layer).
- Not yet checked on phones.

## Family tree (added 17 Oct 2026)

- Species page switch List / Family tree (remembered in localStorage `species-layout`; the era chips are list-only).
  `src/browse/FamilyTree.tsx` draws each species as a bar over its span, joined at branching points; time runs on
  the fourth root of years ago (the slider's scale left the Pliocene branches too cramped). A name opens the
  species, a bar shows it on the globe (`focusEntity`), a dot opens the branching point's notes (side panel on
  desktop, bottom sheet under 1000 px).
- The tree is in `src/browse/phylogeny.ts` (in the app, not the data pipeline). No single study places all 26
  species, so it is built point by point (Rob's choice): each clade has `support` (supported | debated |
  unresolved, drawn solid / dashed / dotted; unresolved = polytomy), a plain-words `note` and `refs` into `REFS`.
  Branching points carry no split dates (drawn a step left of their oldest member). The citations were written
  from recall: check them against the papers. `phylogeny.test.ts` checks every species is placed exactly once.
  A new species must be added to the tree (the test fails until it is).

## Star background (`src/map/SpaceBackground.tsx`, added to 17 Oct 2026)

- Shooting stars: one every 25–60 s (50–100 s in a tour; `METEOR_GAP`), under a second, across an upper corner heading
  away from the globe; one in five brighter with a fading trail. Own canvas, nothing runs between them.
- Climate tint: two glow layers (`.space-tint.cold` / `.warm` in index.css) faded in by the LR04 δ18O of the slider's
  year (`useSkyTint`): icy blue in glacials, rose-amber in warm spells, neutral today and before the record.
- Drift: the star canvases reach 40 px past each edge (`SKY_MARGIN`) and slide a little against the globe's
  turning, then settle back (`--sky-x` / `--sky-y`, set in `MapView.tsx`).
- Shooting stars and drift are off for reduced motion.

## Civilization regions

- Every civilization carries `region`, computed in `scripts/build-data.ts` with `scripts/lib/regions.ts`: grid points
  inside each Cliopatria territory map are placed by country-coder in a UN M49 subregion (renamed and merged for the
  ancient world; Iran and Afghanistan go with Central Asia), weighted by area and years covered. Groups combine
  their members. The build lists civilizations with under half their territory in one region (now Greek Colonies,
  Macedonian Empire, Roman Empire).
- A `region` in `entities.yaml` overrides the computed one and must be one of the names in `REGIONS`.
- Used by the Civilizations page (`#/civilizations`, `src/browse/`) for region chips and sections.

## Pictures

- Species: 4:3, 640x477 WebP (`public/images/species/`); civilizations and culture stage pictures: 4:3, 1200x900 WebP
  (`public/images/civilisations/`, `public/images/cultures/`). All shown in a 4:3 frame; events: square (see above). Every picture needs
  an `image_credit`. Civilization pictures are overlaid by id at the end of `entities.yaml`.
- Extra pictures: `extra_images` on an event (events.yaml) or a species/culture/civilization (entities.yaml): an
  ordered list of `{ url, credit, caption?, at? }` after the main `image_url`, which stays the display picture
  (validator-checked: file exists, credit, `at` increasing). For now shown only while a tour holds on that card:
  `at` = seconds after the card opens (when the narration starts) to switch; untimed ones share the hold evenly
  (`src/tours/tourPicture.ts`). Shown whole (contain), fading in. In non-tour mode, small arrow buttons and dot indicators
  (`src/ui/PictureNav.tsx`) let the user manually rotate through the pictures whenever an item has more than 1 picture.
  Tapping the card's picture (or its expand button; on phones the compact card's picture) opens the full-screen viewer
  (`src/ui/PictureViewer.tsx`, store `pictureViewer`): the picture whole over a blurred copy of itself, caption and credit.
  It steps by arrows/dots/keys/swipes. In a tour it follows the narration's picture timing with a slow drift
  until the viewer steps by hand (then the pictures stay put for that stop; the narration and tour are untouched),
  carries a small bar (previous picture, pause, next picture), and stays on from stop to stop (hidden while the globe
  travels) until closed; Escape closes only the viewer.
  On the globe (desktop) the globe itself shrinks into a round window at the viewer's top left (`miniGlobe` in
  `src/map/MapView.tsx`, store `miniGlobe`, `MINI_GLOBE` in config): the same map, CSS-scaled and clipped to a circle
  above the viewer (no second WebGL map), following the camera; a tap on its ring goes back to the globe.
  hominin-divergence: Didier Descouens' Commons photo of the Toumaï cranium (replaced Rob's untraceable chad.png),
  then the Orrorin femur cast (Jonathan Chen) to match the narration's second half. Every other event
  (14 Oct 2026): two real photos from Wikimedia Commons (free licences only; no NC/ND), 900 px WebP in
  `public/images/events/extra/<event id>-<n>.webp`; `credit` is "Author, licence, via Wikimedia Commons" and
  `source` the Commons file page (the card's credit links to it). Weak spots Rob accepted: Lomekwi (no tool photos on
  Commons; Kenyanthropus skull and Lake Turkana), fire (Qesem Cave bones and Zhoukoudian; nothing from Wonderwerk),
  Iron Age (Tutankhamun's meteoric-iron dagger, captioned as such). Search from Rob's machine (the cloud workspace's
  shared address gets 429s from upload.wikimedia.org).
  Tour stops (14 Oct 2026): every species, culture and civilization used in a tour got two Commons photos the same
  way, in `public/images/extra/<entity id>-<n>.webp` (entities.yaml). Weak spots Rob accepted: Middle Stone Age (no
  usable Pinnacle Point photo), Neanderthal (a model of the Sima de los Huesos shaft), Châtelperronian (paper figure
  plates), Phoenicia (a drawing of an Assyrian relief), Maurya (Sarnath pillar stumps). Skip Commons files whose only
  author/source is a news site (licence doubtful).
- Fallbacks on the info card: a civilization without a picture shows its group's ("Shows Ancient Egypt as a whole");
  cultures (and anything listed) show a shared stage picture from `data/curated/picture-groups.yaml`
  (`public/images/cultures/`). The validator warns while a stage picture file is missing; the card then shows none.

## ROAD bulk import (`scripts/ingest/road.ts`)

About 327 hominin fossil site points (17 species) plus 55 ROAD clusters shown on nearby existing points, from ROAD (CC BY-SA 4.0; export 12 Oct 2026). The raw export
(`data/raw/road/`, from `Rscript scripts/fetch/road.R`) exists only on Rob's Linux machine, so `npm run data:ingest:road`
writes the committed, generated `data/curated/road/sites.csv` and the build reads that. Re-run the ingest after editing
`road/species-labels.csv` or entity spans. Rules: explicit taxon list (no cf./aff./sp./"or"); ROAD age brackets are
clipped to the species span from `entities.yaml` and sites outside it dropped (`data/build/road-dropped.csv`: 31 span
misses, mostly ROAD mislabels such as H. sapiens at Swartkrans, plus 35 without ages); cultures come only from
assemblages in the same locality and geological layer. Localities of one species within 1 km are merged into one
point (label shares the common prefix: "Koobi Fora Area 123, 116, 130"); in the build, a ROAD point within 2 km of a curated
or XRONOS point of the same species is not drawn but listed on that point's card (`also_recorded`, " | "-separated) and
its cultures merged in. The roadDB publications step hangs (it was killed); refs come from
the dates table. ROAD culture names link to culture entities through the `road` rows of `culture-labels.csv` (resolved at build time for
the links on cards; at ingest time for culture sites, so re-run the ingest after changing them).

ROAD culture sites (`road/culture-sites.csv`, added 12 Oct 2026): 959 sites from ROAD assemblages, clipped to each culture's
span, 1 km merge, 2 km attach (as for species). Took Oldowan 8 -> 41, Acheulean 11 -> 134, MSA 7 -> 174, Mousterian 6 ->
237 sites; new cultures Micoquian, Szeletian, Châtelperronian (Neanderthal-toolmakers stage picture) and Epigravettian
(Ice Age stage picture), spans from Wikipedia (revisions in entities.yaml comments), descriptions written from Wikipedia;
Rob is providing pictures. Generic ROAD periods ("Middle Paleolithic (Eurasia)") are not mapped. Further candidates in
ROAD: Proto-Aurignacian 30, Robberg 27, Dabban 25, Lupemban 23, Fauresmith 22, Clactonian 20, Aterian (now under MSA).

## XRONOS bulk import (`scripts/ingest/xronos.ts`)

About 2,530 points: 32 cultures plus H. sapiens. Rules:

- Labels map to cultures only through `culture-labels.csv` (explicit list, no fuzzy matching). Each culture needs a
  sourced range in `culture-windows.csv`; dates outside range ± margin are dropped and site windows are clipped to it.
- Calibration: IntCal20 in-house (`scripts/lib/calibrate.ts`), 95% range plus median.
- Dropped: dates whose duplicate records carry conflicting culture labels; the same measurement under two lab
  numbers; whole-degree coordinates; sites whose point lies clearly in another country than the record's
  (`scripts/lib/countries.ts`, country-coder with ~25 km tolerance; country labels normalised from ISO3/names/regions)
  or far from the rest of their country's dates; points within 2 km of a curated site of the same entity. Same-culture
  sites within 1 km are merged.
- `data/curated/xronos-site-fixes.csv`: hand-checked exceptions to the country check, matched on site, country and
  XRONOS coordinates. `move` = corrected from a Wikidata item (point gets `coord_source wikidata:Q…#P625`; most were
  corrupted longitudes whose latitude matched Wikidata); `keep` = coordinates confirmed, country code wrong.
  25 sites remain dropped (`data/build/xronos-dropped-coords.csv`): unidentifiable or ambiguous (Almonda, Zemunica,
  Wang, Sabha, small Moldovan/Ukrainian Tripolye sites; since 12 Oct also Mezzena, Bochow, Žalany, Oueili and
  three Capsian sites), not yet checked by hand.
- Outliers: at culture sites with 4+ dates, an end date at least 500 years from its nearest neighbour with no overlap
  in 95% ranges is set aside (at most one per end, at most a quarter of the site's dates). 136 are set aside; the
  point's date text names them and `data/build/xronos-set-aside.csv` lists them for review.
- Dates on human remains also become H. sapiens points (60,000–10,000 BCE).
- Each point links its XRONOS record and carries lab numbers, all publications (page cites merged) and the
## Images & Illustration Queue

- **Conventions**:
  - **Events**: 1000×1000 square WebP (quality 85) in `public/images/events/`. Title is painted directly into the upper scene in warm cream serif lettering with subtle drop shadow.
  - **Cultures & Civilizations**: 1200×900 (4:3) WebP in `public/images/cultures/` or `public/images/civilisations/`, plus a 600×450 companion (`<name>-600.webp`). NO painted lettering.
  - **Authentic Museum Galleries (`extra_images`)**: High-res artifact photos from Wikimedia Commons (CC / Public Domain) in `public/images/extra/<id>-<n>.webp` (max dimension 1200px, quality 85). Every item needs `url`, `credit`, `caption`, and `source` (https URL).
- **Check the Queue**: Run `npm run images:check` at any time to inspect placeholder groups and missing artwork.
- **Pending AI Illustrations (6 Civilization Groups)**:
  On 17 Oct 2026, oversized picture-groups were split and 6 new groups were assigned temporary placeholder cards pending AI image generation (e.g. after API quota reset on Tuesday 20 Oct 2026):
  1. `imperial-magadha` -> `public/images/civilisations/imperial-magadha.webp` & `-600.webp`
  2. `deccan-kingdoms` -> `public/images/civilisations/deccan-kingdoms.webp` & `-600.webp`
  3. `urartu-and-caucasus` -> `public/images/civilisations/urartu-and-caucasus.webp` & `-600.webp`
  4. `hellenistic-anatolian-kingdoms` -> `public/images/civilisations/hellenistic-anatolia.webp` & `-600.webp`
  5. `ptolemaic-egypt` -> `public/images/civilisations/ptolemaic-egypt.webp` & `-600.webp`
  6. `eastern-hellenistic` -> `public/images/civilisations/eastern-hellenistic.webp` & `-600.webp`
  Detailed ready-to-copy generation prompts are saved in [`docs/civilization-placeholders.md`](docs/civilization-placeholders.md). Once generated, overwrite the placeholder WebP files and their `-600.webp` counterparts, then run `npm run data:build` and commit.

## Possible next steps

- Cultures added 7 Oct 2026: Starčevo–Körös–Criș, Michelsberg, Únětice, Cucuteni–Trypillia, Vinča, Ertebølle,
  Lengyel, Chasséen, Globular Amphora, Baden. Only clean single-culture labels are mapped (no "?", mixed, proto-/pre-
  or transitional labels such as Lengyel–Pólgar, Epi-Lengyel, Préchasséen, Proto-Únětice).
- Cultures added 12 Oct 2026 (same clean-label rule): Epigravettian, Azilian, Maglemosian, Capsian, Halaf, Ubaid,
  Hinkelstein/Grossgartach (one entity), Stichbandkeramik, Rössen. Not mapped: Tardigravettian, Romanellian,
  Federmesser/Azilian, Neolithic of Capsian Tradition, Libyco-Capsian, Pre-/Proto-Halaf, Planig-Friedberg.
- Yamnaya added 16 Oct 2026 (span 3300–2600 BCE, Wikipedia revision in entities.yaml; Copper and Bronze Age stage
  picture): 22 XRONOS sites from Hungary and Bulgaria to the southern Urals ("Pit Grave" and "Yamnaya" labels; the
  outlier label `Yamnaya_Bulgaria_outlier` is not mapped). Ozera (UA) is dropped by the country check (its XRONOS
  coordinates lie in Serbia); not yet checked by hand. AADR: only the exact `Yamnaya` part (not ProtoYamnaya or
  LateYamnaya).
- Afanasievo, Sintashta and Andronovo added 16 Oct 2026 for the steppe tour (spans from Wikipedia, revisions in
  entities.yaml): few XRONOS dates, all on genome-sampled burials (Afanasievo 2 sites, Sintashta 4, Andronovo 1:
  Kytmanovo). No pictures yet (Rob to provide). The steppe tour also rewrote Yamnaya, Corded Ware, Bell Beaker and
  Únětice as narration-length paragraphs (Rob to review).
- Azilian window follows Wikipedia (12,500–10,000 BP), which looks like uncalibrated radiocarbon years: 143 of 310
  Azilian dates fall before it. A sourced calibrated range would bring in the Early Azilian.
- The conflicting-label rule keys on lab number alone, so unrelated dates that share a lab number (MC-499, Ly-1392) or
  carry a wrong label in one compilation (KI-4143/4144 Erfurt, GrN-9376 Široké Třebčice: Corded Ware dated, also
  labelled Stichbandkeramik) are dropped. Possible fix: only count a conflict when the date falls inside more than one
  claimed culture's window.
- Still possible from XRONOS: Kebaran (scattered dates; Geometric Kebaran separate), Urnfield (needs Ha A/B phase
  codes), Tumulus (small).
- Work through partial and recall rows.
- Review `xronos-set-aside.csv`.
- Optional "dated activity" layer from p3k14c (in `data/raw`, but it has no culture labels).

## Environment (when working through Rob's linked computer)

- Node needs `NODE_USE_ENV_PROXY=1` for network access.
- Run long jobs in the foreground with a timeout; background jobs die when the call returns.
- The Wikidata client caches lookups in `data/raw/wikidata/cache` and never caches error responses.
