# Local Development

Status: placeholder. This file will be rewritten once the monorepo tooling (package manager,
workspace config, Next.js apps) actually exists — treat everything below as intent, not a
working guide yet. Do not follow these steps expecting a working app until this notice is
removed.

## Planned toolchain

- Package manager: pnpm workspaces (root `pnpm-workspace.yaml`, per-package `package.json`).
- `apps/admin`: Next.js (App Router), TypeScript, Tailwind CSS.
- `apps/booth`: Next.js or Vite-based PWA, TypeScript, Tailwind CSS — final choice recorded
  here once made (Phase 2).
- `packages/database`: Prisma against PostgreSQL (`packages/database/schema.prisma`).
- Deployment: Railway for the admin/cloud API; object storage on Cloudflare R2.

## Planned setup steps (Phase 1, once scaffolding lands)

1. Install pnpm and Node LTS.
2. `pnpm install` at the repo root.
3. Copy `.env.example` to `.env.local` in `apps/admin` (and anywhere else it's needed) and
   fill in real values — never commit the filled-in file.
4. Provision a local or hosted PostgreSQL database and set `DATABASE_URL`.
5. `pnpm --filter database prisma migrate dev` (or the equivalent workspace script once named)
   to apply the schema in `packages/database/schema.prisma`.
6. `pnpm --filter admin dev` to run the admin app locally.
7. Booth app run instructions land here once `apps/booth` is scaffolded (Phase 2) — including
   how to test on a real iPad, not just desktop Safari.

## Production checklist (to be filled in as it becomes true, not before)

- [ ] Database migrations applied to production
- [ ] Environment variables set in Railway (matching `.env.example`, nothing extra/undocumented)
- [ ] Object storage bucket + credentials verified
- [ ] Admin auth verified end-to-end
- [ ] Booth tested on the actual iPad + Canon SELPHY hardware (see docs/phases.md for what
      "tested" is required to mean)
