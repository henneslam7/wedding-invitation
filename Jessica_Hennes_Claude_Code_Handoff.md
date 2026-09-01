# Jessica & Hennes — Christmas Lunch Wedding
## Claude Code Handoff Brief

**Project type:** Mobile-first, single-page interactive wedding Save the Date / availability announcement  
**Primary distribution:** WhatsApp links  
**Couple:** Jessica & Hennes  
**Wedding date:** Saturday, 25 December 2027  
**Wedding style:** Christmas Day lunch wedding; romantic, luxurious, stylish, festive, intimate, celebratory  
**Venue:** Kimpton Tsim Sha Tsui Hong Kong  
**Address:** 11 Middle Road, Tsim Sha Tsui, Kowloon, Hong Kong  

---

# 1. Project Goal

Build a polished, production-ready mobile web invitation that feels like a **real physical envelope and invitation letter**, not like a conventional wedding website.

The experience is mainly sent privately through WhatsApp to friends.

This is **not yet the final formal RSVP invitation**. Its goals are:

1. Create a memorable tactile reveal.
2. Make guests remember **25 December 2027**.
3. Communicate that Jessica & Hennes are getting married at a fun Christmas Day lunch celebration.
4. Let guests indicate whether they expect to be available.
5. Personalize the envelope front using a query parameter such as:

```text
?to=Alex
```

Example:

```text
https://example.com/?to=Alex
```

The personalized name appears **only on the FRONT of the envelope**.

Do **not** print the date on the envelope.

Do **not** print the guest name on the back of the envelope.

---

# 2. Confirmed Interaction Flow

The interaction order is locked:

```text
1. Guest opens URL.
2. Sees FRONT of a physical-looking envelope.
3. Front shows:
      To,
      Alex
   where Alex comes from ?to=Alex.
4. Guest taps envelope.
5. Envelope physically FLIPS to the back.
6. Back shows a realistic red J·H wax seal over the flap.
7. Guest taps the wax seal.
8. Full seal briefly compresses.
9. Seal changes to a realistic CRACKED version.
10. Seal changes into THREE separate broken wax fragments.
11. The 3 fragments fall away independently with weight and rotation.
12. Envelope flap slowly lifts open.
13. Invitation letter rises physically from inside the envelope.
14. Empty envelope fades away behind the letter.
15. Letter content reveals section-by-section like a story.
16. Guest reaches two availability actions:
      I’ll be there
      I can’t make it
```

Do not skip the front-to-back flip.

Do not show the wax seal on the envelope front.

---

# 3. Creative Direction

Earlier concept name was "Christmas After Midnight", but the design was considered **too dark**.

The current direction is:

# Warm Festive Christmas Lunch Wedding

Think:

- luxury hotel Christmas lunch
- winter daylight
- champagne
- warm ivory paper
- fashion editorial stationery
- intimate private correspondence
- romantic but not sugary
- festive but not Christmas-card cliché
- party/celebration energy
- modern luxury wedding
- tactile paper and real wax

The design should feel closer to:

```text
luxury hotel stationery
+ fashion editorial
+ private love letter
+ Christmas Day celebration
```

Avoid:

- dark nightclub atmosphere
- deep forest green
- black-heavy layouts
- generic Christmas red + green blocking
- snowflakes everywhere
- Christmas trees
- bells
- ornaments
- holly borders
- candy canes
- cute Christmas illustration
- obvious wedding-template graphics
- generic wedding script fonts
- a flat CSS circle pretending to be wax

---

# 4. Current Colour Direction

Use a warm, bright, romantic palette.

Suggested tokens:

```css
--background: #F8F3EC;
--background-secondary: #EFE4D8;

--envelope: #DDCDBC;
--envelope-shadow: #CBB8A4;

--paper: #FFFAF3;
--paper-secondary: #F6ECDF;

--ink: #4B403B;
--muted: #82736A;

--champagne: #B89565;
```

Wax remains vivid glossy red because the user specifically preferred the supplied realistic wax asset.

Do not introduce deep forest green.

