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

The third, quieter button under the RSVP actions ("+ Add to calendar") adds
25 December 2027 (all-day) as an event with the venue in the location field.
It picks the right method per device, no backend needed:

- **iPhone/iPad (Safari)** — navigates to a `text/calendar` blob URL, which
  Safari opens as its native "Add to Calendar" sheet. (Uses `blob:` rather
  than `data:` because Chromium blocks top-level navigation to `data:` URIs
  as an anti-phishing measure; `blob:` isn't affected and Safari handles it
  the same way.)
- **Android** — opens a prefilled Google Calendar "add event" link in a new
  tab.
- **Desktop / anything else** — downloads a `.ics` file
  (`jessica-hennes-wedding.ics`) that Google/Apple/Outlook Calendar can all
  import.

Event details live in `CALENDAR_EVENT` near the top of `app.js`.

## Before going live

1. ~~Wax seal assets~~ — done, the 5 processed WebP files are in `/assets`.
2. ~~RSVP WhatsApp numbers~~ — done, `RSVP_PHONES.bride` / `.groom` are set
   in `app.js`. Just remember every guest link needs `&side=bride` or
   `&side=groom` (see the top of this file) — without it, the reply can't be
   routed and falls back to "copy the message and send it yourself".
3. ~~OG preview image~~ — done, `assets/og-preview.jpg` is in place and the
   `og:image` / `og:url` tags in `index.html` point at
   `https://wedding-invitation-jh.vercel.app/`.

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
- "+ Add to calendar" on iOS/Android/desktop each reach a working add-to-calendar flow
