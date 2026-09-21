# Atelier collection — executed verification

Implementation tested at 7a2d1f2ebb366caf1cb26631b83dca5a2bb3f739 on design/keepsake-atelier. GitHub Actions run 35641009820 finished SUCCESS. Its proof artifact is 10658820413 (atelier-proof). This document and a generated-artifact .gitignore are the only post-test additions.

## Actual checks completed
- npm test:delivery: all 116 existing project tests passed, none skipped.
- Production Next.js 14.2.35 app compiled and ran in the CI runner. Browser tests navigated the actual built app on localhost, used the real operator/recovery UI and selected gallery templates. This was not an isolated JSX mockup.
- Playwright Chromium and WebKit: six total viewport checks (1180x820, 1024x768 and 820x1180 in each engine), on-screen action dock and no horizontal document overflow.
- All 18 designs exported through the actual guest Save / Send > Download Keepsake controls in each browser: 36 JPEG files, each decoded as 1200x1800. Largest measured file: 319676 bytes. Zero page exceptions or captured SVG path errors.
- Long wedding names were rendered in each of the three designs in both engines. Name bounds remained within x=65..1135 and y=1380..1617 of the 1200x1800 sheet, rather than colliding with the photo or footer.
- Six Chromium print-layout PDFs, one selected design per event collection. All inspected file dimensions are exactly one 288x432-point (4x6-inch) page. The wedding PDF was rendered to an image and visually inspected; all eighteen WebKit JPEGs were reviewed in a contact sheet, plus wedding/birthday galleries and the full botanical export individually.

The reference photograph is illustrative Unsplash stock, used solely for QA with fictional names. It is not the user's wedding or an actual customer session and was not committed as a site asset. Guest data was not uploaded or sent. The workflow aborts delivery POSTs, has no provider credentials, and report.productionMessagesSent is 0.

## Boundaries
WebKit here is an automated desktop engine, not the owner's physical iPad. The PDFs are page-layout simulations, not a Canon driver emulator or paper/ink test. Actual SMS/email receipt, Guided Access and physical Canon output are not established by these tests. The renderer and licensed asset preparation changed; the gallery, event editor, saved-event flow, photo capture, share/delivery handlers and printer controls did not.

## Visual implementation
Painted Open Access botanical artwork, outlined calligraphy, editorial display lettering, engraved corner ornaments, satin-style balloon shading, ticket compositions and faceted disco-ball artwork replace the previous basic illustrations. No decorative motion was reintroduced. The same renderKeepsake entry point drives print, gallery and finished JPEG output. Gold is a printed color effect, not metallic foil. /template-licenses includes retained OFL and museum source notices.

An earlier proof run caught a TEST HARNESS measurement mistake: sharp(file).metadata() does not return the file's byte size. The corrected test reads the actual file bytes and preserves the 2 MiB assertion. No production behavior was weakened to pass it. Visual review additionally prompted regular-weight small lettering, a bounded name block and corrected laurel paths before the successful run.
