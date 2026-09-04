# scripts/

Placeholder for development and operations scripts referenced in the root README's
repository layout. Nothing is implemented yet — this file exists so the folder has a
clear purpose before any script lands in it.

Anticipated scripts (Phase 1+, not yet built):

- `seed.ts` — seed the single Friendly Party Rental organization, a test booth, and
  the permanent internal test event described in `docs/architecture.md`, for local
  development.
- `test-print.ts` — trigger a labeled TEST PRINT job against a configured Canon
  SELPHY, independent of the admin UI, for bring-up/debugging a new booth.
- `verify-backups.ts` — sanity-check that object storage and database backups are
  actually restorable, not just present.

Do not assume any of these exist or work until they appear in this folder with an
entry in `docs/development.md`.
