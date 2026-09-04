# Build Phases

Status tracker for this project. Each phase lists what it delivers and how we know it's
actually done (not just "code exists"). Update the Status line as work lands; do not mark a
phase done until the criteria are met on a real device where the phase requires it.

## Phase 0 — Research & architecture
Status: In progress.
- docs/research.md, docs/architecture.md written.
- Database schema drafted.
- Offline, printing, and state-machine strategies defined.
Done when: architecture docs exist and the owner has reviewed them.

## Phase 1 — Repository foundation
Status: Not started.
- Monorepo scaffold (apps/admin, apps/booth, packages/*).
- Auth for owner/employee.
- Database schema + migrations.
- Admin shell (nav, empty pages for Dashboard/Events/Booths/Templates/Photos/Galleries/
  Customers/Employees/Reports/Settings).
- Object storage wiring (Cloudflare R2) for future photo uploads.
Done when: an authenticated owner can log into the admin shell and see empty, correctly
structured pages backed by real (if empty) database tables.

## Phase 2 — Booth MVP (online-only first pass)
Status: Not started.
- Welcome screen, touch to start, camera preview, countdown, capture, preview, basic 4x6
  template render, thank you, automatic reset.
- This pass may still assume connectivity; offline is Phase 3.
Done when: a single photo can go from "touch to start" to a rendered 4x6 preview on an
actual iPad in Safari/installed PWA.

## Phase 3 — Offline architecture
Status: Not started.
- Local persistence (IndexedDB) for sessions/photos.
- Event preload for offline availability.
- Sync queue with retry/backoff.
- Recovery after app/device restart.
Done when: Wi-Fi can be disconnected mid-event and the booth keeps capturing, rendering, and
queuing without errors, then syncs correctly once reconnected.

## Phase 4 — Printing
Status: Not started.
- CanonSelphyAdapter against the iOS print sheet.
- PrintJob model + statuses that reflect real, known information only.
- Print queue UI, retry on failure, duplicate-print prevention.
- Decision point: evaluate whether a native iOS shell is justified yet.
Done when: a real Canon SELPHY has produced a correct 4x6 print from the booth, including at
least one deliberate failure-and-retry test.

## Phase 5 — QR & galleries
Status: Not started.
- Cloud upload of originals/final/thumbnails.
- Per-event gallery with privacy modes (public/private/PIN/disabled).
- QR pointing at the guest's specific photo, with honest offline/"preparing" states.
Done when: a guest can scan a QR after a real print and reach their own photo, including the
degraded-but-honest states when offline.

## Phase 6 — Employee setup
Status: Not started.
- Preflight/system check screen.
- Setup checklist + setup photo capture.
- Printer test flow.
- Hidden employee-PIN operator panel.
Done when: an employee can go through the full checklist on a real booth and reach "Ready for
Event" with accurate pass/fail per item.

## Phase 7 — Remote monitoring
Status: Not started.
- Heartbeats from booth to cloud.
- Live booth/event status views (owner + mobile).
- Activity log + session model for dispute resolution.
Done when: the owner can tell from their phone, using real heartbeat data, whether a live
booth is online, printing, and healthy.

## Phase 8 — Template editor
Status: Not started.
- Visual editor (canvas + layers + properties panel).
- PNG-overlay-plus-photo-placeholder workflow.
- Template library + categories + event variable binding.
Done when: a new template can be built or uploaded and used on a real event without
engineering involvement.

## Phase 9 — Reports & polish
Status: Not started.
- Analytics/reporting views.
- Mobile admin refinement.
- Error-state and UX polish pass.
Done when: dashboard numbers match real event data and mobile admin is usable one-handed.

## Reporting convention

When a phase update is given, it will state, per capability: UI created / job or record
generated / integration implemented / tested in simulator / tested on physical iPad / tested
against the real Canon SELPHY. These are different claims and will not be collapsed into a
single "done".