Overall page should feel bright enough to read as **marriage + lunch + party**, rather than perfume/nightclub.

---

# 5. Typography Direction

Preferred visual pairing:

## Display / names / large date
Cormorant Garamond if available.

Fallback:
Georgia / Times New Roman style serif.

## Supporting UI / uppercase date / small labels
Manrope if available.

Fallback:
modern sans-serif such as Arial / system sans.

Avoid an obvious decorative wedding script font.

For small intimate moments such as:

```text
To,
Alex

Love,
Jessica & Hennes
```

an italic serif treatment is preferred over a generic calligraphy font.

---

# 6. Envelope — Front

The user specifically corrected the envelope logic.

The FRONT should feel like an addressed physical envelope.

Display only:

```text
To,
{GuestName}
```

Example:

```text
To,
Alex
```

Use URL query parsing:

```js
const params = new URLSearchParams(window.location.search);
const guest = (params.get("to") || "").trim();
```

Fallback if no guest name:

```text
For you.
```

Long names must resize or wrap gracefully.

Optional tiny instruction:

```text
tap to turn over
```

Do not display:

- wedding date
- couple name
- wax seal
- Save the Date
- venue

on the front.

---

# 7. Envelope Flip

On tap/click, the envelope should rotate around the Y axis:

```css
transform: rotateY(180deg);
```

Use:

```css
transform-style: preserve-3d;
backface-visibility: hidden;
```

Important implementation detail from an earlier bug:

After flipping, the FRONT hit area must not intercept clicks.

Example logic:

```css
.flip-card.flipped .front {
  pointer-events: none;
}

.back {
  pointer-events: none;
}

.flip-card.flipped .back {
  pointer-events: auto;
}
```

The wax seal button must remain above envelope paper layers and receive pointer events.

---

# 8. Realistic Wax Seal Assets — IMPORTANT

Do NOT recreate the seal with CSS gradients or simple SVG.

The user rejected the fake web-drawn seal.

Use the supplied realistic image assets.

There are FIVE asset states:

```text
1. seal-full
2. seal-cracked
3. fragment-left-J
4. fragment-bottom-arc
5. fragment-right-H
```

These correspond to:

### State 1 — intact
A glossy realistic irregular red wax seal with embossed serif:

```text
J·H
```

### State 2 — cracked
The SAME seal, same scale, same lighting, but with cracks running across the wax.

### State 3 — broken fragments
Three separate photoreal fragments:

- left large fragment containing J
- lower curved fragment
- right large fragment containing H

The fragments should visually reconstruct approximately the same original seal position before moving.

Recommended web format:

```text
WebP with alpha transparency
```

Recommended target size:

```text
~600×600 max canvas per asset
```

Assets should be preloaded before enabling the wax interaction so the state swap does not flash.

Example preload:

```js
const sealAssets = [
  "/assets/seal-full.webp",
  "/assets/seal-cracked.webp",
  "/assets/seal-frag-left.webp",
  "/assets/seal-frag-bottom.webp",
  "/assets/seal-frag-right.webp"
];

await Promise.all(
  sealAssets.map(src => new Promise(resolve => {
    const img = new Image();
    img.onload = img.onerror = resolve;
    img.src = src;
  }))
);
```

Until preload completes, either keep interaction disabled or make full seal visible while preventing the opening sequence.

---

# 9. Seal Animation

The animation should feel physical, not app-like.

Suggested timing:

```text
Tap compression:        ~140–170ms
Cracked state appears:  ~160ms after tap
Hold cracked seal:      ~400–500ms
Fragments appear:       ~600–650ms
Fragments begin falling ~700–750ms
Flap starts opening:    ~1100ms
Letter begins rising:   ~1750–1850ms
Envelope fades:         ~2600ms
Text reveal begins:     ~2950ms
```

Sequence:

```text
full seal
↓
slight physical press
↓
cracked seal
↓
3 fragments
↓
fragments fall
↓
flap opens
↓
letter rises
```

Fragment movement should not be identical.

Suggested directions:

