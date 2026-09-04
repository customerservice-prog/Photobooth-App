# packages/templates

Defines the versioned template format used by both the admin template editor (Phase 8) and
the headless renderer (packages/renderer), so a template is data, not React markup.

## Format (conceptual, versioned)

```
{
  templateVersion: 1,
  canvasWidth: 1200,
  canvasHeight: 1800,
  orientation: "portrait",
  layers: [
    {
      type: "photo_area" | "text" | "image" | "logo" | "shape" | "qr" | "background",
      x, y, width, height, rotation, zIndex, opacity,
      style: { ... type-specific styling ... },
      data: { ... type-specific content, may include {{event_name}} style variables ... }
    }
  ]
}
```

## Responsibilities

- TypeScript types + schema validation for the layout JSON stored on `Template.layout`
  (see packages/database/schema.prisma).
- Event variable substitution contract: `{{event_name}}`, `{{customer_names}}`,
  `{{event_date}}` and similar tokens are resolved here, not scattered across UI code.
- Support for both authoring paths described in docs/architecture.md:
  1. Fully layered templates built in the visual editor.
  2. "PNG overlay + photo placeholder" templates, where a designer-made transparent PNG is
     the background/foreground and only a photo_area (or a few) is positioned behind it.
- Format sizes at minimum: 4x6 portrait, 4x6 landscape, 2x6 photo strip. Square/digital/custom
  sizes are additive later and must not break the versioning contract.

## Status

Not yet implemented. Needed before packages/renderer and the template editor (Phase 8) can be
built against a stable contract.
