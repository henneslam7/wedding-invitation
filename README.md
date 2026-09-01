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

`#btnCalendar` is a real `<a>`, not a JS-driven button — app.js sets its
`href` per platform before the guest can interact with it, but a genuine
link tap handles the navigation, not a script calling `location.href`.
That distinction matters here: some iOS in-app browsers (WhatsApp's
included, which is how this invitation is normally opened) will hand a
real link tap on a `data:` URI to Calendar's native "Add Event" screen
even though they silently ignore the exact same URI when a script assigns
it instead — the anti-phishing policy some browsers apply to
script-initiated top-level navigation doesn't apply the same way to a
link the guest actually tapped.

- **iOS** — `href` becomes a `data:text/calendar` URI holding the event
  (fetched from the static file, then inlined). In full Safari this opens
  the native single-event "Add Event" screen directly. Chrome for iOS
  enforces its own block on this regardless of how the tap originated (it
  isn't just following WebKit's rules — Chrome for iOS is a separate app
  layered on WebKit, without Safari's UI-level calendar handoff, and with
  Google's own restrictions on top), so there it — and reportedly some
  other in-app browsers too — downloads the file instead; from there,
  opening the download normally still gets it into Calendar, just with an
  extra manual step.
- **Android** — `href` becomes `webcal://<host>/assets/wedding-event.ics`.
  `webcal:` is a custom URL scheme, not a content type, so there's nothing
  for a browser to render — it has to hand the request to whatever the OS
  registered for it (Calendar), the same way `tel:`/`mailto:` links always
  escape to the Phone/Mail app regardless of which browser triggered them.
  This is more reliable than the `data:` approach but opens Calendar in
  *subscribe* mode rather than the single-event *add* dialog — the guest
  gets a one-item calendar named "Jessica & Hennes — Wedding" (from the
  file's `X-WR-CALNAME`) added to their calendar list, rather than that
  one event merging into their existing calendar. Same practical outcome
  (25 Dec 2027 shows up, blocked out), just via a subscription.
- **Desktop** — plain `href` to the static file with `download="..."` set
  in the HTML (untouched by app.js) — downloads
  `jessica-hennes-wedding.ics`, the normal, expected interaction there.

There is no single approach that's both a true single-event add *and*
reliable across every iOS browsing context a guest might open this link
in — that specific handoff is a Safari-the-app feature, not a general
WebKit or iOS capability, and there's no way to detect from script which
browser context is currently running it. This is the best mix of
"try for the nicer outcome, fail safe everywhere else" available without
a backend.

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
- "+ Add to calendar"'s `href` resolves to a `data:` URI on iOS, `webcal://` on Android, and the static `.ics` (with `download` set) on desktop; a real click downloads a correctly-named, valid `jessica-hennes-wedding.ics` on desktop
