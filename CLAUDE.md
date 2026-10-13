# Ancestor Atlas: notes for agents

Read README.md first (pipeline, data files, XRONOS, provenance rules). This file adds the working agreements and
current state that the README does not cover. Data state as of 12 Oct 2026.

## Working agreements

- Commit straight to `main`. Check `git status` first and stage only your own files: Rob often has uncommitted work
  (README, `src/` UI, `src/index.css`, images). Never overwrite or sweep up his changes.
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

- 199 rows: 174 sourced, 21 partial, 4 recall (Lokalalei, Kokiselei, Majuangou, Dent).
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

- 29 major events (category `event`), from Rob's list and additions, Oct 2026. Each has a best `year` (optional `start_year`/`end_year`
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
  Listen button (card and event page, `src/audio/`) and by tours, where the clip's length sets the hold.
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
  turn mode), open the card, hold (default from description length, 8–22 s), next. Touching the globe or card,
  or moving the slider, pauses; Play ends the tour. Keys: arrows step stops, Space pauses, Escape ends.
- `TourBar.tsx`: the Tours button and menu, and the bar that replaces the transport buttons. Link: `#/tour/<id>`.
- Music: `music: { src, credit }` on a tour; `npm run audio:music -- <track> <tour id> "<credit>"` encodes (stereo
  128 kbps, -16 LUFS), sets it in tours.ts and prints the upload command (key `music/tours/<id>-v<n>.mp3`).
  `src/audio/music.ts` loops it through Web Audio (needs the bucket's CORS, which allows `*`), fades, and dips it under
  narration (levels at the top of that file); a music on/off button on the tour bar (remembered).
- Sound needs a tap: the Tours menu primes audio; a tour opened from a link waits behind a "Start tour" button (`gate`).
- A stop may set `site` (a feature id) to frame and open the card on one place. Tours can mix categories.
- Tours (Oct 2026): Events and inventions (all 29 events; a draft for Rob to trim); Human evolution (13 species + 2
  events); Out of Africa (9); Ice Age artists and toolmakers (14); Rise and fall of civilizations (15 civilizations +
  4 events, Sumer to Rome). Every stop narrated; 36 species/culture/civilization descriptions were rewritten as
  narration-length paragraphs for them (Rob to review). All tours reuse one music track for now.
- Tours page `#/tours` (`ToursPage.tsx`, in the rail and phone tabs): a card per tour (cover of four stop pictures,
  blurb, span, stops, running time, narrated/music), Watch, and the stop list to start from any stop
  (`startTour(id, { index })`). The time bar's Tours menu shows a thumbnail and running time, and links to the page.
  Running time and covers come from `src/tours/summary.ts`.
- Title card before stop 1 (`TitleCard.tsx`, `tour.intro` in the store): title, blurb, length, while the globe turns to
  the first stop and `announcement` (ElevenLabs reading `announcementText`: title + blurb; `npm run audio:narrate --
  --announce <id>|all`, key `narration/tours/<id>-v<n>.mp3`) plays. Skip intro / Next / → skip it; starting from a
  later stop leaves it out. Rob is trying it without video first, then decides on per-tour intro videos.
- While a tour plays (`.app.touring`, `src/tours/tours.css`) the search bar and legend fade out and the welcome hint
  goes; on phones the menu button goes too. The `/` and Ctrl+K search shortcuts are off. The nav rail stays.

### Tour polish: next up (as of 13 Oct 2026)

Five tours are live (events-and-inventions, human-evolution, out-of-africa, ice-age-artists, civilizations),
every stop narrated. Rob chose to polish next. Backlog, roughly in his order of interest:

1. Done 13 Oct 2026: search bar, legend and welcome hint hidden during tours (see above).
2. Title card and announcement done 13 Oct 2026 (uploaded? `npm run audio:upload -- --dry-run`). Intro video per tour:
   on hold until Rob has watched the title card. Plan if wanted: video first (music off, skipped on a repeat
   viewing, remembered in the browser), then the title card leads back into the globe; plays inline on iOS.
3. Done 13 Oct 2026: Tours page and a better Tours menu (see above).
4. Events and inventions still runs all 29 events: Rob to pick the stops to keep.
5. Music: every tour reuses one track (separate keys, so each can be swapped); the 6:45 loop seam is audible on
   longer tours. Levels and the dip under narration are untested by ear on phones (iOS Web Audio, the Start tour tap).
6. Rob reviews the 36 rewritten descriptions (species, cultures, civilizations; commits fd9cc09, c537034, fe91b57,
   9303da5); an edit makes that narration stale (`npm run audio:narrate -- --stale`).
7. Housekeeping: `scripts/ingest/cliopatria.test.ts` times out at 5 s on most full runs (passes with a longer
   timeout); many later cultures have no features in the committed data (needs a full build on the XRONOS machine).
   `npm run audio:upload -- --dry-run` shows any clips still to upload.

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
  compilations the dates came from.

## Possible next steps

- Cultures added 7 Oct 2026: Starčevo–Körös–Criș, Michelsberg, Únětice, Cucuteni–Trypillia, Vinča, Ertebølle,
  Lengyel, Chasséen, Globular Amphora, Baden. Only clean single-culture labels are mapped (no "?", mixed, proto-/pre-
  or transitional labels such as Lengyel–Pólgar, Epi-Lengyel, Préchasséen, Proto-Únětice).
- Cultures added 12 Oct 2026 (same clean-label rule): Epigravettian, Azilian, Maglemosian, Capsian, Halaf, Ubaid,
  Hinkelstein/Grossgartach (one entity), Stichbandkeramik, Rössen. Not mapped: Tardigravettian, Romanellian,
  Federmesser/Azilian, Neolithic of Capsian Tradition, Libyco-Capsian, Pre-/Proto-Halaf, Planig-Friedberg.
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