```text
left/J:
  translate(-45px, +115px)
  rotate(-35deg to -45deg)

bottom:
  translate(+4px, +135px)
  rotate(+8deg to +15deg)

right/H:
  translate(+45px, +100px)
  rotate(+28deg to +35deg)
```

Use gravity-like easing:

```css
cubic-bezier(.2,.75,.3,1)
```

No bounce.

---

# 10. Envelope Flap

The flap must feel like real folded paper.

Use 3D perspective.

Closed:

```css
transform: rotateX(0deg);
```

Open approximately:

```css
transform: rotateX(176deg);
```

The flap animation should last roughly:

```text
1.1–1.3 seconds
```

The shadow under the flap should soften/change as the flap lifts.

Avoid instant rotation.

Avoid spring bounce.

---

# 11. Letter Reveal

The invitation letter should rise out of the physical envelope.

It should begin hidden lower down, then translate upward.

Important previous layout bug to avoid:

## DO NOT use a permanent fixed-height scene after reveal.

Earlier versions had:

```css
scene {
  height: 805px;
}
```

and an outer:

```css
overflow: hidden;
```

This produced:

- a huge blank gap above the invitation
- bottom content being clipped
- Replay button visible while invitation bottom was cut off

Correct approach:

1. Keep the scene compact while envelope is closed.
2. When the letter rises, calculate actual content height.
3. Expand the scene dynamically.
4. Allow revealed content to determine the actual page height.
5. Do not clip the final invitation vertically.

Example:

```js
letter.classList.add("rise");

requestAnimationFrame(() => {
  const letterHeight = letter.getBoundingClientRect().height;
  scene.style.height = `${Math.ceil(letterHeight + 40)}px`;
});
```

Use:

```css
overflow: visible;
```

for the revealed state.

Do not leave hundreds of pixels of empty space between the header and revealed letter.

The invitation should come to rest near the upper content area after the envelope disappears.

---

# 12. Current Invitation Copy

Current working copy:

```text
KEEP CHRISTMAS DAY FOR US.

Jessica
& Hennes

are getting married —
and gathering everyone we love for lunch.

25

SATURDAY
DECEMBER 2027
LUNCH WEDDING

Kimpton Tsim Sha Tsui Hong Kong
11 Middle Road, Tsim Sha Tsui
Kowloon, Hong Kong

Good food, great company,
a little Christmas sparkle,
and a day we’d love to share with you.

For now, just save the date
and let us know if you think you can make it.

Love,
Jessica & Hennes
```

Tone:

- polished
- warm
- intimate
- playful
- celebratory
- not overly formal
- not cheesy
- not black tie
- friends-first

The user described the event as a **lunch wedding**, not an evening party.

Do not say "Christmas night".

Use "Christmas Day".

---

# 13. Content Hierarchy

This is primarily a Save the Date.

The hierarchy should be:

```text
1. 25
2. Jessica & Hennes
3. Saturday / December 2027
4. Lunch wedding
5. Venue
6. Supporting copy
```

The large `25` should be the visual climax.

Recommended approximate mobile typography:

```text
25:
  94–110px serif

Jessica & Hennes:
  ~46–54px serif

Opening:
  9–10px tracked uppercase sans

Date meta:
  10px tracked uppercase sans

Venue:
  15–17px serif
```

---

# 14. Text Reveal Story

Do not show all content at once.

After the letter finishes rising:

```text
1. KEEP CHRISTMAS DAY FOR US.
2. Jessica & Hennes
3. are getting married...
4. divider draws
5. 25
6. SATURDAY / DECEMBER 2027 / LUNCH WEDDING
7. venue
8. closing line
9. Save the Date / availability note
10. Love, Jessica & Hennes
11. availability buttons
```

Suggested stagger:

```text
160–260ms
```

Allow a slightly larger pause before revealing `25`.

---

# 15. Divider

Use a subtle champagne divider.

Example:

```text
──────── ✦ ────────
```

The horizontal lines should animate outward.

Do not make it an obvious Christmas decoration.

