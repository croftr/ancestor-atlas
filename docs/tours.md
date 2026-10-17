# Making a guided tour

How to add a tour from start to finish: choosing stops, writing the text, narration, music, upload
and release. The code lives in `src/tours/` (data in `tours.ts`, playback in `TourPlayer.tsx`, controls
in `TourBar.tsx`) and `src/audio/` (narration and music players, Listen button).

## How tours work

- A tour is an entry in `TOURS` in `src/tours/tours.ts`: an id, title, one-sentence blurb, optional
  `layers` (categories shown during the tour; the viewer's own come back after), optional `music`, and
  a list of `stops`, oldest first.
- Each stop names an entity (event, species, culture or civilization). Optional: `year` (where the
  slider stops; default the entity's best year, an event's `year`), `site` (a feature id to frame and
  open the card on; default all the entity's features on the map then), `hold` (seconds; default the
  narration's length).
- Where viewers find tours: the Tours page (`#/tours`, `src/tours/ToursPage.tsx`; in the side rail and the
  phone tabs) shows each tour as a card, with the blurb, running time and a list of stops to start from;
  the Tours menu on the time bar is the quick way in. Both take their pictures from the stops (the
  page's cover: four spread through the tour; the menu: the first), so a new tour needs no picture of
  its own.
- A tour opens with a title card (`TitleCard.tsx`): the title, blurb and length over the globe as it
  turns to the first stop, while the tour's `announcement` reads the title aloud (the blurb is only shown)
  (`announcementText` in `tours.ts`) 1.5 s after the card appears. The music comes in as the
  announcement ends, and the card stays 2 s more (without an announcement: 6 s, music after 3 s;
  timings at the top of `TourPlayer.tsx`).
  "Skip intro", Next or → skip it; starting from a later stop on the Tours page leaves it out.
- At each stop the slider plays forward to the year, the globe turns to the place, the card opens and
  the narration plays; the card stays up until the narration ends plus 1.5 s (reading time if there
  is none), then on to the next stop.
- **One text per entity.** The card shows the entity's `description`, and the narration reads that same
  description, in every tour and outside tours (the Listen button). If a description is too thin to
  narrate, rewrite the description itself; there is no per-tour text.
- After the last stop comes the epilogue: the globe redraws the journey as a thread through every stop while
  an end card shows the stops, the span and the tour's `closing` line (one or two sentences in `tours.ts`), read
  aloud once the thread is drawn; the music plays on, then fades. Give a new tour a `closing` line and narrate it:
  `npm run audio:narrate -- --closing <tour id>` (about 100–180 characters).
- Link to a tour: `#/tour/<id>` (waits for a tap, since browsers only play sound after one).

## Before you start (once)

- `.env.local` in the project root (gitignored) with `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID`
  (optional `ELEVENLABS_MODEL`, default `eleven_multilingual_v2`). The voice is a Voice Library voice,
  which the API only allows on a paid ElevenLabs plan. Keep the same voice for every clip.
- ffmpeg installed. Node needs `NODE_USE_ENV_PROXY=1` for network access on Rob's linked machine (the
  npm scripts set it).
- Uploading needs Rob's AWS login in `~/.aws` (credentials exported in another terminal tab are not
  visible to other shells). Without it, everything else still works and Rob uploads at the end.
- Budget: narration costs ElevenLabs credits at about one per character of description. A tour of new
  stops costs 5,000–8,000; stops that are already narrated cost nothing. Check what is left on the
  plan (ElevenLabs: Subscription) before a big batch; October 2026 used about 28,700.

## Steps

### 1. Choose the stops

- Aim for 9–19 stops in date order, about 30–40 s each with narration.
- Prefer entities that are already narrated where they fit the story (all events are; so are the
  species and cultures in existing tours): free, and the voice is consistent.
- Every stop must be on the globe at its year. The data is in `public/data/entities.json` and
  `public/data/features.geojson`. Since the full rebuild of 16 Oct 2026 the Neolithic and later cultures
  (Ubaid, Halaf, Vinča, …) have features too, so they can be stops.
- For species and cultures with many sites, pick a `site` (the type site or the famous one) and a
  `year` inside that site's range; snap years to the slider (100,000-year steps before 1 Ma, 10,000 to
  100 ka, 1,000 to 10 ka, 100 to 3000 BCE, 10 after) and write them as astronomical years
  (`-1_799_999` is 1,800,000 BCE).
- For civilizations, pick a `year` when the territory is shown at its height; leave `site` unset.

### 2. Write or rewrite descriptions

For each new stop whose description is short (under about 400 characters) or reads like a list:

- 430–560 characters, one paragraph, written to be heard: whole sentences, no lists or brackets.
- Say numbers as they are spoken: "Ramesses the Second", not "Ramesses II"; "the ninth century BCE".
- Lead with the place and the find or the moment, then what it tells us. Civilizations cover both the
  rise and the end. Hedge what is debated ("may have", "many researchers").
- Don't contradict the dates on the card (the entity's span); avoid exact spans if they differ.
- Check facts against the entity's Wikipedia article. Rob reviews new text after release.

Put them in a JSON file and apply it (entities.yaml or events.yaml, plus public/data, without a build):

