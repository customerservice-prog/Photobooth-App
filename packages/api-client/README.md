# packages/api-client

Typed client used by `apps/admin` and `apps/booth` to talk to the cloud API. Centralizes
request/response types (generated from or kept in sync with packages/database's Prisma models)
so both apps share one contract instead of hand-rolled fetch calls drifting apart.

## Responsibilities

- Typed functions for the sync endpoints the booth's offline queue (packages/offline) calls
  when connectivity exists (sessions, captures, rendered photos, print jobs, activity logs,
  shares) — all idempotent on client-generated ULIDs, per docs/architecture.md §6.
- Typed functions for admin reads/writes (events, booths, templates, customers, employees,
  galleries, heartbeats, reports).
- A single place to handle auth headers, retries/backoff for transient failures, and error
  shapes — so packages/offline's retry logic doesn't need to know HTTP details.
- Never embeds object storage credentials; uploads go through signed URLs issued by the
  server, not direct credentialed access from the client.

## Status

Not yet implemented (Phase 1, alongside the admin shell and database).
