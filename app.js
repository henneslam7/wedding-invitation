(() => {
  "use strict";

  /* ------------------------------------------------------------
     Config
     ------------------------------------------------------------ */

  // Each guest link should include &side=bride or &side=groom so their
  // reply routes to the right person's WhatsApp. International format,
  // no leading "+".
  const RSVP_PHONES = {
    bride: "85268006555",
    groom: "85292962102"
  };

  const WEDDING_DATE_LABEL = "25 December 2027";

  // Event details for "add to calendar" live in assets/wedding-event.ics
  // itself (a static file, since there's nothing guest-specific in it) —
  // see the "Add to calendar" section of README.md for why it's a real
  // hosted file rather than something generated client-side.
  const ICS_PATH = "/assets/wedding-event.ics";

  const SEAL_ASSETS = [
    "/assets/seal-full.webp",
    "/assets/seal-cracked.webp",
    "/assets/seal-frag-left.webp",
    "/assets/seal-frag-bottom.webp",
    "/assets/seal-frag-right.webp"
  ];

  const PHOTO_ASSETS = [
    "/assets/photo-1.webp",
    "/assets/photo-2.webp",
    "/assets/photo-3.webp"
  ];

  // Sequence timings (ms) for the envelope-opening physical animation —
  // matched to the creative brief. The letter's own content no longer
  // reveals on a timer (see "Scroll reveal" below): it reveals as the
  // guest scrolls to it.
  const T = {
    pressed: 0,
    cracked: 160,
    broken: 620,
    falling: 700,
    flapOpen: 1100,
    letterRise: 1780
  };

  // The extraction beat, measured from the moment the letter starts to
  // move. The letter is drawn up while the envelope sinks away beneath
  // it; the envelope may only start dissolving once the letter is
  // clear, because until then the envelope's own opacity is what hides
  // the part of the letter still inside the pocket.
  const RISE = {
    emerge: 1000, // letter up / envelope down — must match the CSS transitions
    envelopeSink: 132, // must match .envelope-stage[data-sinking="true"]
    contentAt: 900, // the first words may start arriving
    // The envelope may not begin dissolving until the pull is over. It
    // is the only thing hiding the length of letter still inside it, and
    // --ease-soft drops opacity fast enough that even a couple of
    // hundred milliseconds early shows paper straight through the pocket.
    envelopeFade: 1000,
    envelopeFadeDuration: 600, // must match .envelope-stage's opacity transition
    unrollAt: 1000, // scene grows from envelope height to the letter's full height
    unrollDuration: 850
  };

  const CAL_MONTH_COUNT = 12; // January through December

  // Sub-timing (ms) for the mini calendar's own tear-off-the-months →
  // reveal the dates → circle → hold → leave beat, offsets measured from
  // the moment it scrolls into view. Paced deliberately slow, like a
  // little story rather than a blur — a page torn off a real desk pad
  // per month (11 tears; December is the page left underneath), not a
  // fast text swap.
  const CAL_TIMING = {
    monthStep: 450, // x11 tears, January through November
    tearDuration: 700, // must match .cal-pad .cal-page.tearing's transition
    daysRevealDelay: 300, // after the last tear lands (December revealed)
    daysRevealDuration: 450,
    circleDelay: 400, // after the dates are visible
    circleDuration: 650,
    hold: 600,
    liftDuration: 420, // the card dissolving around the circled 25
    morphDuration: 780 // that 25 travelling up into .big-date
  };

  // How long the reveal scheduler leaves between two items that become
  // visible together, so a screenful cascades instead of popping as one.
  const REVEAL_GAP = 135;

  /* ------------------------------------------------------------
     Helpers
     ------------------------------------------------------------ */

  const prefersReducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function getGuestName() {
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get("to") || "").trim();
    if (!raw) return "";
    // Basic sanity cap so an extreme query string can't blow up layout.
    return raw.slice(0, 60);
  }

  const SIDE_ALIASES = {
    bride: "bride",
    bridal: "bride",
    jessica: "bride",
    groom: "groom",
    hennes: "groom"
  };

  function getSide() {
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get("side") || "").trim().toLowerCase();
    return SIDE_ALIASES[raw] || null;
  }

  function timers() {
    const ids = [];
    return {
      after(ms, fn) {
        ids.push(setTimeout(fn, ms));
      },
      clearAll() {
        ids.forEach(clearTimeout);
        ids.length = 0;
      }
    };
  }

  /* ------------------------------------------------------------
     Elements
     ------------------------------------------------------------ */

  const scene = document.getElementById("scene");
  const envelopeStage = document.getElementById("envelopeStage");
  const flipCard = document.getElementById("flipCard");
  const envelopeFront = document.getElementById("envelopeFront");
  const envelopeBack = document.getElementById("envelopeBack");
  const guestNameEl = document.getElementById("guestName");
  const sealBtn = document.getElementById("sealBtn");
  const calendarIntro = document.getElementById("calendarIntro");
  const calTargetCell = document.getElementById("calTargetCell");
  const letter = document.getElementById("letter");
  const letterPaper = document.getElementById("letterPaper");
  const bigDate = document.getElementById("bigDate");
  const dateMeta = document.getElementById("dateMeta");
  const replayBtn = document.getElementById("replayBtn");
  const btnYes = document.getElementById("btnYes");
  const btnNo = document.getElementById("btnNo");
  const btnCalendar = document.getElementById("btnCalendar");
  const srLive = document.getElementById("srLive");

  const revealItems = Array.from(document.querySelectorAll(".reveal-item"))
    .sort((a, b) => Number(a.dataset.reveal) - Number(b.dataset.reveal));

  /* ------------------------------------------------------------
     Guest name (front of envelope only)
     ------------------------------------------------------------ */

  const guestName = getGuestName();
  guestNameEl.textContent = guestName || "For you.";
  if (guestName.length > 22) {
    guestNameEl.style.fontSize = "clamp(19px, 6.6vw, 30px)";
  }

  /* ------------------------------------------------------------
     Preload seal assets before the seal is interactive
     ------------------------------------------------------------ */

  let sealReady = false;
  Promise.all(
    SEAL_ASSETS.map(
      (src) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = img.onerror = resolve;
          img.src = src;
        })
    )
  ).then(() => {
    sealReady = true;
  });

  // Photos are a non-blocking enhancement — preload for smoothness, but
  // don't gate the seal interaction on them (unlike the wax assets, which
  // must be ready before the seal can be broken at all).
  PHOTO_ASSETS.forEach((src) => {
    const img = new Image();
    img.src = src;
  });

  /* ------------------------------------------------------------
     Sequence state machine
     ------------------------------------------------------------ */

  let sequenceActive = false;
  let sequenceDone = false;
  let scrollObserver = null;
  let calVisObserver = null;
  // Once true, the letter is fully out and its measured height is the
  // authority for the scene's height — before that the scene is
  // deliberately short (the letter is still partly inside the envelope),
  // so late re-measures must not fire.
  let letterSettled = false;
  let calendarPhase = "idle"; // idle → playing → done
  let revealCursor = 0;
  const clock = timers();
  // The calendar keeps its own timers so its sequence can be cut short
  // (a guest who scrolls past it) without disturbing anything else.
  const calClock = timers();

  function announce(msg) {
    if (srLive) srLive.textContent = msg;
  }

  function flipEnvelope() {
    if (flipCard.dataset.flipped === "true") return;
    flipCard.dataset.flipped = "true";
    envelopeFront.setAttribute("aria-hidden", "true");
    envelopeFront.inert = true;
    envelopeBack.setAttribute("aria-hidden", "false");
    envelopeBack.inert = false;
    announce("Envelope turned over. A wax seal is waiting.");

    if (prefersReducedMotion) {
      // Give a moment for the flip to register, then let the seal be tapped.
      sealBtn.focus({ preventScroll: true });
    }
  }

  function runOpeningSequence() {
    if (sequenceActive || sequenceDone) return;
    if (!sealReady) return; // ignore taps until assets are preloaded
    sequenceActive = true;
    sealBtn.disabled = true;

    const scale = prefersReducedMotion ? 0 : 1;
    const at = (ms) => Math.round(ms * scale);

    sealBtn.dataset.pressed = "true";

    clock.after(at(T.cracked), () => {
      scene.dataset.seal = "cracked";
      sealBtn.dataset.pressed = "false";
    });

    clock.after(at(T.broken), () => {
      scene.dataset.seal = "broken";
    });

    clock.after(at(T.falling), () => {
      scene.dataset.seal = "falling";
    });

    clock.after(at(T.flapOpen), () => {
      flipCard.dataset.flap = "open";
      announce("The envelope is opening.");
    });

    clock.after(at(T.letterRise), () => {
      riseLetter();
    });
  }

  function measureScene() {
    const height = letter.getBoundingClientRect().height;
    scene.style.height = `${Math.ceil(height + 40)}px`;
  }

  function riseLetter() {
    const scale = prefersReducedMotion ? 0 : 1;
    const at = (ms) => Math.round(ms * scale);

    // Pin the scene to the envelope's height first. A transition can't
    // tween from "auto", so without this the unroll to the letter's full
    // height would snap instead of animating — and, more importantly,
    // the scene has to stay envelope-sized while the letter is still
    // emerging or the letter's whole body would be on show at once.
    const envHeight = envelopeStage.getBoundingClientRect().height;
    scene.style.height = `${Math.ceil(envHeight)}px`;
    void scene.offsetHeight; // flush, so the next change is a real transition

    letter.dataset.risen = "true";
    letter.setAttribute("aria-hidden", "false");
    letter.inert = false;
    envelopeStage.dataset.sinking = "true";

    // While the letter is coming out, the envelope *is* the stage: the
    // scene has to follow it down, or its bottom edge gets sheared off
    // against a clip line and it stops looking like an envelope at all.
    // Same duration and easing as the sink, started in the same frame,
    // so the two stay locked together — and deliberately 2px shy of the
    // envelope's real bottom, since erring towards a hair of clipping is
    // invisible while erring the other way would expose the letter's
    // body underneath it.
    scene.style.setProperty("--scene-dur", `${RISE.emerge}ms`);
    scene.style.setProperty("--scene-ease", "var(--ease-paper)");
    scene.style.height = `${Math.ceil(envHeight) + RISE.envelopeSink - 2}px`;

    sequenceDone = true;
    sequenceActive = false;
    announce(
      "Invitation from Jessica and Hennes: keep Christmas Day, 25 December 2027, for a lunch wedding at Kimpton Tsim Sha Tsui Hong Kong."
    );

    clock.after(at(RISE.envelopeFade), () => {
      envelopeStage.dataset.hidden = "true";
      envelopeStage.inert = true;
    });

    clock.after(at(RISE.contentAt), () => {
      // Snow only once the letter is actually out of the envelope, and the
      // content reveals itself as the guest scrolls to it, not on a timer.
      startSnowfall();
      startScrollReveal();
    });

    clock.after(at(RISE.unrollAt), () => {
      scene.style.setProperty("--scene-dur", `${RISE.unrollDuration}ms`);
      scene.style.setProperty("--scene-ease", "var(--ease-soft)");
      measureScene();
    });

    // Bring the letter forward only once the envelope has finished
    // dissolving. Doing it any earlier would put the letter's opaque
    // paper in front of an envelope that is still visibly fading, so the
    // envelope would vanish in a single frame instead of dissolving.
    clock.after(at(RISE.envelopeFade + RISE.envelopeFadeDuration), () => {
      letter.dataset.out = "true";
    });

    clock.after(at(RISE.unrollAt + RISE.unrollDuration), () => {
      // Un-clip only now: the letter's shadow needs to spill past the
      // scene box, and there's no longer anything to hide.
      scene.style.overflow = "visible";
      scene.style.removeProperty("--scene-dur");
      scene.style.removeProperty("--scene-ease");
      letterSettled = true;
      measureScene();
    });
  }

  function playCalendarIntro(el) {
    calendarPhase = "playing";
    const scale = prefersReducedMotion ? 0 : 1;
    const at = (ms) => Math.round(ms * scale);
    const pages = Array.from(el.querySelectorAll(".cal-page"));
    const finalPage = el.querySelector(".cal-page-final");

    // A guest who scrolls straight past shouldn't be held to an
    // eight-second animation they've already left behind — nor have it
    // collapse under them later while they're reading something else.
    if (!prefersReducedMotion && window.IntersectionObserver) {
      calVisObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting && calendarPhase === "playing") {
              finishCalendarNow();
            }
          });
        },
        { threshold: 0 }
      );
      calVisObserver.observe(el);
    }

    // Tear off every month but the last, January through November — a
    // page ripped from a real desk pad per month (paced deliberately
    // slow, as its own little story beat), each falling away a little
    // differently (not identical, matching the wax fragments/photos
    // elsewhere), revealing the page beneath. December is the page left
    // underneath once the others are gone.
    for (let i = 0; i < pages.length - 1; i++) {
      const page = pages[i];
      calClock.after(at(i * CAL_TIMING.monthStep), () => {
        page.style.setProperty("--tear-x", `${(Math.random() * 36 - 18).toFixed(0)}px`);
        page.style.setProperty("--tear-y", `${(84 + Math.random() * 28).toFixed(0)}px`);
        page.style.setProperty("--tear-rot", `${(Math.random() * 20 - 10).toFixed(0)}deg`);
        page.classList.add("tearing");
      });
    }

    const tearEnd = (CAL_MONTH_COUNT - 1) * CAL_TIMING.monthStep + CAL_TIMING.tearDuration;
    const daysStart = tearEnd + CAL_TIMING.daysRevealDelay;
    const circleStart = daysStart + CAL_TIMING.daysRevealDuration + CAL_TIMING.circleDelay;
    const liftStart = circleStart + CAL_TIMING.circleDuration + CAL_TIMING.hold;

    calClock.after(at(tearEnd), () => finalPage.classList.add("settled"));
    calClock.after(at(daysStart), () => el.classList.add("days-shown"));
    calClock.after(at(circleStart), () => el.classList.add("circled"));
    // The card releases everything except the circled date...
    calClock.after(at(liftStart), () => el.classList.add("lifting"));
    // ...and then that date is carried up into the big "25".
    calClock.after(at(liftStart + CAL_TIMING.liftDuration), () => collapseCalendar());
  }

  // Cut the calendar's remaining sequence short and land on its end
  // state immediately — used when the guest has scrolled past it.
  function finishCalendarNow() {
    if (calendarPhase !== "playing") return;
    calClock.clearAll();
    calendarIntro.classList.add("days-shown", "circled");
    collapseCalendar();
  }

  function collapseCalendar() {
    if (calendarPhase === "done") return;
    calendarPhase = "done";

    if (calVisObserver) {
      calVisObserver.disconnect();
      calVisObserver = null;
    }

    // Only worth morphing if the guest can actually see it happen.
    const calRect = calendarIntro.getBoundingClientRect();
    const onScreen =
      calRect.bottom > 0 && calRect.top < (window.innerHeight || 0);
    const withMorph = !prefersReducedMotion && onScreen;
    const cellRect = withMorph ? calTargetCell.getBoundingClientRect() : null;

    const heightBefore = letter.getBoundingClientRect().height;

    // Collapse out of the layout rather than leaving an empty gap. This
    // is the one reveal-item whose exit changes the letter's rendered
    // height — everything else only ever toggles opacity.
    calendarIntro.style.display = "none";
    const heightAfter = letter.getBoundingClientRect().height; // forces reflow
    const delta = heightBefore - heightAfter;

    if (!onScreen && delta > 0 && calRect.bottom <= 0) {
      // The guest is reading below the calendar: everything they're
      // looking at just moved up by `delta`, so move the viewport with
      // it. Without this the page yanks itself out from under them.
      scene.style.setProperty("--scene-dur", "0ms");
      window.scrollBy(0, -delta);
      requestAnimationFrame(() => scene.style.removeProperty("--scene-dur"));
    }

    measureScene();

    if (withMorph && cellRect) startDateMorph(cellRect);
    else revealDateBlock(false);
  }

  // Carry the circled 25 out of the calendar and up into .big-date, so
  // the date is announced once rather than twice.
  function startDateMorph(cellRect) {
    const bigRect = bigDate.getBoundingClientRect();
    const paperRect = letterPaper.getBoundingClientRect();

    const clone = document.createElement("div");
    clone.className = "date-morph";
    clone.textContent = "25";
    clone.setAttribute("aria-hidden", "true");
    clone.style.top = `${bigRect.top - paperRect.top}px`;
    letterPaper.appendChild(clone);

    const cloneRect = clone.getBoundingClientRect();
    const cellFont = parseFloat(getComputedStyle(calTargetCell).fontSize) || 13;
    const bigFont = parseFloat(getComputedStyle(bigDate).fontSize) || 100;
    const ratio = cellFont / bigFont;

    const dx =
      cellRect.left + cellRect.width / 2 - (cloneRect.left + cloneRect.width / 2);
    const dy =
      cellRect.top + cellRect.height / 2 - (cloneRect.top + cloneRect.height / 2);

    clone.style.transition = "none";
    clone.style.transform = `translate(${dx}px, ${dy}px) scale(${ratio})`;
    void clone.offsetHeight;
    clone.style.transition = `transform ${CAL_TIMING.morphDuration}ms var(--ease-paper)`;
    clone.style.transform = "translate(0, 0) scale(1)";

    calClock.after(CAL_TIMING.morphDuration, () => {
      revealDateBlock(true);
      clone.remove();
    });
  }

  function revealDateBlock(instant) {
    if (instant) {
      // The clone has already travelled here — this is a hand-off, not
      // an entrance, so it must not fade in underneath it.
      bigDate.style.transition = "none";
      bigDate.classList.add("show");
      requestAnimationFrame(() => {
        bigDate.style.removeProperty("transition");
      });
    } else {
      bigDate.classList.add("show");
    }
    clock.after(instant ? 180 : 0, () => dateMeta.classList.add("show"));
  }

  function revealOne(el) {
    // The date block is never revealed by scrolling to it: the calendar
    // hands it over in revealDateBlock(), and that is the only route in.
    // Anything looser lets "DECEMBER 2027" appear underneath a calendar
    // still tearing its way there — or, more subtly, the moment the card
    // collapses but while the 25 is still in flight, landing the caption
    // before the date it belongs to.
    if (el.dataset.gated === "date") return;
    el.classList.add("show");
    if (el.id === "calendarIntro") playCalendarIntro(el);
  }

  // Space out items that come into view together, so a screenful
  // cascades rather than arriving as one block.
  function queueReveal(el) {
    const now = performance.now();
    const due = Math.max(now, revealCursor);
    revealCursor = due + REVEAL_GAP;
    const wait = due - now;
    if (wait < 8) revealOne(el);
    else clock.after(wait, () => revealOne(el));
  }

  // Content reveals as the guest scrolls to it, instead of on a timer —
  // each .reveal-item fades in the moment it enters the viewport.
  function startScrollReveal() {
    revealCursor = 0;

    if (prefersReducedMotion) {
      // Nothing to scroll-gate: get straight to a fully readable state.
      revealItems.forEach(revealOne);
      return;
    }

    if (scrollObserver) scrollObserver.disconnect();
    scrollObserver = new IntersectionObserver(
      (entries) => {
        entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              Number(a.target.dataset.reveal) - Number(b.target.dataset.reveal)
          )
          .forEach((entry) => {
            scrollObserver.unobserve(entry.target);
            queueReveal(entry.target);
          });
      },
      { threshold: 0.15 }
    );
    revealItems.forEach((el) => scrollObserver.observe(el));
  }

  function resetSequence() {
    clock.clearAll();
    calClock.clearAll();
    sequenceActive = false;
    sequenceDone = false;
    letterSettled = false;
    calendarPhase = "idle";
    revealCursor = 0;
    if (scrollObserver) {
      scrollObserver.disconnect();
      scrollObserver = null;
    }
    if (calVisObserver) {
      calVisObserver.disconnect();
      calVisObserver = null;
    }
    clearSnowfall();

    flipCard.dataset.flipped = "false";
    flipCard.dataset.flap = "closed";
    scene.dataset.seal = "full";
    sealBtn.dataset.pressed = "false";
    sealBtn.disabled = false;

    letter.dataset.risen = "false";
    letter.dataset.out = "false";
    letter.setAttribute("aria-hidden", "true");
    letter.inert = true;
    envelopeStage.dataset.hidden = "false";
    envelopeStage.dataset.sinking = "false";
    envelopeStage.inert = false;
    scene.style.height = "";
    scene.style.overflow = "";
    scene.style.removeProperty("--scene-dur");
    scene.style.removeProperty("--scene-ease");

    envelopeFront.setAttribute("aria-hidden", "false");
    envelopeFront.inert = false;
    envelopeBack.setAttribute("aria-hidden", "true");
    envelopeBack.inert = true;

    revealItems.forEach((el) => el.classList.remove("show"));
    bigDate.style.removeProperty("transition");
    letterPaper.querySelectorAll(".date-morph").forEach((el) => el.remove());
    calendarIntro.classList.remove("days-shown", "circled", "lifting");
    calendarIntro.style.display = "";
    calendarIntro.querySelectorAll(".cal-page").forEach((page) => {
      page.classList.remove("tearing", "settled");
    });

    envelopeFront.focus({ preventScroll: true });
    announce("Invitation reset. Tap the envelope to begin again.");
  }

  /* ------------------------------------------------------------
     Layout robustness

     The scene's height is driven by a measurement of the letter, so
     anything that changes the letter's height after that measurement
     (webfonts arriving late — near-guaranteed on a cold WhatsApp in-app
     browser — or a photo finally loading) would otherwise leave the
     letter clipped or trailing an empty gap. This is exactly the layout
     bug the original brief called out, so it re-measures rather than
     trusting a single reading.
     ------------------------------------------------------------ */

  function remeasureIfSettled() {
    if (letterSettled) measureScene();
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(remeasureIfSettled).catch(() => {});
  }

  if (window.ResizeObserver) {
    new ResizeObserver(() => {
      if (letterSettled) requestAnimationFrame(remeasureIfSettled);
    }).observe(letter);
  }

  // A missing or slow photo should read as a blank plate in its frame,
  // not a broken-image glyph in the middle of the invitation.
  // A 1x1 transparent GIF. Swapping the src for this is the only
  // dependable way to clear a browser's broken-image glyph — hiding the
  // alt text still leaves the icon drawn in most engines.
  const BLANK_PIXEL =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

  document.querySelectorAll(".photo-block img").forEach((img) => {
    const markMissing = () => {
      const frame = img.closest(".photo-block");
      if (frame) frame.classList.add("photo-missing");
      if (!img.src.startsWith("data:")) img.src = BLANK_PIXEL;
    };
    img.addEventListener("error", markMissing);
    // This script is deferred, so an image can easily have finished
    // failing before the listener above was ever attached — an "error"
    // event that has already fired will never fire again.
    if (img.complete && img.naturalWidth === 0) markMissing();
  });

  /* ------------------------------------------------------------
     Events
     ------------------------------------------------------------ */

  envelopeFront.addEventListener("click", flipEnvelope);

  sealBtn.addEventListener("click", runOpeningSequence);

  replayBtn.addEventListener("click", resetSequence);

  /* ------------------------------------------------------------
     WhatsApp availability CTAs
     ------------------------------------------------------------ */

  function buildMessage(available) {
    const name = guestName || "";
    const who = name ? `It’s ${name} — ` : "";
    if (available) {
      return `${who}I’m keeping Christmas Day free. Count me in 🥂`;
    }
    return `${who}I’m so sorry, I won’t be able to make it on ${WEDDING_DATE_LABEL}. ❤️`;
  }

  function sendRsvp(available) {
    const message = buildMessage(available);
    const side = getSide();
    const phone = side ? RSVP_PHONES[side] : null;

    if (!phone) {
      // No (or unrecognised) &side= on this link, so we don't know whose
      // WhatsApp to route the reply to — fail safe instead of guessing.
      console.warn(
        "[wedding-invitation] No valid ?side=bride|groom on this link, so RSVP couldn't be routed. Message that would have been sent:",
        message
      );
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(message).catch(() => {});
      }
      announce("We couldn't tell who to send this to, but your reply has been copied so you can send it manually.");
      window.alert(
        "Thanks! We couldn't tell whose invitation this is — your message was copied to your clipboard so you can send it directly:\n\n" + message
      );
      return;
    }

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.location.href = url;
  }

  btnYes.addEventListener("click", () => sendRsvp(true));
  btnNo.addEventListener("click", () => sendRsvp(false));

  /* ------------------------------------------------------------
     Add to calendar

     #btnCalendar is a real <a>, configured below with a plain href
     before the guest can interact with it. On mobile that href becomes
     webcal://<host>/assets/wedding-event.ics: a custom URL scheme, not a
     content type, so there's nothing for a browser to render — it has to
     hand the request to whatever the OS registered for it (Calendar),
     the same way tel:/mailto: links always escape to the Phone/Mail app
     regardless of which browser triggered them.

     This used to try a data: URI on iOS first, hoping to land on
     Calendar's native single-event "Add Event" screen instead of a
     subscribe prompt. That handoff is a Safari-the-app feature, though —
     confirmed, by testing a real link tap inside WhatsApp's in-app
     browser (the way this invitation is normally opened), that it still
     doesn't apply there. Guests were landing on a downloaded file with
     no obvious next step instead. webcal: trades "possibly the nicer
     single-event dialog, sometimes a dead end" for "always the same,
     working outcome" — worth it on a page most guests reach through an
     in-app browser rather than full Safari.
     ------------------------------------------------------------ */

  {
    const ua = navigator.userAgent || "";
    const isMobile =
      /Android|iP(hone|od|ad)/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    if (isMobile) {
      btnCalendar.href = `webcal://${window.location.host}${ICS_PATH}`;
      btnCalendar.removeAttribute("download");
    }
    // Desktop keeps the plain href + download="..." already set in the HTML.
  }

  /* ------------------------------------------------------------
     Snowfall — sparse, ambient, decorative only. Starts once the
     envelope is actually open (see riseLetter()), not on page load.
     ------------------------------------------------------------ */

  const snowfallEl = document.getElementById("snowfall");

  function startSnowfall() {
    if (prefersReducedMotion || !snowfallEl || snowfallEl.childElementCount) return;

    const FLAKE_COUNT = 16;
    for (let i = 0; i < FLAKE_COUNT; i++) {
      const flake = document.createElement("span");
      flake.className = "snowflake";
      const duration = 11 + Math.random() * 10; // 11–21s to fall the viewport
      const size = 3 + Math.random() * 4;
      flake.style.setProperty("--size", `${size.toFixed(1)}px`);
      flake.style.setProperty("--x", `${(Math.random() * 100).toFixed(1)}vw`);
      // How far it wanders left and right on the way down.
      flake.style.setProperty("--sway", `${(8 + Math.random() * 16).toFixed(0)}px`);
      // The largest flakes read as the nearest, so let a few of those sit
      // slightly out of focus — cheap depth, and it stops the drift
      // looking like one flat plane of identical dots.
      flake.style.setProperty("--blur", size > 5.6 ? "0.6px" : "0px");
      flake.style.setProperty("--fall-duration", `${duration.toFixed(1)}s`);
      // Negative delay starts each flake already mid-cycle, at a random
      // point, so they don't all begin at the top together.
      flake.style.setProperty("--fall-delay", `${(-Math.random() * duration).toFixed(1)}s`);
      flake.style.setProperty("--peak-opacity", (0.6 + Math.random() * 0.35).toFixed(2));
      snowfallEl.appendChild(flake);
    }
  }

  function clearSnowfall() {
    if (snowfallEl) snowfallEl.replaceChildren();
  }

  /* ------------------------------------------------------------
     Init
     ------------------------------------------------------------ */

  scene.dataset.seal = "full";
  flipCard.dataset.flap = "closed";
  envelopeBack.inert = true;
  letter.inert = true;

  // With prefers-reduced-motion, the tap-to-flip / tap-to-break steps stay
  // (per the CSS, transitions are forced near-instant) so the guest still
  // reaches a fully readable invitation without any long physical animation.
})();
