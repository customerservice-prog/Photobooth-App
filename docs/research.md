# Phase 0 Research: Hardware & Platform Constraints

Status: research/analysis only. Nothing here has been validated on physical hardware yet.
This document exists so we design the real architecture around real iOS/iPadOS limits
instead of discovering them mid-build.

## 1. iPad Safari / PWA camera capture

- Safari on iPadOS supports `getUserMedia` for live camera preview in a web app/PWA,
  including installed "Add to Home Screen" PWAs. This is sufficient for a full-screen
  live preview and countdown UI.
- Still-frame capture is normally done by drawing the current video frame to a `<canvas>`
  and exporting it (e.g. `canvas.toBlob`). This captures at the *video track's* resolution,
  not the sensor's full photo resolution. iPad front and rear cameras can usually be
  requested at 1080p or higher via `getUserMedia` constraints, but true high-megapixel still
  capture (the resolution the native Camera app gets) is not reliably exposed to web content.
- Practical implication: we should request the highest stable video resolution/frame rate
  the device advertises, and treat that as our capture ceiling for the web/PWA version.
  A native layer (see §4) would be required to reach true native-camera still resolution.
- Orientation/mirroring must be handled manually (CSS transform for preview mirroring,
  separate handling for the saved image) since the raw camera frame is not auto-mirrored.

## 2. PWA offline capabilities & local storage limits

- Service workers + the Cache API let a PWA run its shell offline once installed/visited.
- Local data persistence options: IndexedDB (best fit for photos/session records, works
  with Blobs), and the Origin Private File System / `navigator.storage` where available.
- iOS enforces per-origin storage quotas and, historically, has been more aggressive than
  desktop browsers about evicting data for web content under storage pressure, especially
  if the site is only visited in Safari rather than installed as a home-screen PWA. Installed
  PWAs behave more predictably, but eviction risk is not zero.
- Practical implication: local storage should be treated as *durable but not sacred* —
  originals must sync to the cloud as soon as possible, and we should surface a storage
  health indicator to the employee/owner rather than assuming iOS will never reclaim space.

## 3. AirPrint & Canon SELPHY printing from iPad

- Canon SELPHY compact photo printers (CP1500/CP1300/square series, etc.) commonly support
  AirPrint over the same Wi-Fi network, which is the only Apple-sanctioned way for a web
  page (Safari/PWA) to reach a printer. Web content cannot call AirPrint programmatically —
  `window.print()` opens the standard iOS print sheet, where the guest/employee must pick the
  printer and press Print. There is no silent/headless printing API available to web content
  on iOS.
- The print sheet also does not reliably report back to the calling web page whether the
  physical print actually completed, jammed, or ran out of paper/ribbon — iOS only tells us
  the job was handed to the print system, not the printer's real end state.
- Practical implication: for the pure web/PWA version, printing must go through the native
  print sheet, and our print job status model must distinguish "SENT_TO_PRINT_SYSTEM" from
  "PRINTING"/"COMPLETED" — we should not claim COMPLETED unless we truly have that signal.

## 4. Native iOS shell (bridge) option

- A thin native (Swift) wrapper embedding our web UI (WKWebView) can expose native bridges
  the web content cannot reach directly, notably: enumerating/selecting a specific AirPrint
  printer without showing the full system sheet, driving `UIPrintInteractionController`
  programmatically, better camera control (AVFoundation gives access to full sensor resolution
  and manual focus/exposure), Guided Access-aware kiosk behavior, and more reliable background/
  wake-lock behavior than a browser tab.
- This does not require rewriting the booth in Swift. Only a thin native shell + bridge layer
  is native; the booth UI/business logic stays in the shared web/TS codebase and is loaded
  inside the shell (or reused via a WebView + JS bridge).
- Recommendation: build the booth as a PWA first for Phase 2/3 (camera, capture, offline,
  local render, print via system sheet). Introduce the native shell in Phase 4 specifically to
  solve silent/managed printing and tighter kiosk control once the core flow is proven. Do not
  block the first working booth on native development.

## 5. Kiosk mode / Guided Access

- iPadOS's built-in Guided Access can lock the device to a single app and disable the home
  button/gestures, screen sleep, etc. It is a real, supported way to prevent guests from
  leaving the booth app, but it is a device-level setting an employee must enable manually
  (triple-click side/home button) — we cannot enable it programmatically from our app.
- Within a plain browser tab (no native shell), we cannot fully block Safari's own UI
  (address bar, tab switcher, swipe-to-go-back gestures) — a PWA installed to the home screen
  removes the browser chrome and is meaningfully more kiosk-like, but Guided Access is still
  the strongest guarantee against guests escaping the app.
- Practical implication: our setup checklist must include "enable Guided Access" as an
  explicit employee step, and our in-app "hidden admin" exit (long-press logo + PIN) is
  a software-level safeguard layered on top of, not a replacement for, Guided Access.

## 6. Summary of architectural consequences

- Build booth as an installable PWA with an offline-first local data layer (IndexedDB) as
  the default Phase 1-3 target.
- Printing goes through the iOS print sheet initially; print job statuses must reflect what
  iOS actually tells us, not an assumed successful print.
- Plan a native iOS shell for Phase 4+ specifically to improve printer control, still-image
  resolution, and kiosk guarantees — architected so the shared UI/business logic packages
  (`booth-core`, `renderer`, `templates`, `ui`) are reused, not rewritten.
- Guided Access is a required manual step in the employee setup checklist, not something the
  software can toggle on its own.
