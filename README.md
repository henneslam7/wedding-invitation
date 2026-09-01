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
`PHOTO_ASSETS` in `app.js`) — portrait orientation, ideally already fairly
tight crops since they display at a small size (~96px wide) with a `4:5`
`object-fit: cover` crop applied on top. Unlike the wax seal assets, these
aren't gated behind a preload — a slow-loading photo just pops in a beat
late rather than blocking the whole sequence.

## Scroll reveal

Once the letter is out of the envelope, its content no longer reveals
itself on a fixed timer — each `.reveal-item` fades in as the guest
actually scrolls it into view (`startScrollReveal()` in `app.js`, an
`IntersectionObserver` with `threshold: 0.15`, one observer entry per
item, unobserved once it's fired). Nothing below the fold reveals itself
before the guest gets there.

Under `prefers-reduced-motion: reduce` this is skipped entirely —
scroll-gating motion someone has asked to minimise doesn't help them, so
every item just shows immediately instead (`revealItems.forEach(revealOne)`).

The scene's height is already fixed to the letter's full rendered height
the moment it rises (see `riseLetter()`) — reveal-items only ever toggle
opacity, never `display`, so revealing them as the guest scrolls doesn't
change layout or shift `scene`'s height. The one exception is the mini
calendar, below.

## Mini calendar reveal

Right after the divider, a small calendar card plays its own sequence
once the guest scrolls to it, before the big "25": it flips through every
month, January to December, landing on the real one (a quick "tick" per
month, like an old flip calendar); then the date grid fades in; then a
champagne circle draws itself around the 25 (an SVG `stroke-dashoffset`
sweep, not a static ring); holds a beat so it registers; then fades away —
collapsing out of the layout rather than leaving an empty gap — and the
big "25" takes over from there. All timing lives in `CAL_TIMING` /
`CAL_MONTHS` in `app.js` (`playCalendarIntro()`), triggered the moment the
card's own scroll-reveal fires.

Its disappearance is the only reveal-item whose exit actually changes the
letter's rendered height (everything else only ever toggles opacity,
never layout), so that same moment re-measures and shrinks `scene`'s
height to match — otherwise the collapse would leave a stale gap the size
of the calendar card where it used to be. (`.scene` has its own `height`
transition so that shrink animates instead of snapping.)

The date grid is hand-laid-out for December 2027 specifically (Dec 1 is a
Wednesday) rather than computed — there's only ever one December this
invitation cares about. The month label's HTML default is "JANUARY" (not
December) so that if there's ever a beat between the card appearing and
`playCalendarIntro()` actually starting, nothing spoils by flashing the
answer early.

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
- Letter content only reveals as you scroll to it, not on a timer; the mini calendar flips January→December, shows the dates, circles the 25th, then collapses cleanly (no gap) before the big "25" appears; replaying resets month/classes and scroll-observation correctly for a second run
- No snowflakes before the envelope is opened; a fresh set appears once the letter rises, stays faint, and never blocks taps; replaying clears them; none appear at all under `prefers-reduced-motion: reduce`
