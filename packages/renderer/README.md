# packages/renderer

Pure photo-compositing engine: (original image + template layout JSON + event variables) ->
finished print image. Deliberately has no React/DOM dependency on the "does it produce the
right pixels" path, so it can be unit tested headlessly and reused identically by the booth
app and any future server-side re-render tooling.

## Responsibilities

- Compose layers from packages/templates (background, photo area, text, image/logo, shapes,
  QR, event metadata) onto a canvas at the template's target resolution.
- Crop/fill behavior for photo areas whose aspect ratio differs from the captured photo —
  never stretch. Support a configurable focal point; face-aware auto positioning is a later
  addition, not a Phase 1 requirement.
- Text layer rendering: font, size, weight, alignment, color, line height, letter spacing.
- Resolve template variables (`{{event_name}}`, `{{customer_names}}`, `{{event_date}}`) using
  the contract defined in packages/templates.
- Output at real print resolution — 4x6 @ 300dpi targets: 1200x1800 (portrait) or 1800x1200
  (landscape) — never a small canvas upscaled at print time.
- Preserve the original captured image untouched; the renderer always produces a new
  derived asset (see docs/architecture.md §5 for the original/final/thumbnail convention).

## Status

Not yet implemented (needed for Phase 2's first end-to-end photo). Depends on packages/templates
for the layout contract.

## Testing intent

Because this package is a pure function of (image, template, variables) -> image, the plan is
snapshot/pixel-diff style tests against fixture templates, independent of any booth UI or
camera code.