---

# 16. Availability Actions

No traditional RSVP form.

At the bottom:

```text
I’ll be there

I can’t make it
```

Primary can be a subtle outline button.

Secondary can be a quieter text button.

Ultimately these should open WhatsApp using a pre-filled message.

Positive example:

```text
It’s Alex — I’m keeping Christmas Day free. Count me in 🥂
```

Negative example:

```text
It’s Alex — I’m so sorry, I won’t be able to make it on 25 December 2027. ❤️
```

The guest name should come from `?to=` when available.

Implement using WhatsApp deep links.

The actual recipient phone number should be configurable in one place.

For example:

```js
const RSVP_PHONE = "852XXXXXXXX";
```

Generate:

```js
const url = `https://wa.me/${RSVP_PHONE}?text=${encodeURIComponent(message)}`;
window.location.href = url;
```

If no number has been supplied yet, isolate this config clearly and add a TODO.

---

# 17. WhatsApp Distribution

The final website will be hosted online.

Do not instruct users to send the HTML file itself through WhatsApp.

The intended distribution is:

```text
https://wedding-domain.com/?to=Alex
https://wedding-domain.com/?to=Michelle
https://wedding-domain.com/?to=Chris%20Wong
```

Hosting options include:

- Cloudflare Pages
- Netlify
- GitHub Pages
- custom web hosting

The site must work as static hosting if possible.

---

# 18. WhatsApp Link Preview / Open Graph

Add metadata so a WhatsApp link creates a polished preview.

Example:

```html
<meta property="og:title" content="Jessica & Hennes">
<meta property="og:description" content="Keep Christmas Day for us · 25 December 2027">
<meta property="og:type" content="website">
<meta property="og:image" content="https://YOUR-DOMAIN.com/og-preview.jpg">
```

Also include:

```html
<meta name="twitter:card" content="summary_large_image">
```

Create / reserve:

```text
/public/og-preview.jpg
```

Suggested preview design:

```text
Jessica & Hennes
Keep Christmas Day for us.
25 December 2027
```

Do not include the guest name in the OG preview because WhatsApp preview crawlers will not reliably generate dynamic images per query parameter.

---

# 19. Favicon

Use a small simplified J·H mark or wax seal silhouette.

Do not use the large photoreal full seal as a favicon without optimization.

---

# 20. Responsive Requirements

Primary target:

```text
~390–430px mobile viewport
```

The design should also work at:

```text
320px minimum
```

Desktop should NOT transform into a conventional wide wedding webpage.

Instead keep a centered invitation experience around:

```text
420–460px
```

Think of it as a digital physical object.

Avoid:

```css
height: 100vh;
```

or fixed viewport-height assumptions.

Content should determine document height.

No page-level horizontal scrolling.

---

# 21. Accessibility

Required:

- native `<button>` elements for flip / seal / RSVP actions
- keyboard focus states
- meaningful `aria-label` for non-text controls
- reduced-motion support
- no hover-only essential interactions
- touch targets at least ~44px
- alt="" for purely decorative wax state images
- focus must not become trapped

For `prefers-reduced-motion: reduce`, skip the long physical animation and show the invitation in a useful readable state.

---

# 22. Performance

The invitation is opened from WhatsApp on phones.

Optimize for this.

Requirements:

- convert wax seal PNG assets to WebP/AVIF where browser-safe
- retain alpha transparency
- resize oversized assets
- preload critical seal assets
- avoid huge JS frameworks unless genuinely needed
- vanilla HTML/CSS/JS is preferred
- keep interaction smooth on iPhone Safari and Android Chrome
- no autoplay media
- no remote dependencies required for core functionality

If using Google Fonts, consider self-hosting or use robust fallbacks.

---

# 23. Project Structure Recommendation

Suggested:

```text
/
├─ index.html
├─ styles.css
├─ app.js
├─ assets/
│  ├─ seal-full.webp
│  ├─ seal-cracked.webp
│  ├─ seal-frag-left.webp
│  ├─ seal-frag-bottom.webp
│  ├─ seal-frag-right.webp
│  ├─ og-preview.jpg
│  └─ favicon.svg
└─ README.md
```

A single self-contained HTML is acceptable for an initial deploy, but production code should preferably separate structure, styles, script, and assets.

---

# 24. Existing Prototype Lessons / Known Bugs

## Bug 1 — Wax seal not clickable after flip

Cause:
front face / envelope paper layers were still intercepting pointer events.

Required fix:

```css
.flip-card.flipped .front {
  pointer-events: none;
}

