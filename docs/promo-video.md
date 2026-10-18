# Promo video (v2): script and shot list

Script approved by Rob, 18 Oct 2026; audio approved the same day. Replaces `events/promo-video.mp4` (the Intro video
in the side nav) with a new key once made; the old key is never overwritten. **The times below are the plan's; the
exact ones (shots on the music's accents) are in `scripts/promo/timeline.ts`, which every script reads.**

- **Length**: 82 s (the music's own ending rings out under the end card). **Format**: 1920×1080, 30 fps, H.264 with
  `-movflags +faststart`, AAC; loudness -16 LUFS like the app's audio.
- **Audience**: general public. Tone: wonder first, then "you can do this yourself", then "and it's trustworthy".
- **Voice**: the app's narrator (`ELEVENLABS_VOICE_ID`), as in the app (`eleven_multilingual_v2`, no settings changed)
  except the cold open (lines 1–4): `eleven_v3` with "[serious] [slowly]", like the tours' title announcements (Rob's
  pick of two readings).
- **Music**: "The Miracle of Flight" by Scott Buckley (CC BY 4.0, 3:32), with one join (see Music).
- **On-screen text**: short words that land on the music's hits, so it still works with the sound off.
- **URL**: ancestoratlas.com on the end card (domain not bought yet).

## Structure

| Time | Section | Music |
|---|---|---|
| 0:00–0:10 | Cold open: three generated clips, ending in a starfield | The track's quiet opening, with its own rise after "One story." |
| 0:10–0:13 | Title: the globe and **Ancestor Atlas** | Crossfade (3 s, on the beat) into the full section |
| 0:13–0:48 | Feature montage, one feature every 3–6 s | Full section |
| 0:48–1:03 | Guided tours | Full section |
| 1:03–1:13 | Sources and trust | Full section, building to the final chord |
| 1:13–1:22 | End card: ancestoratlas.com | The final chord (1:13.3) rings out; fade |

## Script and shots

Sources: **GEN** = generated video (Rob, from the prompts below), **APP** = recorded from the app in film mode
(Claude), **GFX** = title or text graphic (Claude, in the edit). VO word counts in brackets.

| # | Time | Source | Picture | VO | On screen | Sound effects |
|---|---|---|---|---|---|---|
| 1 | 0:00–0:04 | GEN | Footprints in volcanic ash at dawn (prompt A) | "Seven million years." [3] | | Wind over ash, a soft footfall |
| 2 | 0:04–0:07 | GEN | Red ochre blown over a hand on a cave wall, revealing a hand stencil (prompt B) | "Ten thousand generations." [3] | | A breath, the puff of pigment |
| 3 | 0:07–0:10 | GEN → APP | Camera rises from a campfire into the night sky; the stars match-cut into the app's starfield and the globe turns in (prompt C) | "One story." [2] | | Fire crackle rising into a whoosh |
| 4 | 0:10–0:13 | APP + GFX | Globe turning in space, Africa centred; title fades up on the music hit | "This is Ancestor Atlas." [4] | **ANCESTOR ATLAS** | Deep boom on the hit |
| 5 | 0:13–0:18 | APP | Time slider sweeping from 7 million years ago towards today; species points spreading from Africa | "The whole human story, on one living globe." [8] | **7 million years** | Rising time swell |
| 6 | 0:18–0:22 | APP | Ice Age: ice sheets growing over Europe and North America, coastlines widening as the sea falls; climate gauges | "Watch the ice sheets grow and the seas fall." [9] | **Sea level −120 m** | Low icy wind |
| 7 | 0:22–0:26 | APP | Out of Africa routes drawing across the globe | "Follow our ancestors out of Africa," [6] | **Out of Africa** | Whoosh as the lines draw |
| 8 | 0:26–0:30 | APP | Interbreeding lines between Neanderthal and modern human sites | "see where we met Neanderthals and Denisovans," [7] | | Soft pulse |
| 9 | 0:30–0:34 | APP | Family tree page, the branches drawing in | "trace the family tree," [4] | **26 human species** | Paper and pen swish |
| 10 | 0:34–0:39 | APP | Thousands of culture points blooming across Europe and Asia; a culture card with its picture | "and explore thousands of real sites, from the first stone tools…" [11] | **5,000+ sites** | Ticks as points appear |
| 11 | 0:39–0:44 | APP | Civilization territories filling in: Egypt, Rome, China | "…to the empires of the ancient world." [7] | **200 civilizations** | Low drum |
| 12 | 0:44–0:48 | APP | Ancient DNA dots, father's line colours | "Even ancient DNA." [3] | | Soft digital shimmer |
| 13 | 0:48–0:52 | APP | Tours page, then a tour's title card | "Or sit back, and take a guided tour." [8] | **Guided tours** | UI tick |
| 14 | 0:52–0:57 | APP | Globe turns to a stop, "40,000 years later" caption, card opens with its picture | "Narrated journeys across time…" [4] | | Tour's own ambience (cave, fire) |
| 15 | 0:57–1:03 | APP | Full-screen picture viewer, then the epilogue's gold thread drawing the journey | "…from our first steps to the first cities." [8] | | Shimmer as the thread draws |
| 16 | 1:03–1:12 | APP | A card's sources and citations (Wikipedia, XRONOS, ROAD), then museum photos of real artifacts | "Every site sourced. Every date cited. Built on real research, for curious minds of every age." [16] | **Every date cited** | Quiet: the music carries it |
| 17 | 1:12–1:20 | APP + GFX | Globe pulls back into space; end card | "Ancestor Atlas. Explore it free, at ancestoratlas.com." [7] | **ancestoratlas.com**, small music credit | Final boom, then shimmer as the music ends |

About 110 words of VO, roughly 50 s of speech at speed 1.1, so the music gets room to breathe in the cold open, on
the title hit and before the end card.

Checked: the app has no sign-up or paywall (shot 17 says "free"; Rob to confirm it stays that way). "Seven million
years" is the human story (Sahelanthropus, about 7 Ma); the slider itself reaches 10 Ma.

## Generated video prompts (Rob)

Three clips, 5–8 s each, 16:9, at least 1080p. Cinematic and naturalistic, warm, no people's faces in close-up, no
text. They only need to fill about 3 s each, so the strongest moment matters more than the whole clip.

### A. Footprints in volcanic ash

```text
Cinematic slow push-in, low angle, close to the ground: a trail of early human footprints pressed into grey volcanic
ash on a wide East African plain at dawn, 3.6 million years ago. Fine ash drifts across the prints in a light wind.
Warm golden sunrise low on the horizon, a distant volcano with a thin plume of smoke, acacia trees in silhouette.
Shallow depth of field, the nearest footprint in sharp focus. Naturalistic, photographic, no people visible, no text,
no watermark.
```

### B. Hand stencil

```text
Cinematic close-up inside a dark limestone cave lit by a flickering torch: a human hand pressed flat against the rock
wall while red ochre pigment is blown over it from a hollow bone tube, in a fine spray. The hand lifts away to reveal
a crisp red hand stencil, beside older faded stencils. Warm orange firelight, drifting dust in the air, rough rock
texture. Only the hand and forearm are visible. Naturalistic, photographic, no text, no watermark.
```

### C. From the fire to the stars

```text
Cinematic continuous camera move: starting close on a small campfire at night on an open Ice Age plain, sparks rising,
the camera tilts and cranes up following the sparks into a clear night sky, and keeps rising until the frame is
filled with a deep starfield and the Milky Way, with no ground visible at the end. The last two seconds are only stars
on black, nearly still. Naturalistic, photographic, no people's faces, no text, no watermark.
```

The end of C is matched to the app's star background, so the cut into the globe is invisible.

## App footage (Claude)

Live capture can't be smooth here: the app itself draws about 37 fps at 1080p on this machine's integrated GPU, and
Chrome's screencast about 22. So the shots are filmed frame by frame instead (`scripts/promo/film.ts`): headless Chrome
at 1920×1080 opens the app with `?film` (which puts the store and map on `window`, `src/film.ts`), a script injected
before the app loads (`clock.js`) puts the page's clock, timers, animation frames and CSS animations on a virtual time,
and each frame the film script moves that time on by 1/30 s, waits for the map and data to finish, and takes a
screenshot. Every shot is a short script in `shots.ts` (state, interface hidden, camera and year per frame), so any
shot can be re-filmed when the app changes.

## Music

"The Miracle of Flight" (about 119 BPM, accents every 6 beats, about 3.03 s; `scripts/promo/beats.ts`) builds slowly
to a full section from about 1:50 and a final chord at 3:17. The promo plays its quiet opening under the cold open,
including the rise after "One story.", then crossfades over one 6-beat unit (9.8–12.8 s) into the full section at
2:16.9 and plays on to the composer's ending, so the final chord lands at 1:13.3 on the end card. Every shot change is
on an accent. Tried and dropped (Rob, 18 Oct 2026): a hard cut on the title, and a boom or a riser over a gap before it.

Credit, in the end card's small print and wherever the video is posted:

> "The Miracle of Flight" by Scott Buckley - released under CC-BY 4.0. www.scottbuckley.com.au

## Division of labour

| Step | Who |
|---|---|
| Script and shot list (this file) | Claude; Rob reviews |
| Generated clips A–C | Rob, from the prompts above |
| Narration (app voice) and sound effects (ElevenLabs) | Claude, scripted |
| Film mode and app footage | Claude (Rob records with OBS if needed) |
| Music edit | Claude; Rob checks the joins by ear |
| Edit: cuts, text, mix, loudness (scripted ffmpeg) | Claude; Rob reviews the rough cut |
| Optional final polish in a video editor | Rob, from separate tracks Claude exports |
| Upload under a new key and point `IntroModal.tsx` at it | Claude (upload needs Rob's AWS login) |

## Making it

All in `scripts/promo/`; working files in `data/build/promo/`, the generated clips and the music in `data/raw/promo/`
(both gitignored).

1. `npx tsx scripts/promo/audio.ts`: narration (cached; `--redo <shot>` for a new take), the music edit, and the mix
   (`roughcut.mp3`, -16 LUFS). Needs `NODE_USE_ENV_PROXY=1` where a proxy is in use.
2. `npx vite --port 5179`, then `npx tsx scripts/promo/film.ts all` (or shot ids): the app shots, about 0.2 s a frame.
3. `npx tsx scripts/promo/titles.ts`: the on-screen text as transparent PNGs.
4. `npx tsx scripts/promo/edit.ts` (`--draft` for a quick check): `promo.mp4`.
5. For the web: `ffmpeg -i data/build/promo/promo.mp4 -c:v libx264 -preset slow -crf 22 -maxrate 3M -bufsize 6M
   -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart data/build/promo/promo-video-v2.mp4` (about 20 MB),
   uploaded to a new key (`events/promo-video-v<n>.mp4`; never overwrite one) and listed first in `VIDEOS` in
   `src/ui/IntroModal.tsx`, where the Intro video dialog offers it as "Trailer" beside the first intro video.
