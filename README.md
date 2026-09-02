# Jessica &amp; Hennes — Christmas Lunch Wedding, Save the Date

A mobile-first, single-page interactive invitation. No build step, no framework —
plain HTML/CSS/JS, distributed via a personalized WhatsApp link.

```
https://wedding-invitation-jh.vercel.app/?to=Alex&side=bride
https://wedding-invitation-jh.vercel.app/?to=Chris&side=groom
```

`to` is the guest's name (shown on the envelope front). `side` decides whose
WhatsApp the "I'll be there" / "I can't make it" reply is sent to — `bride`
(aliases: `bridal`, `jessica`) or `groom` (alias: `hennes`). **Always include
`&side=`** when sending a link — without it, the reply can't be routed and
the guest instead gets a "copy this message and send it yourself" fallback.

## Files

```
index.html      structure + copy + meta tags
styles.css      all styling, states driven by data-* attributes
app.js          guest-name/side parsing, seal/flip/reveal sequencing,
                 WhatsApp CTAs, add-to-calendar
assets/
  favicon.svg            simplified J·H monogram
  seal-full.webp         realistic intact wax seal
  seal-cracked.webp      same seal, cracked
  seal-frag-left.webp    left fragment (contains J)
  seal-frag-bottom.webp  bottom curved fragment
  seal-frag-right.webp   right fragment (contains H)
  og-preview.jpg         1200×630 WhatsApp link-preview image
  wedding-event.ics      static calendar file used by "+ Add to calendar"
  photo-1.webp           TODO — portrait couple photo (set into the letter)
  photo-2.webp           TODO — portrait couple photo
  photo-3.webp           TODO — portrait couple photo
source-assets/   original uncropped wax-seal/OG artwork (not deployed —
                 excluded via .vercelignore; kept for future re-processing)
vercel.json      static hosting config (clean URLs, asset caching)
```

## Run locally

Any static file server works, e.g.:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then open `http://localhost:8000/?to=Alex`.

## Deploy

### Vercel (this project auto-deploys from the `main` branch)
No configuration needed beyond `vercel.json` already in the repo — Vercel
detects it as a static site. Every push to `main` triggers a new deployment.

### Netlify / Cloudflare Pages (alternative)
- Build command: none
- Publish directory: `/` (repo root)

## Add to calendar

The third, quieter link under the RSVP actions ("+ Add to calendar") adds
25 December 2027 (all-day) as an event with the venue in the location
field. Event content lives in `assets/wedding-event.ics` — a real static
file, not one generated client-side, since there's nothing guest-specific
in it.

`#btnCalendar` is a real `<a>`; app.js sets its `href` per platform before
the guest can interact with it.

- **Mobile (iOS or Android)** — `href` becomes
  `webcal://<host>/assets/wedding-event.ics`. `webcal:` is a custom URL
  scheme, not a content type, so there's nothing for a browser to render —
  it has to hand the request to whatever the OS registered for it
  (Calendar), the same way `tel:`/`mailto:` links always escape to the
  Phone/Mail app regardless of which browser triggered them. The one
  downside: this opens Calendar in *subscribe* mode rather than the
  single-event *add* dialog — the guest gets a one-item calendar named
  "Jessica & Hennes — Wedding" (from the file's `X-WR-CALNAME`) added to
  their calendar list, rather than that one event merging into their
  existing calendar. Same practical outcome (25 Dec 2027 shows up, blocked
  out), just via a subscription.
- **Desktop** — plain `href` to the static file with `download="..."` set
  in the HTML (untouched by app.js) — downloads
  `jessica-hennes-wedding.ics`, the normal, expected interaction there.

Earlier versions tried landing on Calendar's native single-event "Add
Event" screen on iOS instead, via a `data:text/calendar` URI — first
navigated to from a script, then (on the theory that a real user-tapped
link might be treated differently to a script-initiated navigation, since
some browsers' anti-phishing rules on top-level `data:` navigation only
target the latter) as a real `<a href="data:...">` link. Neither survived
contact with WhatsApp's in-app browser (the way this invitation is
normally opened) — that native handoff is a Safari-the-app feature, not a
general WebKit/iOS capability, and in-app browsers don't implement it
regardless of how the navigation started, so guests kept landing on a
downloaded file with no obvious next step instead of anything opening.
`webcal:` trades "possibly the nicer single-event dialog, sometimes a
dead end" for "always the same, working outcome," which matters more on a
page most guests reach through an in-app browser rather than full Safari.

## Couple photos

Three portrait photos are set into the letter alongside the message —
after the opening greeting, after the venue, and after the closing note —
rather than clustered above it. Each is a card-framed photo (~200–260px
wide) that drops in with its own slight tilt as part of the same
staggered reveal as the surrounding text, just with more travel and a
heavier gravity-style easing so it still reads as a distinct "drop" among
the plainer text fades.

