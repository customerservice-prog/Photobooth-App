# apps/admin

Next.js admin application for the owner (Friendly Party Rental) and employees. Requires
internet; this is not the offline-first side of the system (that's apps/booth).

## Audience & access

- Owner/Admin: full access (Events, Booths, Templates, Photos, Galleries, Customers,
  Employees, Reports, Settings).
- Employee: scoped access — today's deliveries, upcoming booth events, setup/preflight, print
  test, end event, pickup checklist. No billing, no global settings, no cross-customer data,
  no deleting events/galleries. See packages/database/schema.prisma (`EmployeeRole`) and
  docs/architecture.md §10.

## Navigation (Phase 1 scope)

Dashboard, Events, Booths, Templates, Photos, Galleries, Customers, Employees, Reports,
Settings. Nothing beyond this list ships in Phase 1 — no multi-tenant/org management, no
public signup, no billing/subscription UI (see root README's "do not build" list).

## Status

Not yet implemented (Phase 1). Will be built against packages/database, packages/api-client,
and packages/ui.

## Local development

To be documented in docs/development.md once the Next.js app is scaffolded — do not assume
setup steps exist yet.
