# Verification follow-up: setup validation

Verified the deployed commit before this patch as c71cb3375e4baa7d66e2345d173434adcc29a62a via Railway SUCCESS status. Runtime log available at verification showed successful startup and an npm production-config warning, not a runtime crash. This is deployment evidence, not a successful public browser visit.

A fresh browser test of the actual EventSetup, StudioDialog and event-config modules reproduced three related defects:
1. Editing a name, returning to Occasion, and tapping the already-selected event reset dirty=false. Save retained an old title while storing the new name in details.
2. The same sequence could bypass required-name validation and commit a missing wedding partner.
3. An untouched blank setup could be marked setupComplete=true.

The patch leaves all appearance, artwork, gallery, camera, print and delivery code unchanged. It adds finalizeEventSetup, which validates every Save and composes the title from the current fields. The dirty state is no longer reset when returning to the current occasion. Setup now requests required identity details before marking the event complete; old saved event records are not rewritten automatically.

Executed local evidence:
- Pre-patch files matched their Git blob hashes: EventSetup 387c9d22bbe4b02b7743a3550e060b507e196722, StudioDialog a46b2636f5b25c84ba7324c0daa7a2a1be23d3b6, event-config 0dac3cd12417d7b99ca774c93de01c21b23c3b31.
- In Chromium, normal Save succeeded; the three defects above reproduced with sample names. After the patch all three behaved correctly.
- All six event forms: blank identity blocked, entered identity saved correctly, chosen champagne default preserved. Cancel saved nothing. No page errors in this setup test.
- 19 added Node regression tests passed locally.

Scope of that fresh browser test: isolated setup behavior, React 18.2.0 with installed ReactDOM 18.2.0-next-9e3b772b8-20220608, TypeScript JSX transpilation. PrintCard artwork and icons were stubbed; this is NOT a fresh gallery visual, full Next app, iPad Safari, export, SMS/email or printer test. Existing earlier gallery/export verification is documented separately; do not describe it as re-executed by this follow-up. Railway's production build gate separately runs the entire repository test suite.

Public live HTTP attempts for /, /setup, /print-test and /api/delivery/config failed from the web tool; the local container also could not resolve the production host. Thus direct live button interaction is not established here. Railway variable-name inspection found the six booth/storage variables but no RESEND_API_KEY, BOOTH_EMAIL_FROM, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN or Twilio sender. No provider credentials, sending flags, personal contacts or customer photos were changed or used. Real SMS/email receipt and physical iPad/Canon output remain unverified and must not be described as working perfectly.
