# packages/ui

Shared design system / component library used by both `apps/admin` and `apps/booth`.

## Scope

- Primitive components (buttons, inputs, cards, status badges, modals) with a single visual
  language shared across admin and booth, so the product feels like one system rather than
  two unrelated apps.
- Two "modes" of consumption are expected long-term:
  - Admin-oriented components: dense, data-forward, desktop + mobile responsive.
  - Booth-oriented components: huge touch targets, large type, minimal choices, animation-
    friendly, full-bleed layouts. These are visually very different from admin components and
    should not be forced into the same component if that compromises either use case — prefer
    two components sharing tokens (color/type/spacing) over one over-configurable component.
- Design tokens (color, spacing, radius, typography, motion) live here so both apps reference
  the same source instead of duplicating Tailwind config.

## Status

Not yet implemented. This README exists to reserve the package's purpose before code lands
(Phase 1+).

## Non-goals for Phase 1

- No component playground/storybook investment yet.
- No theming system beyond what a single event's branding override actually needs.
