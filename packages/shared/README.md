# packages/shared

Shared TypeScript types, constants, and small framework-agnostic utilities used across
apps and packages (e.g. the enums mirrored from packages/database/schema.prisma such as
EventStatus/PrintJobStatus/SyncState, ULID generation helpers, date/time helpers that keep
timestamps in UTC internally and format them in the event's local time for display, and
validation helpers). Intentionally minimal — this is not a dumping ground; anything with real
business logic belongs in a more specific package (booth-core, offline, printing, renderer,
templates).

## Status

Not yet implemented. Will grow organically as duplication appears between apps/admin,
apps/booth, and the other packages — starting empty is intentional.