```sh
cat > temp/texts.json <<'EOF'
{ "clovis": "Around 13,000 years ago a distinctive way of making stone spear points…" }
EOF
npm run data:describe -- temp/texts.json
```

The entity needs an entry with a one-line `description:` in `data/curated/entities.yaml` (or
`events.yaml`). Changing an already narrated description makes its narration stale (step 5, `--stale`).

### 3. Add the tour

Append to `TOURS` in `src/tours/tours.ts`:

```ts
{
  id: "out-of-africa",
  title: "Out of Africa",
  blurb: "How our ancestors left Africa and reached every continent…",
  layers: ["species", "culture", "event"],
  stops: [
    { entity: "out-of-africa-dmanisi" },
    { entity: "homo-sapiens", year: -309_999, site: "homo-sapiens@1" },
    { entity: "clovis", year: -10_999, site: "clovis@2" },
  ],
},
```

Then `npx vitest run src/tours`: it checks every stop exists, is on the globe at its year (and its site
too), that the stops run oldest first, and that the music key follows the convention.

### 4. Narration

```sh
npm run audio:narrate -- --tour <tour id>          # shows the stops without narration and the character cost
npm run audio:narrate -- --tour <tour id> --yes    # generate them
```

For each stop without narration it generates speech from the description (ElevenLabs), normalises it
(-16 LUFS, mono 96 kbps MP3), uploads it if AWS is logged in, and sets `narration` in the YAML and in
public/data. Speech is cached in `data/build/audio/tts` by text, so a re-run never pays twice. If the
credit runs out mid-batch it stops, keeps what is done, and the same command finishes the rest later.

Other forms: `npm run audio:narrate -- <id> [<id>…]`, `--stale` (re-record changed descriptions),
`--missing` (events without narration), `<id> --file <mp3>` (a recording made by hand),
`--no-upload`, `--credit "<text>"`.

The title card's announcement (the title only, a few dozen characters):

```sh
npm run audio:narrate -- --announce <tour id>      # or --announce all: every tour missing one or out of date
```

It is read slowly, as a title: the script sends "<title> [slowly]" to ElevenLabs' `eleven_v3` model
(the narration keeps its own model), and cuts the take 0.5 s after the speech ends (v3 sometimes adds a
stray sound after it). It sets `announcement` on the tour in `tours.ts`. Changing a tour's title makes it stale: the
tour test warns, and `--stale` re-records it with the descriptions.

### 5. Music

```sh
npm run audio:music -- temp/<track>.mp3 <tour id> 'Music: "<title>" by <artist> (<site>), <licence>'
```

Normalises to -16 LUFS (stereo 128 kbps), sets `music` on the tour in `tours.ts` and writes
`data/build/audio/music/tours/<tour id>-v<n>.mp3`. The credit is shown on the tour bar; check the
licence allows the use and what attribution it asks for. Every tour so far uses Scott Buckley's
"Adrift Among Infinite Stars" (`temp/tour-music.mp3`, CC BY 4.0) under its own key, so each can be
replaced alone. The mix (music level, dip under narration) is set at the top of `src/audio/music.ts`.

### 6. Check, commit, upload

On the tour's own branch (see CLAUDE.md's working agreements); merge and push when Rob asks.

```sh
npx tsx scripts/check-data-fresh.ts && npx tsx scripts/validate-data.ts && npx tsc --noEmit && npx vitest run
git add data/curated/entities.yaml data/curated/events.yaml public/data src/tours/tours.ts
git commit
npm run audio:upload        # Rob, with his AWS login: uploads every referenced clip missing from the bucket
```

`audio:upload` checks each key over the bucket's public URL, so it is safe to run any time;
`--dry-run` lists what it would upload. Until the clips are uploaded the tour plays silently (holds
fall back to reading time). Then open `#/tour/<id>` and watch it through.

## Bucket keys

Bucket `robs-ancestors-atlas` (eu-west-2), served with a year-long cache, so **a key is never
overwritten**: a new recording gets the next version.

| What | Key |
|---|---|
| Narration | `narration/<events\|species\|cultures\|civilizations>/<entity id>-v<n>.mp3` |
| Tour announcement | `narration/tours/<tour id>-v<n>.mp3` |
| Tour music | `music/tours/<tour id>-v<n>.mp3` |
| Event video | `events/<name>.mp4` (or a YouTube link) |

The validator enforces the narration keys; the tour test enforces the announcement and music keys.

## Gotchas

- Don't run a full `npm run data:build` and commit its public/data on this machine: it drops the XRONOS
  sites. `data:describe` and `audio:narrate` patch only what they change, in the order a real build
  writes it, and update `build-meta.json` so `npm run build` accepts it.
- `data/build/` and `temp/` are gitignored: the encoded clips live there until uploaded. Clips made on
  another machine can't be uploaded from this one.
- If a description changes after it was narrated, the validator warns; `npm run audio:narrate -- --stale`
  re-records those (new versions), then `npm run audio:upload`.
- Testing in headless Chrome: run it with `--mute-audio` and close it afterwards; otherwise tour audio
  plays through Rob's speakers.
