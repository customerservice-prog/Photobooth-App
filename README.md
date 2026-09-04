# Friendly Photo Booth Platform

Internal photo booth operating platform for **Friendly Party Rental**.

This is a Phase 1 INTERNAL BUSINESS TOOL. It is not a multi-tenant SaaS product.
There is exactly one organization (Friendly Party Rental). Owner configures events,
employees deliver/set up booths, guests use the booth, owner monitors remotely.
The long-term goal is to replace our dependency on ChackTok with software we own.

See `/docs/architecture.md` for the full system design, `/docs/research.md` for
hardware/platform research (iPad, Safari/PWA limits, AirPrint, Canon SELPHY),
and `/docs/phases.md` for the build roadmap. Nothing in this repository should be
considered "working" or "tested" unless explicitly stated in a phase update.

## Repository layout

```
apps/
  admin/        Next.js admin dashboard (owner + employee views)
    booth/        Guest-facing booth app (iPad kiosk experience)
    packages/
      ui/           Shared design system / component library
        booth-core/   Booth state machine, session logic (framework agnostic)
          templates/    Template format, schema, and rendering contracts
            renderer/     Photo compositing/rendering engine (input: photo+template -> output: print image)
              offline/      Local persistence + sync queue (offline-first data layer)
                printing/     Printer abstraction + adapters (Canon SELPHY first)
                  shared/       Shared types, constants, utilities
                    database/     Prisma schema + client
                      api-client/   Typed client used by admin/booth to talk to the cloud API
                      docs/           Architecture, research, schema, phases, runbooks
                      scripts/        Dev/ops scripts
                      prisma/         (re-exported from packages/database, kept for tooling convention)
                      ```

                      ## Status

                      Phase 0 (research & architecture) in progress. See `/docs/phases.md` for current phase
                      and what is actually implemented vs. planned.

                      ## Local development

                      Setup instructions will be added in `/docs/development.md` once the app scaffolding
                      lands (Phase 1). Do not assume anything works until that doc exists and is accurate.

                      ## Priority order (from product owner)

                      1. Never lose a customer photo.
                      2. Booth must keep functioning with no internet.
                      3. Canon SELPHY printing must be reliable.
                      4. Guest experience must be dead simple.
                      5. Employee setup must be hard to mess up.
                      6. Remote monitoring must show real status.
                      7. Admin must be polished.
                      8. Templates must look professional.
                      9. Galleries/sharing should be effortless.
                      10. AI/novelty features come last.
                      
