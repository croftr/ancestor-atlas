# Promo video (v2): script and shot list

Draft, 18 Oct 2026, for Rob to review. Replaces `events/promo-video.mp4` (the Intro video in the side nav) with a
new key once made; the old key is never overwritten.

- **Length**: 80 s. **Format**: 1920×1080, 30 fps, H.264 with `-movflags +faststart`, AAC; loudness -16 LUFS like
  the app's audio.
- **Audience**: general public. Tone: wonder first, then "you can do this yourself", then "and it's trustworthy".
- **Voice**: the app's narrator (`ELEVENLABS_VOICE_ID`, `eleven_multilingual_v2`), speed about 1.1. At default speed
  the narrator reads about 2 words a second, so the script is held to about 130 words.
- **Music**: "The Miracle of Flight" by Scott Buckley (CC BY 4.0, 3:32), cut to 80 s in two edits (see Music).
- **On-screen text**: short words that land on the music's hits, so it still works with the sound off.
- **URL**: ancestoratlas.com on the end card (domain not bought yet).

## Structure

| Time | Section | Music |
|---|---|---|
| 0:00–0:10 | Cold open: three generated clips, ending in a starfield | Track 0:00–0:10, quiet opening |
| 0:10–0:13 | Title hit: the globe and **Ancestor Atlas** | Cut into the full section (around 1:50 in the track) |
| 0:13–0:48 | Feature montage, one feature every 3–5 s | Full section continues |
| 0:48–1:03 | Guided tours | Full section continues |
| 1:03–1:12 | Sources and trust | Jump to the track's ending (3:15) |
| 1:12–1:20 | End card: ancestoratlas.com | Ending dies away |

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

A hidden film mode (`#/film/<shot>`) runs each APP shot as a scripted, repeatable move: no menus, cursor, welcome hint
or search bar, a fixed 1920×1080 window, the slider and camera driven on a timeline. Claude records it automatically at
1080p; if WebGL playback comes out choppy, Rob records each link with OBS instead (each shot is under 10 s and the
moves repeat exactly). Either way, footage can be re-shot whenever the app changes.

## Music

"The Miracle of Flight" builds slowly: quiet to about 0:30, a swell near 0:35, a slow build to 1:45, the full
orchestra and vocals from about 1:50 (loudest about 2:25), and the ending from 3:15 to 3:32. The promo uses:

- 0:00–0:10 of the track for the cold open,
- a cut into the full section (about 1:50) on the title hit, running 53 s under the montage and tours,
- a jump to the ending (3:15–3:32) for the last 17 s.

Claude makes a first edit with the joins on detected beats; Rob listens and says which joins sound wrong (or gives
cut times by ear). Credit, in the end card's small print and wherever the video is posted:

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
