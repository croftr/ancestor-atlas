# Deep dives

A deep dive is a tour of one topic, told stop by stop (started 11 Nov 2026). The first, *Ancient Egypt*, steps
through the 16 civilizations under Ancient Egypt in date order. Between the cards come **interludes**: our own
short notes on what links the stops (threads, turning points, places, objects), the counterpart of the "from the
book" stops in a book tour. More deep dives will follow (Rob's call, 11 Nov 2026: Egypt is the pilot).

## How it works

- A `Tour` with `deepDive: true` in `src/tours/tours.ts`. It reuses the book-tour machinery: a stop with a `note`
  is an interlude (the globe turns to the stop's entity/site at its year, the note takes the card's place), and
  `BookNote.tsx` shows it with the eyebrow "Interlude · `note.kind`" and no book credit.
- `note.kind`: Thread, Transition, Place, Object or Compare. Pictures: `note.images`, as for book notes.
- The Tours page lists deep dives in their own section; the title card says "Deep dive".
- Stops run oldest first; equal years are fine (tests allow them). Each card stop must be on the globe at its year,
  so the parent (Ancient Egypt itself has no map shapes) is the tour's identity, not a stop.
- An interlude is hung on whatever entity or event fits its place and date (the Great Pyramid event for Giza),
  and is separate from that entity's own card.
- **Voice:** interludes get their own voice (Rob is choosing it). Until then they have no narration and hold for
  reading time. Cards use the usual voice and the narration they already have.
- **Sources and tone:** our own words, written from the atlas's data and pinned Wikipedia articles; hedge what is
  debated; Rob reviews before release. `draft: true` shows a Draft chip until then.

## Ancient Egypt: stops

Early Dynastic (2900 BCE) · *interlude: Giza* · Old Kingdom · Lower Egypt · Upper Egypt · Middle Kingdom ·
*interlude: letters from hieroglyphs* · Hyksos · 15th, 16th, 17th Dynasties (one year, drawn in one slice) ·
New Kingdom · *interlude: Medinet Habu* · 22nd · 23rd · Assyrian Egypt · 26th · 30th · Ankhwennefer.

Planned interludes still to write: why the Old Kingdom fell and the Nile floods; Egypt and Nubia; chariots and
bronze arriving in Egypt; Amarna; a country split between rivals; Assyria, Kush and the Saite revival; Persia and
Alexander (the gap between the 30th Dynasty and Ankhwennefer); the Rosetta Stone to close.

## To do

- Narration of the interludes once the voice is chosen (the `--book` narrate flow needs a deep-dive variant).
- More interludes, pictures for them, a `closing` line and music.
- Check the narrated card descriptions: most are short (320–380 characters).
