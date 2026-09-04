# System Architecture

Status: Phase 0 design. Describes the intended architecture; implementation lands incrementally
across the phases in `docs/phases.md`. This document will be updated as decisions change.

## 1. High-level shape

Two applications, sharing packages:

- **apps/admin** — Next.js app for owner + employee. Talks to the cloud API/DB directly
  (server components / route handlers). Requires internet.
- **apps/booth** — Installable PWA for the iPad. Offline-first. Talks to local storage first,
  cloud second. Must keep serving guests with zero connectivity.

Shared packages (`packages/*`) contain the logic both apps need, or that needs to be testable
in isolation from any UI: booth state machine, template schema, renderer, offline/sync engine,
printing abstraction, database schema/client, shared types, and a typed API client.

## 2. The booth is offline-first, not "cloud with a fallback"

The booth's local device storage (IndexedDB) is the source of truth for an in-progress event.
The cloud is a synchronization target, not a dependency. Concretely:

1. Employee preloads an event onto the booth while online (event config, template, assets,
   fonts, printer config) -> cached locally, booth shows "Event available offline".
2. During the event, every guest session is created, captured, rendered, saved, and (if
   enabled) printed using only local data and local processing.
3. Every state change is also appended to a local sync queue. A background process drains
   this queue to the cloud API whenever connectivity exists, using idempotent writes (see §6).
4. If the app or iPad restarts mid-event, the active event/session state is reloaded from local
   storage, not re-fetched from the cloud.

The cloud is required for: admin dashboard, remote monitoring, galleries, cross-device history,
backups, and configuration authoring. It is explicitly not required for capture/print during
a loaded event.

## 3. Booth UI state machine

Modeled as an explicit finite state machine (implemented in packages/booth-core), not ad-hoc
booleans:

IDLE -> STARTING_SESSION -> CAMERA_READY -> COUNTDOWN -> CAPTURING -> PROCESSING
     -> PREVIEW -> (PRINTING | SHARING repeatable) -> THANK_YOU -> RESETTING -> IDLE
Any state -> ERROR -> (RESETTING | IDLE)

Rules:
- Every state except IDLE has an inactivity timeout that forces a transition toward RESETTING
  (preview timeout, share timeout, thank-you display time, all configurable per event).
- PRINTING and SHARING can both be reachable from PREVIEW and are not mutually exclusive.
- State plus the active session id are persisted to local storage on every transition, so an
  app restart resumes rather than silently losing the guest's photo.
- ERROR states carry a guest-safe message and an internal diagnostic message; guests only ever
  see the former.

## 4. Printing strategy

See docs/research.md sections 3-4 for the underlying constraints. Summary of the resulting
design:

- packages/printing defines a PrinterAdapter interface (connect, status, print, cancel,
  capabilities) so booth code never talks to a specific printer directly.
- CanonSelphyAdapter is the first, priority implementation. In the PWA phase it drives the
  standard iOS print sheet (AirPrint); there is no silent print path available to web content,
  so the UI must account for the system sheet appearing.
- Print job status values reflect only what we can actually know:
  QUEUED -> SENDING -> SENT_TO_PRINT_SYSTEM -> (COMPLETED | FAILED). We do not claim
  COMPLETED unless we have a real signal; if iOS only tells us the job was handed off, the
  job is left at SENT_TO_PRINT_SYSTEM and the UI/logs say so honestly.
- A later native iOS shell (Phase 4+) can implement a richer adapter with programmatic
  UIPrintInteractionController access, better status, and printer pre-selection, same
  interface, swapped implementation.
- Every print attempt creates a PrintJob row locally first; retries increment attempts
  rather than creating new jobs, and use an idempotency key so a network retry of the upload
  never creates a duplicate physical print record.

## 5. Photo processing pipeline

CAPTURE (canvas frame from live video track)
  -> SAVE ORIGINAL locally (untouched)
  -> RENDER FINAL (packages/renderer: original + template JSON + event variables -> print image)
  -> SAVE FINAL locally (4x6 at 300dpi target: 1200x1800 or 1800x1200)
  -> SAVE THUMBNAIL locally (for admin/gallery grids)
  -> CREATE PhotoSession + Capture + RenderedPhoto records locally
  -> ENQUEUE PrintJob if printing enabled
  -> ENQUEUE sync of originals/final/thumbnail/session to cloud

The renderer is a pure function of (image, template, variables) -> image, deliberately kept out
of any React component so it can be unit tested headlessly (see packages/renderer).

## 6. Sync queue & idempotency

- packages/offline owns a durable queue of SyncRecords (PENDING -> UPLOADING -> SYNCED,
  or FAILED -> RETRY_SCHEDULED with exponential backoff).
- All client-generated entities (sessions, captures, rendered photos, print jobs, activity log
  entries) use client-generated ULIDs, so they can be created fully offline and safely retried
  without waiting on a server round trip and without ever depending on autoincrement IDs.
- The cloud API's write endpoints for these entities are idempotent on that client-generated ID:
  replaying a queued upload updates/no-ops rather than duplicating.
- Local media (originals especially) is never deleted just because an upload was attempted.
  Cleanup only happens once a cloud upload is verified AND retention rules are satisfied AND
  we are safely past the event, this logic lives in packages/offline and is unit tested.

## 7. Device heartbeat & remote monitoring

The booth sends a heartbeat (device id, booth id, event id, battery, network, printer/camera
status, local storage free, unsynced counts, pending prints, app version) to the cloud whenever
it has connectivity, best-effort, not required for booth operation. Admin renders "last seen"
from the most recent heartbeat; if none has arrived recently, admin shows last-known state as
stale/offline rather than guessing.

## 8. Data model

See packages/database/schema.prisma for the authoritative schema. Entities: Organization
(singleton, see §9), User, Employee, Customer, Event, Booth, Device, Template,
TemplateElement, PhotoSession, Capture, RenderedPhoto, PrintJob, Share, Gallery, Heartbeat,
ActivityLog, SyncRecord. Template layout uses a versioned JSON structure (see
packages/templates) rather than one-off React props, so it can be rendered by both the admin
template editor and the headless renderer.

## 9. Single-tenant now, multi-tenant-safe later

There is exactly one Organization row (Friendly Party Rental) for Phase 1. The schema
includes an organizationId foreign key on tenant-scoped tables purely to avoid a painful
migration later, but there is no organization management UI, no signup flow, and no
multi-tenant routing logic in Phase 1. Branding fields are configurable per event/organization
rather than hardcoded, but that is about clean config, not a SaaS feature.

## 10. Kiosk & admin-access boundary

- Guest booth PWA has zero navigation, no visible admin affordances, and no route to
  event/admin data other than the current event's own public gallery/QR flow.
  Long-press the logo (5s) then employee PIN reveals a hidden operator panel (status, print
  test, retry sync, restart session, end event). See docs/research.md §5 for why Guided Access
  is still required as the real kiosk guarantee.
- Employee accounts are scoped (their own deliveries/events; no billing, no global settings,
  no cross-customer data, no deletion of events/galleries).
- Owner/admin accounts have full access.
