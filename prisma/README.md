# prisma/

This folder is intentionally empty except for this file.

The real schema lives at `packages/database/schema.prisma` — that's the source of
truth. This top-level `prisma/` folder exists only because some tooling and hosting
platforms (including migration runners) default to expecting `./prisma/schema.prisma`
at the repository root, and it's easier to satisfy that convention than to fight it
everywhere.

When Phase 1 scaffolding lands, this will most likely become a thin config pointing at
the real package (e.g. a schema path override or a re-exported schema file) rather than
a duplicate copy. Do not maintain two copies of the schema by hand — that will drift
and cause real bugs.
