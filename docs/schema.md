# Database Schema Overview

Companion doc to `packages/database/schema.prisma`. This describes what each model
is for in plain language. If this doc and the schema ever disagree, the schema file
is the source of truth — update this doc to match, not the other way around.

Status: DESIGN ONLY, same as the schema itself. Nothing here has been migrated
against a real database yet.

## Tenancy

Phase 1 is single-tenant: there is exactly one `Organization` row (Friendly Party
Rental). Tenant-scoped models (`User`, `Employee`, `Customer`, `Event`, `Booth`,
`Template`) carry an `organizationId` anyway, so a future multi-tenant migration
doesn't require reshaping every table — but there is no signup flow, billing, or
org-switching in Phase 1.

## People & access

- `User` — owner/admin accounts for the admin dashboard. `UserRole` is `OWNER` or `ADMIN`.
- `Employee` — drivers/setup staff. `EmployeeRole` is `EMPLOYEE` or `DRIVER`. Employees
  carry a hashed PIN (`pinHash`) used only for the hidden operator panel on the booth
  itself, not for admin dashboard login.
- `Customer` — the renting customer's basic contact info and notes. Intentionally
  minimal; this is not a CRM.

## Booths & devices

- `Booth` — a physical photo booth unit (currently one exists, but the model supports
  more). Tracks its `BoothStatus`, which printer adapter it's configured for, and
  current software version.
- `Device` — the specific iPad running a booth. Kept separate from `Booth` so hardware
  can be swapped without losing booth history.
- `Heartbeat` — periodic status pings from a device: battery, charging state,
  network/printer/camera status, local storage headroom, unsynced photo count, pending
  print count. This is what remote monitoring reads from.

## Templates

- `Template` — a reusable print layout (e.g. a wedding 4x6 portrait design), with a
  `category` and `format`. The authoritative layout lives in the `layout` JSON field
  (canvas size, orientation, layer list); this maps to the TypeScript schema owned by
  `packages/templates`.
- `TemplateElement` — optional normalized rows mirroring individual layers (photo area,
  text, image, logo, shape, QR, background) so they can be queried/filtered without
  parsing JSON. `Template.layout` remains the source of truth for rendering.

## Events

- `Event` — the center of the system. Holds scheduling info, venue info,
  booth-experience settings (countdown length, retakes, capture mode), printing rules
  (copies, max prints, reprint policy), sharing toggles (QR/email/SMS), gallery
  settings, and branding overrides. `EventStatus` tracks the lifecycle from `DRAFT`
  through `ARCHIVED`.
- `EventSetupChecklist` — one per event, filled in by the employee doing on-site setup:
  which checklist items passed, the setup photo, the test session/print result, and
  (optionally) GPS at completion. This is what "Ready for Event" is graded against.

## Sessions, captures, and prints

- `PhotoSession` — one guest interaction, start to finish. This is the primary unit for
  troubleshooting and dispute resolution, so its `id` is a client-generated ULID that
  works offline.
- `Capture` — a single raw photo taken during a session, before rendering.
  `originalUrl` is filled in once uploaded; before that, the file lives locally on the
  device.
- `RenderedPhoto` — the result of applying a `Template` to one or more `Capture`s: the
  final print-ready image plus a thumbnail. Originals are never overwritten by this
  process.
- `PrintJob` — one physical print request, with `PrintJobStatus` values chosen to
  reflect only what we can actually know (e.g. `SENT_TO_PRINT_SYSTEM` rather than a
  claimed "printed", since iOS/AirPrint doesn't reliably report true completion). `id`
  is a client-generated ULID so retries are idempotent.
- `Share` — a QR/email/SMS share of a session's photo. `consentMarketing` defaults to
  `false` — sharing a photo never implies opting in to marketing.
- `Gallery` — the per-event photo gallery, with its own `GalleryPrivacy` (`PUBLIC`,
  `PRIVATE`, `PIN_PROTECTED`, `DISABLED`) independent of the event's other settings.

## Operational records

- `ActivityLog` — timestamped, operationally meaningful events only (session started,
  print failed, printer disconnected, etc.), not a firehose of every UI click.
  Optionally attributed to a `User` or `Employee`.
- `SyncRecord` — server-side mirror of the offline sync queue's state per entity
  (`PENDING`, `UPLOADING`, `SYNCED`, `FAILED`, `RETRY_SCHEDULED`), keyed by the entity's
  client-generated ULID so the server and the device agree on what's been durably saved.

## Design notes

- IDs for anything created on the booth while possibly offline (`PhotoSession`,
  `Capture`, `RenderedPhoto`, `PrintJob`) are client-generated ULIDs, not database
  `cuid()` defaults — the device must be able to create a stable ID without asking the
  server first.
- JSON fields (`Template.layout`, `TemplateElement.style`/`data`, `Event.theme`,
  `EventSetupChecklist.items`, `ActivityLog.metadata`) are used where the shape is
  genuinely flexible or versioned. Fields that benefit from being queried, filtered, or
  joined are kept as real relational columns instead.
- Nothing in this schema has migrations yet; see `docs/phases.md` Phase 1 for when
  that lands.
