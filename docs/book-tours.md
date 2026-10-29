# Book tours

A book tour is a guided tour built around one book: a short synopsis first, then a stop for each place or
moment the book talks about. At each stop a **book note** says what the book makes of it, then the item's card
opens and plays as in any tour. Started 29 Oct 2026. The player supports book tours (text only, no narration
recorded yet), and the first, *Kindred*, is in `src/tours/tours.ts` as a draft. This file holds the rules, how
it works, and the draft notes with their sources.

## Rules

- **Only books that mostly cover the world before 1 CE.** The atlas stops there and will stay that way
  (Rob's call, 29 Oct 2026). If most of a book's places are later, it doesn't suit a tour.
- **Pick books the atlas already covers well.** Check before writing anything: list the book's sites and
  cultures, then search `public/data/features.geojson` and the entity and event ids. Gaps a book turns up go on
  the data to-do list (*After the Ice* showed this was worthwhile), but the tour uses what is already there.
- **Notes come from the book.** Drafts may be written from public material (publisher text, reviews,
  interviews), but Rob checks every note against the book (for *Kindred*, his audiobook) and adds its chapter
  before release. If a note can't be confirmed, leave it out.
- **Our own words.** Paraphrase with at most a short quote now and then, credited to the author.
- **The book's cover is the tour's picture** (Rob's call, 29 Oct 2026; he supplies it): `book.cover`, 600 px wide
  WebP in `public/images/books/<tour id>.webp` (`ffmpeg -i cover.jpg -vf scale=600:-2 -quality 85 …`), credited
  to the publisher. Shown on the Tours page (whole, over a blurred copy), in the Tours menu and on the title card.
  The cover is the publisher's copyright, shown as a review would show it.
- **The book's claims belong to the book.** "Wragg Sykes argues …" rather than stating them as fact,
  especially where specialists disagree. The card, which goes on as normal, keeps the atlas's own text, so
  where the two differ the viewer sees both.

## How it fits the tour player

Everything a normal tour does stays the same. Additions:

| Piece | Normal tour | Book tour |
|---|---|---|
| Tour fields | id, title, blurb, stops, music, closing | plus `book: { title, author, year, publisher, link }` |
| Intro | title card, announcement reads the title | plus a **synopsis** (about 400–600 characters, narrated) on a longer title card, with the book's details |
| Each stop | slider travels, card opens, card narration | plus a **book note** (`note: { text, chapter, narration }`): once the globe has turned to the place, the note is shown as an info card on the right (the book cover as its picture) and read aloud (or held for reading time); the card opens when it ends (or on Continue), then its own narration plays |
| Between stops | "40,000 years later" title | the same, shown before the note |
| End | closing line | the closing line becomes a one- or two-sentence verdict on the book |
| Tours page | tour cards | a "Book tours" section with title, author and a link to the book |

- **The one-text-per-entity rule holds.** The note belongs to the stop and not to the entity, so a card reads
  the same in every tour, and Çatalhöyük can have one note in one book's tour and another in another's.
- **Length.** With two narrations per stop, a 13-stop tour runs about 13–15 minutes. Notes of 200–350 characters
  (about 15–25 s) keep it reasonable. If it still feels long, a tour-level option could skip the card's narration
  and read only the note.
- **Order.** Stops go in date order, like other tours; the slider and "years later" titles assume that. Each
  note gives its chapter, so the book's own order is still visible.
- **Narration:** `npm run audio:narrate -- --book <tour id>` (synopsis and notes missing or stale; `--part
  synopsis|<stop n>` for one, stops counted from 1; `--file <mp3>` for a recording made elsewhere). Keys
  `narration/books/<tour id>/synopsis-v<n>.mp3` and `stop-<n>-v<n>.mp3`; sets `synopsisNarration` or the note's
  `narration` in tours.ts; `--stale` covers them. Generated clips use `ELEVENLABS_BOOK_VOICE_ID` if set (Rob is
  trying a different voice for book tours, 29 Oct 2026), else the usual voice. The synopsis clip plays in place of
  the announcement. Without a clip, a note or synopsis holds for reading time (`readingSeconds` in `summary.ts`).

### What's built (29 Oct 2026)

- Types `Book` and `BookNote`; tour fields `book`, `synopsis`, `synopsisNarration`, `draft`; stop field `note`
  (`src/tours/tours.ts`).
- `TourPlayer.tsx`: the title card holds for the synopsis (or plays `synopsisNarration` in place of the
  announcement); at each stop with a note, the globe turns to the place with the card closed, the note shows
  (store `tour.note`, `skipNote`), then the card opens as usual. Back and Next work as in any tour.
- `BookNote.tsx` (the note card), `TitleCard.tsx` ("Book tour", author and publisher, synopsis), `EndCard.tsx` (the
  book's credit and link), `ToursPage.tsx` (a "Book tours" section after the themed tours; the book under the
  title). A `draft` tour carries a Draft chip on the title card, notes and tours page.
- Running times count the synopsis and notes.
- The music starts with the tour, under the title and synopsis (Rob's call, 29 Oct 2026; other tours bring it in
  after the announcement). It dips under every reading as usual.

## Draft 1: *Kindred* (Rebecca Wragg Sykes, 2020)

*Kindred: Neanderthal Life, Love, Death and Art*, Bloomsbury Sigma, 2020. Winner of the 2021 *Current Archaeology*
Book of the Year and the PEN Hessell-Tiltman Prize.

**Coverage check (29 Oct 2026).** Of about 50 Neanderthal sites the book is likely to discuss, all but these are
on the globe: Bruniquel (the 176,000-year-old stalagmite rings; worth adding, and it would come between
Schöningen and Krapina), Neumark-Nord, Forbes' Quarry, Okladnikov, Pontnewydd, Ranis.

**Status of the drafts.** Public reviews confirm the book's themes and main arguments (cited below). They don't
give chapter titles or say what it says about particular sites. Notes marked **(review)** rest on a review's
summary of the book. Notes marked **(check)** are written from the published evidence for that site, which I
expect the book covers but have not confirmed. Rob to listen, correct, cut, and add each chapter.

### Synopsis (title card, about 550 characters)

> For over a century Neanderthals stood for the brutish cave man. In *Kindred*, archaeologist Rebecca Wragg Sykes
> pulls together a generation of new evidence to show a very different people. Across some 350,000 years, from
> Wales to the borders of China, they made sophisticated tools from stone, wood and birch tar, hunted everything from mammoths
> to seabirds, cared for the injured, handled their dead, and met and had children with our own ancestors. This
> tour visits the places where that evidence was found, from their earliest days to their last. **(review)**

### Stops (date order)

Years are astronomical and snapped to the slider. Site ids are features on the globe now.

1. **Sima de los Huesos, Spain**: `neanderthal`, site `neanderthal@1`, year `-429_999`
   > At the bottom of a deep shaft in the Atapuerca hills lie the bones of at least twenty-eight people from about
   > 430,000 years ago, the earliest known on the Neanderthal line. Their DNA links them to Neanderthals. How so
   > many ended up there, and whether they were placed there on purpose, is still argued over. **(check)**

2. **Schöningen, Germany**: event `schoningen-spears`
   > Wragg Sykes argues that the stone tools that survive show only part of what Neanderthals made. Most of what
   > they made was wood, and has rotted away. Schöningen is the rare exception: spruce and pine spears
   > some 300,000 years old, shaped and balanced for hunting horses by a lakeshore. **(review: wood and
   > tools; check: Schöningen itself)**

   *(Bruniquel would go here once it is in the atlas.)*

3. **Krapina, Croatia**: `neanderthal`, site `neanderthal@2`, year `-129_999`
   > Krapina has hundreds of Neanderthal bones from about 130,000 years ago, more than any other site, many with cut
   > marks. The book takes cannibalism seriously but asks the reader to weigh other readings, including the care
   > of the dead. Eight white-tailed eagle talons from the site, cut and polished, may have been worn as jewellery.
   > **(review: cannibalism; check: talons)**

4. **Cueva de los Aviones, Spain**: `levallois-mousterian`, site `levallois-mousterian@r:cueva-de-los-aviones`,
   year `-109_999`
   > On the coast near Cartagena, Neanderthals collected seashells about 115,000 years ago, pierced some and
   > coloured them with red and yellow pigments. If the dates hold, these ornaments are older than any known from
   > our own species in Europe, a strong sign that the urge to adorn was not ours alone. **(check)**

5. **Shanidar, Iraq**: `neanderthal`, site `neanderthal@21`, year `-69_999`
   > Shanidar 1 lived for years with a crushed eye socket, a withered arm and a damaged leg, which he could hardly
   > have survived without help. Shanidar is also the cave of the "flower burial", now in doubt: the pollen may
   > have been brought in by burrowing animals or bees. Wragg Sykes uses such cases to show how the record of injuries
   > and care has been read and reread. **(review: injuries and hardship; check: Shanidar)**

6. **Teshik-Tash, Uzbekistan**: `neanderthal`, site `neanderthal@20`, year `-68_999`
   > Far to the east, in a cave in the mountains of Uzbekistan, a Neanderthal child was found in 1938 among ibex
   > horns. Whether the horns were set around the child on purpose is still argued over. It is one of the sites that
   > take Neanderthal country from France to Central Asia. **(review: "from France to Uzbekistan"; check: the
   > child)**

7. **Abric Romaní, Spain**: `levallois-mousterian`, site `levallois-mousterian@r:abric-romani`, year `-59_999`
   > Under this rock shelter, layer after layer of hearths survive, with the imprints of wooden objects. The
   > book reads homes like this from the traces of fireplaces: where people sat, worked and slept, and how often
   > the same small band came back. **(review: home sites from fireplaces; check: Abric Romaní)**

8. **La Chapelle-aux-Saints, France**: `neanderthal`, site `neanderthal@7`, year `-58_999`
   > The "Old Man" found here in 1908 was rebuilt as a stooped brute and fixed the cave-man image for decades.
   > Wragg Sykes traces how mistakes like this shaped what we thought of Neanderthals. He had in fact lost most
   > of his teeth and had arthritis, and recent digs suggest he was laid in a pit dug for him. **(review:
   > history of discovery; check: La Chapelle)**

9. **Kebara, Israel**: `neanderthal`, site `neanderthal@5`, year `-54_999`
   > Kebara 2 kept the small hyoid bone of the throat, and its shape matches ours. The book argues that
   > Neanderthals were very likely able to speak. **(review: speech; check: Kebara)**

10. **Meeting our ancestors**: event `archaic-human-admixture`
    > Ancient DNA shows that Neanderthals and modern humans met and had children more than once. Most people
    > outside Africa carry a little Neanderthal DNA. Wragg Sykes asks why such meetings are so often imagined as
    > violent, and why desire or attachment should seem "more of a fairy tale than other explanations". **(review)**

11. **Feldhofer Cave, Neander valley, Germany**: `neanderthal`, site `neanderthal@r:feldhofer-grotte`, year
    `-39_999`
    > In 1856 quarrymen cleared bones from a small cave here, and the Neanderthals got their name. A century and
    > a half later, archaeologists found the old spoil heaps and pieces of the same skeleton. The book tells the
    > story of discovery, of bones scattered, lost and found again. **(review: discovery and reunited
    > skeletons; check: Feldhofer)**

12. **Grotte du Renne, Arcy-sur-Cure, France**: `chatelperronian`, site
    `chatelperronian@r:arcy-sur-cure-grotte-du-renne-bison`, year `-37_999`
    > Late in their time, Neanderthals here made Châtelperronian tools along with pierced teeth and ornaments of
    > bone. Some researchers think they copied newly arrived modern humans. Others think the layers were mixed.
    > Still others think these were their own ideas. **(check)**

13. **The last Neanderthals: Gorham's Cave, Gibraltar**: event `neanderthal-extinction`, site
    `neanderthal-extinction@1`, year `-37_999` (check `tours.test.ts` passes)
    > On the floor of this sea cave someone cut a cross-hatched pattern into the rock. Neanderthals may have lasted
    > here longer than in most places. Wragg Sykes sees no single cause for their end, rather "a perfect storm"
    > of climate swings, a crowded continent and perhaps disease. Survival depends on "time and babies", not on
    > who was cleverer. Some of them live on in us. **(review: perfect storm and time and babies; check:
    > engraving)**

### Closing (verdict, about 170 characters)

> Not brutes and not a failed version of us: in *Kindred*, Neanderthals are another way of being human, and in our
> DNA part of them came along.

### Before release

- Rob: check each note against the audiobook, add chapters, and cut or rewrite anything that isn't in the book.
- Settle the length (about 13 stops, both narrations) after seeing it play.
- Optional: add Bruniquel as a Neanderthal site (Wikidata coordinates, pinned Wikipedia date) for a stop
  after Schöningen.
- Music: a CC BY track like the others.

### Sources for the drafts

- [Undark review](https://undark.org/2020/11/06/book-review-kindred/): technology not stuck, "state-of-the-art
  humans", cannibalism, interbreeding, "perfect storm", "time and babies", "from France to Uzbekistan".
- [The Inquisitive Biologist review](https://inquisitivebiologist.com/2020/08/27/book-review-kindred-neanderthal-life-love-death-and-art/):
  chapter topics, skeletons reunited, interbreeding quote, cannibalism, speech, fireplaces and home sites.
- [Wikipedia: Kindred](https://en.wikipedia.org/wiki/Kindred:_Neanderthal_Life,_Love,_Death_and_Art):
  publication details and awards.
