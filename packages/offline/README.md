# packages/offline

The offline-first local data layer: local persistence + the sync queue. This is arguably the
most important package in the repository — see docs/architecture.md §2 and §6, and the
priority order in the root README ("never lose a customer photo" / "booth must keep
functioning with no internet").

## Responsibilities

- IndexedDB-backed local storage for: preloaded event config/template/assets, in-progress and
  completed PhotoSessions, Captures, RenderedPhotos, PrintJobs, and ActivityLog entries.
- A durable SyncRecord queue (PENDING -> UPLOADING -> SYNCED, or FAILED -> RETRY_SCHEDULED with
  exponential backoff) that drains to the cloud API whenever connectivity exists.
- Idempotent sync: every synced entity uses a client-generated ULID as its identity, so replaying
  a queued upload after a retry updates/no-ops rather than duplicating records.
- Loss-prevention rules: local originals are only ever cleaned up once a cloud upload is
  verified AND retention rules are satisfied AND we are safely past the event. Never delete on
  upload attempt alone.
- Event preload: given an event id while online, fetch and cache everything needed to run that
  event with zero connectivity (config, template, assets, fonts, printer config), and expose an
  "available offline" signal to the booth UI.
- Storage health reporting (free space, unsynced counts) consumed by the heartbeat system
  (see docs/architecture.md §7).

## Status

Not yet implemented (Phase 3). Phase 2's booth MVP may temporarily assume connectivity, but
nothing here should be skipped before we call the booth production-ready.
