# apps/booth

Guest-facing installable PWA that runs on the iPad photo booth. This is the "appliance", not
a normal website — see the Core Product Philosophy in the root README. Full-screen, no
navigation, no visible admin affordances. Offline-first: see docs/architecture.md §2.

## What lives here vs. in packages

- apps/booth owns: camera access (getUserMedia), full-screen UI/animation, screen composition
  for the guest flow (welcome, countdown, capture, preview, print/QR/retake, thank you), the
  hidden employee-PIN operator panel, and wiring the packages together for this specific
  platform (iPad Safari/PWA today; potentially a native shell later per docs/research.md §4).
- packages/booth-core owns the state machine and session rules.
- packages/renderer owns turning a capture into a finished 4x6 image.
- packages/offline owns local persistence and the sync queue.
- packages/printing owns talking to the printer.

apps/booth should mostly be "glue" — screens that call into these packages — not where business
logic accumulates.

## Guest flow (Phase 2 target)

TOUCH TO START -> COUNTDOWN -> PHOTO -> PREVIEW -> PRINT / QR / RETAKE -> THANK YOU ->
AUTOMATIC RESET. See docs/architecture.md §3 for the full state machine.

## Status

Not yet implemented. Phase 2 target: a single photo captured, rendered to a 4x6 template, and
previewed on a real iPad — while still assuming connectivity. Offline behavior lands in Phase 3,
printing in Phase 4.
