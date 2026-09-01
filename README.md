# Jessica &amp; Hennes — Christmas Lunch Wedding, Save the Date

A mobile-first, single-page interactive invitation. No build step, no framework —
plain HTML/CSS/JS, distributed via a personalized WhatsApp link.

```
https://YOUR-DOMAIN.com/?to=Alex
```

## Files

```
index.html      structure + copy + meta tags
styles.css      all styling, states driven by data-* attributes
app.js          guest-name parsing, seal/flip/reveal sequencing, WhatsApp CTAs
assets/
  favicon.svg           simplified J·H monogram (done)
  seal-full.webp         TODO — realistic intact wax seal
  seal-cracked.webp      TODO — same seal, cracked
  seal-frag-left.webp    TODO — left fragment (contains J)
  seal-frag-bottom.webp  TODO — bottom curved fragment
  seal-frag-right.webp   TODO — right fragment (contains H)
  og-preview.jpg         TODO — 1200×630 WhatsApp link-preview image
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

## Before going live

1. **Wax seal assets** — drop the 5 real photoreal WebP files into `/assets`
   using the exact filenames listed above. They're preloaded before the seal
   becomes tappable (`SEAL_ASSETS` in `app.js`); until they exist, tapping the
   seal has no effect (preload never resolves to "ready" against a 404, so
   the interaction fails safe rather than showing a broken image).
2. **RSVP WhatsApp number** — set `RSVP_PHONE` near the top of `app.js`
   (international format, digits only, e.g. `"85212345678"`). Until it's set,
   the availability buttons copy the reply text to the clipboard and show an
   alert instead of opening WhatsApp, so the UI still works during development.
3. **OG preview image** — add `assets/og-preview.jpg` (1200×630) and replace
   `https://YOUR-DOMAIN.com` in the `<meta property="og:image">` /
   `og:url` tags in `index.html` with the real deployed domain, so WhatsApp
   link previews render correctly.

## Testing checklist

- `/`, `/?to=Alex`, `/?to=Chris%20Wong`, and a very long guest name
- 320px, 390px, 430px, and desktop viewports
- Flip only triggers once per active sequence; seal is tappable right after flip
- Cracked seal is visible before the fragments appear; all 3 fragments move independently
- Flap opens only after the fragments have left; letter is never clipped; bottom buttons stay visible
- Replay fully resets state; `prefers-reduced-motion: reduce` still reaches a readable end state
- No guest name on the envelope back; no date on the envelope front
