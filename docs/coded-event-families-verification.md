# Coded event template families — implementation and executed verification

## What is implemented
Six explicit event families with three real compositions each, 18 total. A shared immutable registry maps the legacy ivory/blush/champagne IDs (preserving saved preferences) and unique canonical keys to layouts, names, typography/artwork descriptors, supported fields and the 1200x1800 print format. A template from another event cannot override the selected event type.

The actual guest gallery, event-setup preview, enlarged proof, selected print and JPEG export import the same public `renderKeepsake` API. These are editable photo compositions with runtime text, not generated sample boards pasted into the application. No generated concept board is an app asset.

- Wedding: Rosewater Romance, The Vow Edit, Black-Tie Heirloom. Existing approved artwork retained.
- Birthday: Champagne Birthday, Retro Party Club, Midnight Disco. Existing approved artwork retained.
- Bar / Bat Mitzvah: Timeless Classic, Modern Luxe, Celebration Mosaic. Distinct navy botanical, sapphire architectural and arched mosaic compositions; celebrant, celebration type and optional Hebrew name are dynamic.
- Graduation: The Honors Edit, Confetti Celebration, Modern Future. Laurel/diploma, cap/confetti/brush inscription and vertical-year editorial compositions. Names, school and class year come from event data.
- Corporate: Executive Modern, Corporate Gala, Summit Modern. Ivory editorial, dark formal invitation and skyline compositions. Company and event are dynamic; initials are not a fabricated company logo.
- Other: Celebration Blooms, Evening Soirée, Confetti Moment. Painted botanical, static stardust and painterly-confetti compositions with event/host/caption fields.

Implementation: `app/lib/template-registry.mjs`, public `keepsake-designs.mjs`, retained `keepsake-atelier-base.mjs`, `templates/svg-kit.mjs` and independent mitzvah/graduation/corporate/celebration renderer modules. Text is escaped, artwork is stationary, guest image sources and filters remain allowlisted. The neutral gallery UI, capture code, saved-photo storage and delivery configuration were not changed.

## Verification executed
Tested implementation commit: 663233d9b8e59b75375354c34f9f2afe2f36dc7e. GitHub Actions run 35646413260 completed SUCCESS. Artifact 10660453715 contains logs, screenshots, exports, print simulations and verification.json. This documentation is the only subsequent change.

- All 160 Node tests passed, zero failed or skipped. Existing test suite retained; registry, event identity, crop geometry and SVG filter regressions added.
- The actual production Next.js application compiled and ran on the CI runner's localhost, using its real operator/recovery interface and gallery controls.
- Chromium and WebKit each selected all 18 templates and downloaded Original, Soft, Black & white and Warm through the actual Save / Send > Download Keepsake controls: 144 export checks total.
- Every downloaded result decoded as a 1200x1800 JPEG under 2 MiB. Largest measured file: 336351 bytes. Each photo finish changed the exported image bytes; all three original outputs within a family were distinct.
- 36 viewport checks: 1180x820, 1024x768 and 820x1180 for each event in both engines. Action dock stayed on-screen and no horizontal document overflow was detected.
- Twelve long-name checks (six families x two engines) passed the name block's reserved coordinate bounds.
- Eighteen Chromium print-layout PDFs, one per design. All were opened locally with PyMuPDF and measured exactly one 288x432-point (4x6-inch) page. Selected new-family PDFs were rasterized and visually reviewed; all 18 actual WebKit original JPEGs were reviewed on a contact sheet.
- Browser test completed with no captured page exceptions or SVG path errors. The test used an illustrative Unsplash stock photograph and fictional event details, not an actual customer's event. No real guest data or provider credentials were used. Delivery POST requests were blocked and productionMessagesSent=0.

## Real defects found and corrected before release
The first branch run caught a registry syntax error; it never reached production. A subsequent real browser run caught a WebKit defect where a CSS photo finish disappeared from the exported JPEG. The renderer now applies native SVG filter primitives only to the guest photograph, leaving the colored frame unchanged. Both engines then passed all four finish checks across all 18 designs. Whole-photo mode also now fits inside an arched window rather than its enclosing rectangle; the geometry and renderer have regression tests.

## Boundaries
Automated desktop WebKit is not the owner's physical iPad. The PDFs are layout simulations, not a Canon driver emulator or physical paper/ink/AirPrint test. Actual SMS/email receipt, Guided Access and real Canon output are not established by this run. No provider flags, credentials, existing guest photos or printer settings were changed. Printed gold/silver are color effects, not metallic foil. Existing dependency-audit warnings are not resolved by this template-only release.