Referenced as `assets/photo-1.webp`, `photo-2.webp`, `photo-3.webp` (see
`PHOTO_ASSETS` in `app.js`) — portrait orientation, with a `4:5`
`object-fit: cover` crop applied on top. Unlike the wax seal assets,
these aren't gated behind a preload — a slow-loading photo just pops in a
beat late rather than blocking the whole sequence, and the `4:5`
`aspect-ratio` means its space is reserved either way, so nothing below
shifts when it lands.

If a photo is missing or fails, `app.js` swaps its `src` for a blank
pixel and tags the frame `.photo-missing`, leaving an empty ivory plate
in place. Hiding the alt text alone isn't enough — most engines still
draw their broken-image glyph, which is exactly what a half-finished
invitation should never show.

## Opening the envelope

The seal breaks, the flap folds back, and then the letter is **drawn up
out of the envelope** rather than cross-faded on top of it.

The trick is z-order, not clipping: `.letter` sits at `z-index: 1`,
*behind* `.envelope-stage` at `z-index: 2`. While the letter is still
inside, the envelope's own opaque body is what hides it, and `.scene`'s
`overflow: hidden` (pinned to the envelope's height at that moment) hides
everything below. Then the letter translates up 72px while the envelope
sinks 132px: the two crossing over each other is what reads as the letter
being pulled clear. Only once it's out does the envelope dissolve —
fading it any earlier would let the letter show straight through the
pocket, which is precisely why the earlier cross-fade version never felt
physical.

The letter no longer scales or fades on the way out either. A letter
leaving an envelope only translates; the fade was doing most of the work
of making it feel like a layer rather than an object.

Timings live in `RISE` in `app.js` and must stay in step with the
transition durations on `.letter` / `.envelope-stage` in `styles.css`.

## Scroll reveal

Once the letter is out, its content no longer reveals itself on a fixed
timer — each `.reveal-item` fades in as the guest actually scrolls it
into view (`startScrollReveal()` in `app.js`, an `IntersectionObserver`
with `threshold: 0.15`, one observer entry per item, unobserved once
it's fired). Nothing below the fold reveals itself before the guest gets
there.

Items that come into view **together** — most obviously the first
screenful, which an `IntersectionObserver` reports in a single callback
the moment it starts observing — are spaced out by `queueReveal()`
rather than all firing on the same frame, so a screenful cascades
(`REVEAL_GAP`, 135ms) instead of popping in as one block.

Motion weight varies by role rather than being one shared fade: the
eyebrow barely moves (5px / 980ms), the names take their time (17px /
1180ms), the closing actions are comparatively brisk (9px / 640ms). The
uniform 620ms/14px fade the earlier version used on all fifteen items
flattened exactly the hierarchy the typography works to build.

Under `prefers-reduced-motion: reduce` all of this is skipped —
scroll-gating motion someone has asked to minimise doesn't help them, so
every item just shows immediately instead (`revealItems.forEach(revealOne)`).

Reveal-items only ever toggle opacity, never `display`, so revealing them
as the guest scrolls doesn't change layout or shift `scene`'s height. The
one exception is the mini calendar, below.

## Mini calendar reveal

Right after the divider, a small calendar card plays its own sequence
once the guest scrolls to it, before the big "25": a real 2027 desk
calendar pad, 12 stacked paper pages (`.cal-pad` / `.cal-page` in
`index.html`, JAN through DEC), torn off one month at a time — January
first, then February, and so on — each page flying off at its own
slightly different angle and speed (randomized `--tear-x` / `--tear-y` /
`--tear-rot`, matching the same "not identical every time" treatment as
the wax-seal fragments and the dropping photos) to reveal the page
underneath, ~260ms/month, so the whole tear-down takes a bit over 3s —
paced as its own little story beat, not a fast blur. The pages are
stacked with a slight fanned offset and shadow per `:nth-child` so it
reads as a real paper pad even before anything moves, and each page has
a dashed perforation line near its top like a genuine tear-off calendar.
December is the last page — nothing is torn off it, it's simply what's
left once the other 11 are gone, then it gets a small settle/pulse
animation once it's the only page remaining. Only then does the date
grid fade in; then a champagne circle draws itself around the 25 (an SVG
`stroke-dashoffset` sweep, not a static ring); and holds a beat so it
registers.

### Handing the 25 over to the big date

The card then **dissolves around the circled date rather than taking it
with it**: the `.lifting` class releases the pad, the year, the other
day cells and the circle, but deliberately not `.mini-cal-target`, so
the 25 is left alone on the paper. `startDateMorph()` then replaces it
with a clone (`.date-morph`) that travels up and scales into
`.big-date`'s exact position, and hands off the moment it lands.

This exists because the old version announced the date twice — the
calendar circled 25 December, faded out, and then a separate big "25"
plus "DECEMBER 2027" faded in immediately below it, each diluting the
other. Now there's one payoff.

The clone is rendered at `.big-date`'s **final** font size and scaled
*down* to meet the calendar cell, never the reverse — text rasterised at
13px and blown up 8× would land blurry, which is the same reason FLIP
animations always scale down into place.

`.big-date` and `.date-meta` carry `data-gated="date"`, and `revealOne()`
refuses to reveal them at all — `revealDateBlock()` is the only route in.
Both sit close enough below the card to be caught by their own
scroll-observer well before the calendar is finished, which would put
"DECEMBER 2027" on screen underneath a pad still tearing its way there.
Gating them on "calendar collapsed" isn't enough either: that opens the
moment the card disappears, while the 25 is still in flight, landing the
caption before the date it belongs to.

### If the guest doesn't wait

The full sequence runs about eight seconds, and a guest who scrolls
straight past shouldn't be held to it — or, worse, have it collapse
under them later while they're reading something else. A second
observer watches the card itself; the moment it leaves the viewport
mid-sequence, `finishCalendarNow()` clears the remaining timers and
lands on the end state immediately (no morph — there's nobody watching
it). If they're already reading *below* the card when it collapses,
`collapseCalendar()` measures how much the letter shrank and does a
matching `window.scrollBy()`, so the page doesn't yank itself out from
under them.

All timing lives in `CAL_TIMING` / `CAL_MONTH_COUNT` in `app.js`, and
the calendar keeps its own timer set (`calClock`) precisely so it can be
cut short without disturbing anything else.

Its disappearance is the only reveal-item whose exit actually changes the
letter's rendered height (everything else only ever toggles opacity,
never layout), so that same moment re-measures and shrinks `scene`'s
height to match — otherwise the collapse would leave a stale gap the size
of the calendar card where it used to be. (`.scene` has its own `height`
transition so that shrink animates instead of snapping.)

The date grid is hand-laid-out for December 2027 specifically (Dec 1 is a
Wednesday) rather than computed — there's only ever one December this
invitation cares about. Replaying removes the `tearing`/`settled` classes
from every page so the pad is back to its full, untorn stack for the next
run.

## Snowfall

A sparse, low-opacity drift of small snowflakes across the whole page,
starting only once the guest has actually opened the envelope (`riseLetter()`
calls `startSnowfall()` — nothing before that point), generated fresh each
time rather than hand-authored, so their size/position/speed/opacity vary
enough to read as organic rather than a repeating pattern. Deliberately
restrained — the creative brief this project started from explicitly
called out "snowflakes everywhere" and "cute Christmas illustration" as
things to avoid in favour of a warm, editorial-stationery feel over an
obvious Christmas-card one — so this is tuned to be a faint ambient touch
you'd only really notice if you looked, not a snow globe.
`pointer-events: none` throughout, and skipped entirely under
`prefers-reduced-motion: reduce`. Replay clears the flakes
(`clearSnowfall()`) so they regenerate cleanly on the next opening.

A near-white flake on a warm-ivory `--background` is a genuine contrast
trap — an early version was technically present (correct count, correct
timing) but essentially invisible on screen. Each flake now has a
solid-ish white core (`radial-gradient(circle, #FFFFFF 62%, …)`) plus a
soft warm-brown halo (`box-shadow`, zero spread so it blends from the
disc's edge instead of reading as a separate ring) to give it an edge
against the page — still faint by design, just no longer imperceptible.

Flakes also **sway** rather than falling in a straight line: `snow-fall`
carries a horizontal component (`--sway`, 8–24px) across five keyframes,
so each one drifts on the way down. A single linear translate falls like
a dropped bead, and that read as "particles" more than snow. The largest
few also carry a `0.6px` blur, which is the whole of the depth cue —
without it the drift is one flat plane of identical dots.

## Material craft

A few details that are the difference between "warm ivory palette" and
paper you'd want to hold:

- **The letter paper has grain.** The envelope always had a
  `.paper-texture`; the letter — the thing guests actually spend their
  time looking at — was a flat gradient. It now carries a fine two-axis
  fibre texture (`soft-light`, 0.5 opacity) and a pressed hairline border
  inset 13px, echoing the frame on the envelope's front.
- **The eyebrow line is foil, not gold text.** `--gold-foil` is a
  five-stop gradient applied through `background-clip: text`, so it
  catches light unevenly the way stamped foil does. Behind an `@supports`
  guard, falling back to the flat `--champagne` fill — without the guard,
  an unsupporting engine would render `color: transparent` and the line
  would simply vanish.
- **One tracking scale** (`--track-wide` / `--track-mid` /
  `--track-tight`) instead of the six ad-hoc `letter-spacing` values that
  had accumulated across the small-caps elements.
- **Display type is set, not typed** — a touch of negative tracking
  (`-0.012em`) on `.names` and `.big-date`, since Cormorant sets loose at
  those sizes, and the ampersand is italic (`.amp`), which is what
  stationery does.

## The closing signature block

The three CTAs used to be three unrelated visual languages stacked up (a
solid pill, underlined text, small champagne caps), with the Replay
button sitting at equal weight underneath and interrupting the emotional
close. They're now one block opened by a hairline rule, on a single
alignment and tracking system: one confident primary, one quiet
secondary, and the calendar link as a genuinely tertiary micro-action.
Replay is demoted to a 45%-opacity affordance well below it — findable,
never part of the invitation.

## Layout robustness

The scene's height is driven by a measurement of the letter, and the
original brief called out stale fixed heights as the bug to avoid. Two
things make that measurement hold up:

- `document.fonts.ready` re-measures once webfonts land. On a cold
  WhatsApp in-app browser the Google Fonts request is very likely to
  resolve *after* the first measurement, and every line of the letter
  re-flows when it does.
- A `ResizeObserver` on `.letter` re-measures on any later height change
  — a photo finally loading, an orientation change, the calendar
  collapsing.

Both are gated behind `letterSettled`, which only becomes true once the
letter is fully out of the envelope. Before that the scene is
*deliberately* short (the letter is still partly inside, and that short
scene is what hides it), so an early re-measure would break the
extraction.

## Before going live

1. ~~Wax seal assets~~ — done, the 5 processed WebP files are in `/assets`.
2. ~~RSVP WhatsApp numbers~~ — done, `RSVP_PHONES.bride` / `.groom` are set
   in `app.js`. Just remember every guest link needs `&side=bride` or
   `&side=groom` (see the top of this file) — without it, the reply can't be
   routed and falls back to "copy the message and send it yourself".
3. ~~OG preview image~~ — done, `assets/og-preview.jpg` is in place and the
   `og:image` / `og:url` tags in `index.html` point at
   `https://wedding-invitation-jh.vercel.app/`.
4. **Couple photos** — drop 3 portrait photos into `/assets` as
   `photo-1.webp` / `photo-2.webp` / `photo-3.webp` (see "Couple photos"
   above). Until they're added, the frames still drop in on cue, just
   showing a broken-image icon in the meantime.

## Testing checklist

- `/`, `/?to=Alex&side=bride`, `/?to=Chris%20Wong&side=groom`, and a very long guest name
- A link with no `&side=` (or an unrecognised one) falls back to the copy-to-clipboard flow instead of guessing
- 320px, 390px, 430px, and desktop viewports
- Flip only triggers once per active sequence; seal is tappable right after flip
- Cracked seal is visible before the fragments appear; all 3 fragments move independently
- Flap opens only after the fragments have left; letter is never clipped; bottom buttons stay visible
- Replay fully resets state; `prefers-reduced-motion: reduce` still reaches a readable end state
- No guest name on the envelope back; no date on the envelope front
- "I'll be there" / "I can't make it" opens WhatsApp for the correct side
- "+ Add to calendar"'s `href` resolves to `webcal://` on iOS/Android and the static `.ics` (with `download` set) on desktop; a real click downloads a correctly-named, valid `jessica-hennes-wedding.ics` on desktop
- The letter is visibly drawn *up out of* the envelope (not cross-faded over it) — nothing of the letter shows through the pocket at any point, and the envelope only dissolves once the letter is clear
- The first screenful cascades in one item at a time rather than arriving as a single block
- Letter content only reveals as you scroll to it, not on a timer; the mini calendar tears off its pages January→November one at a time, December remains and settles, only then shows the dates and circles the 25th
- The card then dissolves around the circled 25 and that 25 travels up into the big "25" — the big date and "DECEMBER 2027" never appear before it lands, and the caption follows the date, not the other way round
- Scroll past the calendar mid-sequence: it finishes immediately, collapses cleanly (no gap), and the page does **not** jump under you
- Replaying resets every page to its untorn stacked state, clears any morph clone, and runs correctly a second time
- No snowflakes before the envelope is opened; a fresh set appears once the letter rises, drifts rather than falling straight, stays faint, and never blocks taps; replaying clears them; none appear at all under `prefers-reduced-motion: reduce`
- With a photo missing, its frame shows an empty ivory plate — never a broken-image icon or stray alt text
- Throttle the network so the webfonts land late: the letter must not end up clipped or trailing an empty gap
