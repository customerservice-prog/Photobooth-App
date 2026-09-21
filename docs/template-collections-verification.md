# Coded template collection verification

The actual six-category app implementation passed Event template collections workflow run 35647213028 on commit 731e4135a37dbda1759ceadd8e19eb1ac739be2a. Artifact 10660731593 contains the real gallery screenshots, JPEG downloads, print-layout PDFs, unit/build logs and machine-readable report. After that run, visual review found that two Other-event designs omitted an optional caption when a host was present; both renderers and three regression tests were added and must pass the same workflow again before merging.

Executed in the built Next app on localhost inside CI (not isolated component mocks):
- 164 unit tests passed in the initial complete proof.
- Chromium and WebKit each visited all six event galleries, selected all three coded templates and downloaded the actual framed JPEG using Save / Send > Download Keepsake: 36 files, each 1200x1800 and under 2 MiB.
- The canonical ID on each selected card matched the hidden print-only card.
- Chromium produced 18 one-page 288x432-point (4x6) print-layout PDFs.
- Twelve actual setup form checks confirmed saved details and canonical/legacy default template consistency, six events in each engine.
- Twelve viewport checks verified on-screen action dock and no horizontal overflow.
- Both engines passed a stubbed system-print callback, whole-photo plus B&W export, help modal photo retention and Done-to-next-guest reset. Zero recorded page exceptions or SVG path errors.

Gallery screenshots for all six collections and the exported artwork were reviewed. Decorative art is stationary; the controls were not redesigned. Wedding and Birthday preserve the prior Atelier source output, with only a canonical SVG data attribute added. Other events use individual authored composition functions, not generated presentation-board images.

All sample identities were fictional; the illustrative Unsplash photograph is isolated test input and not a stored customer session or committed site asset. Delivery POSTs were blocked; productionMessagesSent=0. WebKit is the automated desktop engine, not a physical iPad. PDFs simulate layout, not the Canon driver or paper output. This work does not verify real SMS/email delivery, physical printing or Guided Access.

A separate post-merge workflow checks GET-only live production URLs and the event-collections-v1 catalogue version. Its success/failure must be checked separately from Railway deployment status. No sending credentials or guest data are changed by that check.
