# Actual event print designs, not color swatches

The guest preview now offers three actual personalized miniatures side by side. They use the guest photo, event fields and selected filter. Each event collection uses three different compositions, artwork and typography treatments. All artwork is static. The neutral Calm Studio controls are not brightened or animated.

18 designs: Botanical Vows / Wedding Editorial / Gilded Promises; Balloon Bouquet / Birthday Backstage / Disco Celebration; Modern Mazel / Celebrant Spotlight / Golden Milestone; Varsity Honors / The Next Chapter / Graduate Spotlight; Brand Editorial / Conference Pass / Evening Gala; Botanical Gathering / The Good Times / A Golden Occasion.

`app/lib/keepsake-designs.mjs` is the deterministic artwork renderer. `PrintCard` renders the same SVG for the full preview, miniatures and `/print-test`. Event text is escaped; arbitrary remote image URLs, HTML, uploaded SVG and unapproved filters are not accepted. Names wrap/shrink rather than extending off the sheet. Birthday age, spouse names, venue, mitzvah type/Hebrew name, graduate/year/school and corporate company/event are read from saved details.

`/designs` is a side-by-side catalogue with explicitly fictional sample names and a placeholder portrait. It never changes the user's saved event or reads guest photos. Its test links select the matching collection and design on `/print-test`.

Verification: 27 design/renderer unit tests added; deployment test command also retains the existing 24 mocked delivery tests. Local Chromium rendered all 18 designs to individual one-page 288x432-point PDFs and checked their sample text bounds. These are layout simulations, NOT a Canon device/driver emulator, actual paper output or iPad Safari certification. Physical printer, ink, paper, AirPrint and message delivery still require real devices/provider configuration. SVG filter parity on the physical iPad is not asserted by the software tests.

SMS/email credentials remain separate from GitHub/Railway editing permissions. No sending flags or credentials changed in this visual update. The digital Send/Save and direct delivery features currently send the ORIGINAL capture; the UI explicitly says the print artwork is not included. Do not call it framed digital delivery or delivered SMS/email without the relevant implementation and receipts.
