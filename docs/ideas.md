# Ideas

Improvement ideas from a review of the app (16 Oct 2026). Tick them off or strike them out as they are done or
dropped. Tour polish items already in CLAUDE.md's backlog are not repeated here.

## Quick wins

- [ ] **Link previews.** `index.html` has no description or `og:image`, so shared links (`#/tour/<id>`,
  `#/?year=…&site=…`) unfurl bare. One site-wide preview card first; per-tour previews would need small static
  pages, since the views live after the `#`.
- [ ] **Narration subtitles.** ElevenLabs' `with-timestamps` endpoint gives character timing, so `audio:narrate`
  could save captions beside each clip. For sound-off viewing, classrooms and deaf viewers; also handy for
  proofreading the rewritten descriptions.
- [ ] **Swap "Apeman Suite"** (backlog item 5) before promoting the tours publicly.

## Features

- [ ] **Family tree view.** A cladogram of the 26 species, built from their spans and the contemporaries data;
  click a branch to jump the globe and slider there. Needs a sourced phylogeny (e.g. a recent review's cladogram).
- [ ] **"Where and when?" game.** Show a picture; the player drops a pin and sets the slider; score on distance and
  years off. Reuses pictures, dated points and the slider.
- [ ] **Build and share your own tour.** Tours are lists of entity ids, so a user's tour fits in the URL: an "add
  to my tour" button on cards, a small editor, a share link (card text and music, no narration).
- [ ] **Show date uncertainty.** Fade points in and out across their 95% range instead of switching on/off, and
  mark partial or recall-sourced rows differently.

## New data

- [x] **Ancient DNA layer.** Done 16 Oct 2026: AADR v66.p1 (CC0), see README "Ancient DNA (AADR)". Possible next
  steps: checking the layer on phones. (Yamnaya culture, culture-card links and the "Out of the steppe" tour done.)
- [ ] **Remaining migration routes:** farming into Europe, the Austronesian expansion, the Bantu expansion.
- [ ] **Interbreeding events:** Neanderthal and Denisovan gene flow, drawn as links between species ranges.
- [ ] **New tours from existing data:** Peopling of the Americas, Neanderthal life, Domestication and the first
  farmers, Writing and the first cities.

## Reach and performance

- [ ] **Faster first load.** `features.geojson` is 4.1 MB, loaded at once. Split by category or load XRONOS points
  on zoom; clustering would also tidy dense areas such as Europe.
- [ ] **Installable, works offline.** Service worker and manifest, for schools and museums without wifi.
- [ ] **Other languages.** Narration already uses `eleven_multilingual_v2`; translated descriptions plus a batch
  `audio:narrate` run (Spanish, French, …). Check visitor languages first; translation and TTS cost money.
- [ ] **Export a tour as video.** Extend `scripts/video/` to record a whole tour (globe, cards, narration, music) to
  MP4 for YouTube or Shorts, linking back to the app.

## First picks

Subtitles, the family tree and link previews; the game if something new and fun is wanted.