.flip-card.flipped .back {
  pointer-events: auto;
}

.seal-button {
  z-index: high;
  pointer-events: auto;
}
```

Decorative paper layers around the seal should generally use:

```css
pointer-events: none;
```

---

## Bug 2 — Huge blank gap after opening

Cause:
letter was absolutely positioned inside a scene with a large hard-coded height.

Do not use a large fixed opened scene height.

Use actual measured letter height.

---

## Bug 3 — Bottom of invitation clipped

Cause:
outer stage used:

```css
overflow: hidden;
```

while revealed letter became taller than the scene.

Do not vertically clip final content.

---

## Bug 4 — Fake-looking seal

The user explicitly rejected:

- flat circles
- CSS-only fake wax
- basic SVG approximations

Use the supplied photoreal wax assets.

---

# 25. Visual Quality Target

When choosing between:

```text
more "web UI"
vs
more "physical invitation"
```

choose physical invitation.

When choosing between:

```text
more wedding template
vs
more fashion editorial/private correspondence
```

choose fashion editorial/private correspondence.

When choosing between:

```text
obvious Christmas iconography
vs
warm festive atmosphere
```

choose subtle festive atmosphere.

When choosing between:

```text
dark luxury
vs
warm wedding celebration
```

choose warm wedding celebration.

The final feeling should be:

> Jessica & Hennes personally sent me a beautiful physical-style Christmas wedding invitation, and opening it feels special.

---

# 26. Final Claude Code Implementation Prompt

Copy everything below into Claude Code after placing this Markdown file and the 5 wax assets inside the project folder.

---

## PROMPT FOR CLAUDE CODE

You are taking over an interactive mobile wedding Save the Date project for **Jessica & Hennes**.

Read the entire `CLAUDE_HANDOFF.md` before modifying any files.

Your job is to produce a polished, production-ready static web build.

### Core event data

- Couple: Jessica & Hennes
- Date: Saturday, 25 December 2027
- Type: Christmas Day lunch wedding
- Venue: Kimpton Tsim Sha Tsui Hong Kong
- Address: 11 Middle Road, Tsim Sha Tsui, Kowloon, Hong Kong
- Distribution: WhatsApp links
- Personalization: `?to=GuestName`

### Locked interaction

Do not change this interaction order:

1. Envelope FRONT appears.
2. Front contains only `To, {GuestName}` and a discreet flip hint.
3. Guest taps envelope.
4. Envelope flips to BACK.
5. Realistic intact J·H wax seal appears over flap.
6. Guest taps seal.
7. Full seal compresses.
8. Swap to cracked seal asset.
9. Swap to three separate realistic fragment assets.
10. Fragments fall independently.
11. Envelope flap opens slowly with believable paper physics.
12. Letter rises out.
13. Envelope fades away.
14. Letter content reveals sequentially.
15. Availability actions appear.

### Wax assets

Locate the five supplied transparent wax assets and normalize them for web.

Use these logical names in the app:

```text
seal-full.webp
seal-cracked.webp
seal-frag-left.webp
seal-frag-bottom.webp
seal-frag-right.webp
```

If the files are currently PNG, crop transparent excess and convert to WebP while preserving alpha.

Important:
Do NOT redraw the seal with CSS or SVG.
Do NOT replace the photoreal assets.

Preload all five before enabling the seal-breaking interaction.

Make the three fragment assets begin aligned so they approximately reconstruct the intact seal before the falling animation.

### Visual direction

Bright, warm, luxury Christmas lunch wedding.

Use:

- warm ivory
- champagne beige
- soft rose/taupe undertones
- warm brown ink
- champagne gold details
- realistic glossy red wax

Do not use deep forest green.
Do not use a dark/black page.
Do not make it look like a nightclub or perfume campaign.
Do not make it a generic Christmas card.

It should feel like:

```text
luxury hotel lunch
+ wedding celebration
+ champagne
+ fashion editorial stationery
+ private love letter
```

### Text

Use this current copy:

```text
KEEP CHRISTMAS DAY FOR US.

