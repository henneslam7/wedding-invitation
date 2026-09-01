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
    letterRise: 1780,
    envelopeHide: 2600
  };

  const CAL_MONTH_COUNT = 12; // January through December

  // Sub-timing (ms) for the mini calendar's own tear-off-the-months →
  // reveal the dates → circle → hold → leave beat, offsets measured from
  // the moment it scrolls into view. Paced deliberately slow, like a
  // little story rather than a blur — a page torn off a real desk pad
  // per month (11 tears; December is the page left underneath), not a
  // fast text swap.
  const CAL_TIMING = {
    monthStep: 260, // x11 tears, January through November
    tearDuration: 520, // must match .cal-pad .cal-page.tearing's transition
    daysRevealDelay: 300, // after the last tear lands (December revealed)
    daysRevealDuration: 450,
    circleDelay: 400, // after the dates are visible
    circleDuration: 650,
    hold: 600,
    leaveDuration: 450
  };

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
  const letter = document.getElementById("letter");
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
  let revealedCount = 0;
  const clock = timers();

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

    clock.after(at(T.envelopeHide), () => {
      envelopeStage.dataset.hidden = "true";
      envelopeStage.inert = true;
    });
  }

  function riseLetter() {
    letter.dataset.risen = "true";
    letter.setAttribute("aria-hidden", "false");
    letter.inert = false;

    requestAnimationFrame(() => {
      const height = letter.getBoundingClientRect().height;
      scene.style.height = `${Math.ceil(height + 40)}px`;
      // Un-clip now that the scene has grown to fit the real content — see
      // the comment on the base .scene rule for why it starts clipped.
      scene.style.overflow = "visible";
    });

    // Snow only once the letter is actually out of the envelope, and the
    // content below reveals itself as the guest scrolls to it, rather
    // than on a fixed timer.
    startSnowfall();
    startScrollReveal();
  }

  function playCalendarIntro(el) {
    const scale = prefersReducedMotion ? 0 : 1;
    const at = (ms) => Math.round(ms * scale);
    const pages = Array.from(el.querySelectorAll(".cal-page"));
    const finalPage = el.querySelector(".cal-page-final");

    // Tear off every month but the last, January through November — a
    // page ripped from a real desk pad per month (paced deliberately
    // slow, as its own little story beat), each falling away a little
    // differently (not identical, matching the wax fragments/photos
    // elsewhere), revealing the page beneath. December is the page left
    // underneath once the others are gone.
    for (let i = 0; i < pages.length - 1; i++) {
      const page = pages[i];
      clock.after(at(i * CAL_TIMING.monthStep), () => {
        page.style.setProperty("--tear-x", `${(Math.random() * 36 - 18).toFixed(0)}px`);
        page.style.setProperty("--tear-y", `${(84 + Math.random() * 28).toFixed(0)}px`);
        page.style.setProperty("--tear-rot", `${(Math.random() * 20 - 10).toFixed(0)}deg`);
        page.classList.add("tearing");
      });
    }

    const monthFlipEnd = (CAL_MONTH_COUNT - 1) * CAL_TIMING.monthStep + CAL_TIMING.tearDuration;
    clock.after(at(monthFlipEnd), () => finalPage.classList.add("settled"));
    const daysStart = monthFlipEnd + CAL_TIMING.daysRevealDelay;
    const circleStart = daysStart + CAL_TIMING.daysRevealDuration + CAL_TIMING.circleDelay;
    const leaveStart = circleStart + CAL_TIMING.circleDuration + CAL_TIMING.hold;
    const doneAt = leaveStart + CAL_TIMING.leaveDuration;

    clock.after(at(daysStart), () => el.classList.add("days-shown"));
    clock.after(at(circleStart), () => el.classList.add("circled"));
    clock.after(at(leaveStart), () => el.classList.add("leaving"));
    clock.after(at(doneAt), () => {
      // Collapse out of the layout once fully faded, rather than leaving
      // an empty gap where it used to be — and re-measure, since this is
      // the only reveal-item whose disappearance actually changes the
      // letter's rendered height (every other one only toggles opacity,
      // never display, so it never affects layout).
      el.style.display = "none";
      requestAnimationFrame(() => {
        const height = letter.getBoundingClientRect().height;
        scene.style.height = `${Math.ceil(height + 40)}px`;
      });
    });
  }

  function revealOne(el) {
    el.classList.add("show");
    if (el.id === "calendarIntro") playCalendarIntro(el);
    revealedCount++;
    if (revealedCount === revealItems.length) {
      sequenceActive = false;
      sequenceDone = true;
      announce("Invitation from Jessica and Hennes: keep Christmas Day, 25 December 2027, for a lunch wedding at Kimpton Tsim Sha Tsui Hong Kong.");
    }
  }

  // Content reveals as the guest scrolls to it, instead of on a timer —
  // each .reveal-item fades in the moment it enters the viewport.
  function startScrollReveal() {
    revealedCount = 0;

    if (prefersReducedMotion) {
      // Nothing to scroll-gate: get straight to a fully readable state.
      revealItems.forEach(revealOne);
      return;
    }

    if (scrollObserver) scrollObserver.disconnect();
    scrollObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          scrollObserver.unobserve(entry.target);
          revealOne(entry.target);
        });
      },
      { threshold: 0.15 }
    );
    revealItems.forEach((el) => scrollObserver.observe(el));
  }

  function resetSequence() {
    clock.clearAll();
    sequenceActive = false;
    sequenceDone = false;
    revealedCount = 0;
    if (scrollObserver) {
      scrollObserver.disconnect();
      scrollObserver = null;
    }
    clearSnowfall();

    flipCard.dataset.flipped = "false";
    flipCard.dataset.flap = "closed";
    scene.dataset.seal = "full";
    sealBtn.dataset.pressed = "false";
    sealBtn.disabled = false;

    letter.dataset.risen = "false";
    letter.setAttribute("aria-hidden", "true");
    letter.inert = true;
    envelopeStage.dataset.hidden = "false";
    envelopeStage.inert = false;
    scene.style.height = "";
    scene.style.overflow = "";

    envelopeFront.setAttribute("aria-hidden", "false");
    envelopeFront.inert = false;
    envelopeBack.setAttribute("aria-hidden", "true");
    envelopeBack.inert = true;

    revealItems.forEach((el) => el.classList.remove("show"));
    calendarIntro.classList.remove("days-shown", "circled", "leaving");
    calendarIntro.style.display = "";
    calendarIntro.querySelectorAll(".cal-page").forEach((page) => {
      page.classList.remove("tearing", "settled");
    });

    envelopeFront.focus({ preventScroll: true });
    announce("Invitation reset. Tap the envelope to begin again.");
  }

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
      flake.style.setProperty("--size", `${(3 + Math.random() * 4).toFixed(1)}px`);
      flake.style.setProperty("--x", `${(Math.random() * 100).toFixed(1)}vw`);
      flake.style.setProperty("--drift", `${(Math.random() * 60 - 30).toFixed(0)}px`);
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
