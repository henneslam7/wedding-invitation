(() => {
  "use strict";

  /* ------------------------------------------------------------
     Config
     ------------------------------------------------------------ */

  // TODO: set the couple's WhatsApp number in international format, no
  // leading "+", e.g. "85212345678". Leave blank until confirmed.
  const RSVP_PHONE = "";

  const WEDDING_DATE_LABEL = "25 December 2027";

  const SEAL_ASSETS = [
    "/assets/seal-full.webp",
    "/assets/seal-cracked.webp",
    "/assets/seal-frag-left.webp",
    "/assets/seal-frag-bottom.webp",
    "/assets/seal-frag-right.webp"
  ];

  // Sequence timings (ms), matched to the creative brief.
  const T = {
    pressed: 0,
    cracked: 160,
    broken: 620,
    falling: 700,
    flapOpen: 1100,
    letterRise: 1780,
    envelopeHide: 2600,
    textReveal: 2950
  };

  const REVEAL_STAGGER = 190;

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
  const letter = document.getElementById("letter");
  const replayBtn = document.getElementById("replayBtn");
  const btnYes = document.getElementById("btnYes");
  const btnNo = document.getElementById("btnNo");
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

  /* ------------------------------------------------------------
     Sequence state machine
     ------------------------------------------------------------ */

  let sequenceActive = false;
  let sequenceDone = false;
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

    clock.after(at(T.textReveal), () => {
      revealText();
    });
  }

  function riseLetter() {
    letter.dataset.risen = "true";
    letter.setAttribute("aria-hidden", "false");
    letter.inert = false;

    requestAnimationFrame(() => {
      const height = letter.getBoundingClientRect().height;
      scene.style.height = `${Math.ceil(height + 40)}px`;
    });
  }

  function revealText() {
    revealItems.forEach((el, i) => {
      const delay = prefersReducedMotion ? 0 : i * REVEAL_STAGGER;
      clock.after(delay, () => {
        el.classList.add("show");
        if (i === revealItems.length - 1) {
          sequenceActive = false;
          sequenceDone = true;
          announce("Invitation from Jessica and Hennes: keep Christmas Day, 25 December 2027, for a lunch wedding at Kimpton Tsim Sha Tsui Hong Kong.");
        }
      });
    });
  }

  function resetSequence() {
    clock.clearAll();
    sequenceActive = false;
    sequenceDone = false;

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

    envelopeFront.setAttribute("aria-hidden", "false");
    envelopeFront.inert = false;
    envelopeBack.setAttribute("aria-hidden", "true");
    envelopeBack.inert = true;

    revealItems.forEach((el) => el.classList.remove("show"));

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

    if (!RSVP_PHONE) {
      // Dev fallback: RSVP_PHONE not configured yet.
      console.warn(
        "[wedding-invitation] RSVP_PHONE is not set. Configure it in app.js. Message that would have been sent:",
        message
      );
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(message).catch(() => {});
      }
      announce("RSVP is not fully set up yet, but your reply has been copied so you can send it manually.");
      window.alert(
        "Thanks! RSVP isn't fully connected yet — your message was copied to your clipboard:\n\n" + message
      );
      return;
    }

    const url = `https://wa.me/${RSVP_PHONE}?text=${encodeURIComponent(message)}`;
    window.location.href = url;
  }

  btnYes.addEventListener("click", () => sendRsvp(true));
  btnNo.addEventListener("click", () => sendRsvp(false));

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
