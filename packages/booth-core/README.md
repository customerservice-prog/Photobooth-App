# packages/booth-core

Framework-agnostic booth session logic: the guest-facing state machine and the rules around
it. Kept separate from any React/UI code so it can be unit tested headlessly and reused if the
booth UI is ever rehosted (e.g. inside a native iOS shell).

## Scope

- The booth state machine (see docs/architecture.md §3):
  IDLE -> STARTING_SESSION -> CAMERA_READY -> COUNTDOWN -> CAPTURING -> PROCESSING -> PREVIEW
  -> (PRINTING | SHARING) -> THANK_YOU -> RESETTING -> IDLE, with ERROR reachable from any state.
- Inactivity timeout rules per state (preview timeout, share timeout, thank-you duration),
  driven by event configuration rather than hardcoded constants.
- Session lifecycle: creating a PhotoSession (client-generated ULID), tracking captures,
  retakes (respecting allowRetake/maxRetakes), and completion.
- Persistence hooks: on every transition, current state + session id are handed to
  packages/offline so an app/device restart can resume rather than losing the guest's photo.
- Guest-safe vs. internal error message separation for ERROR states.

## Explicit non-goals

- No camera access code (that is UI/platform-specific, lives in apps/booth).
- No rendering (that is packages/renderer).
- No printing or network calls (packages/printing, packages/offline own those side effects;
  booth-core only emits intents/events for them to act on).

## Status

Not yet implemented (Phase 2). This README reserves the package's responsibility so the state
machine is designed once, deliberately, per docs/architecture.md, instead of growing ad hoc
inside React components.