Jessica
& Hennes

are getting married —
and gathering everyone we love for lunch.

25

SATURDAY
DECEMBER 2027
LUNCH WEDDING

Kimpton Tsim Sha Tsui Hong Kong
11 Middle Road, Tsim Sha Tsui
Kowloon, Hong Kong

Good food, great company,
a little Christmas sparkle,
and a day we’d love to share with you.

For now, just save the date
and let us know if you think you can make it.

Love,
Jessica & Hennes
```

### Layout constraints

This is mobile-first.

Primary viewport:
390–430px.

Support minimum:
320px.

Desktop should remain centered at approximately 420–460px, not become a wide website.

The large `25` is the strongest visual element.
Jessica & Hennes is second.

Do not place the wedding date on the envelope.

### Important layout bug prevention

Do not use a permanently hard-coded opened scene height such as 805px.

Once the letter is revealed, measure its actual height and let the page grow naturally.

Do not vertically clip the letter.

Avoid `overflow:hidden` on any container that would cut off the final invitation content.

There should NOT be a huge empty gap between the top header and the revealed invitation.

### URL personalization

Read:

```text
?to=Alex
```

and display:

```text
To,
Alex
```

on the FRONT only.

Fallback:

```text
For you.
```

Handle:
- URL decoding
- long names
- HTML safety
- wrapping/resizing

### WhatsApp availability

Implement:

```text
I’ll be there
I can’t make it
```

as WhatsApp deep links with prefilled responses.

Create a top-level config constant:

```js
const RSVP_PHONE = "";
```

If blank, preserve the UI but log / display a clear development fallback.

Positive:

```text
It’s Alex — I’m keeping Christmas Day free. Count me in 🥂
```

Negative:

```text
It’s Alex — I’m so sorry, I won’t be able to make it on 25 December 2027. ❤️
```

Use `encodeURIComponent`.

### WhatsApp link preview

Add proper Open Graph tags.

Reserve:

```text
/assets/og-preview.jpg
```

and include a clear TODO if the asset has not yet been supplied.

Suggested title:

```text
Jessica & Hennes
```

Description:

```text
Keep Christmas Day for us · 25 December 2027
```

### Technical expectations

Prefer:

- semantic HTML
- modern CSS
- vanilla JavaScript
- no framework unless necessary
- responsive
- iOS Safari compatible
- Android Chrome compatible
- reduced-motion support
- keyboard accessible
- high-performance assets
- no console errors

Use a clean file structure.

### Before you finish

Test all of the following:

1. `/`
2. `/?to=Alex`
3. `/?to=Chris%20Wong`
4. very long guest name
5. 320px viewport
6. 390px viewport
7. 430px viewport
8. desktop viewport
9. flip can only happen once during active sequence
10. seal is clickable after flip
11. cracked image actually displays before fragments
12. all three fragments visibly move
13. flap opens after fragments leave
14. letter does not get clipped
15. bottom buttons remain visible
16. Replay completely resets the interaction
17. reduced motion remains usable
18. missing `?to=` fallback works
19. no date appears on envelope
20. guest name appears only on envelope front

Do not stop at a rough prototype.

Polish spacing, easing, shadows, paper depth, typography, and mobile behavior until it feels like a premium physical invitation translated to the web.

After implementation, provide:
- a concise summary of files created/changed
- how to run locally
- how to deploy on Netlify / Cloudflare Pages
- where to enter the RSVP WhatsApp phone number
- where to replace the OG preview image
- any remaining TODOs
