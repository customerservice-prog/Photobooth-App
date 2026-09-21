# Direct photo delivery and Canon rehearsal

Direct sending is separate from the iPad share sheet. Both channels remain OFF until an owner configures real senders and runs an end-to-end test. Nothing in the software test suite constitutes a real send or physical print.

## Railway / Photobooth-Booth only
- DELIVERY_DATABASE_URL: reference this project's Postgres.DATABASE_URL. The gateway uses a separate booth_delivery_v1 schema and never changes existing Prisma tables.
- BOOTH_PUBLIC_URL: https://photobooth-booth-production.up.railway.app
- BOOTH_SESSION_SECRET: cryptographically random 32+ byte secret.
- BOOTH_PAIRING_CODE: cryptographically random 16+ character code. Owner enters it at /delivery-check; never use a provider API key as the pairing code.
- Email: RESEND_API_KEY and BOOTH_EMAIL_FROM (bare address on a verified sending domain). Retrieval of delivery receipts requires Resend read access as well as sending. Set BOOTH_EMAIL_ENABLED=true only when ready for the owner test.
- SMS: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_MESSAGING_SERVICE_SID (preferred) or TWILIO_FROM_NUMBER. Use a compliant sender registered/verified for the traffic and configure Twilio opt-out handling. Set BOOTH_SMS_ENABLED=true only when ready for the owner test. Twilio trial accounts require verified recipients. No account/number purchase or compliance registration is performed by this code.

## Owner rehearsal
Open /delivery-check on the actual iPad. Authorize it once (12-hour HttpOnly Secure SameSite=Strict cookie), enter YOUR OWN phone/email, explicitly consent, and send one TEST image. Check provider receipts, then confirm the message arrives on your real phone/inbox and open the link/attachment. No automated sending on page load. Do not use a customer's address for rehearsal.

SMS sends a private 24-hour photo download URL; email sends the JPEG attachment plus that URL. Both currently send the ORIGINAL photograph, not the print frame or selected CSS filter. The UI explicitly labels this. No marketing subscription is created. Photo links contain a 256-bit token; only its hash is stored. Anyone with the link can access that one photograph until expiry. Links stop working after 24 hours. Expired binary data is removed opportunistically during sends/expired downloads, not by a guaranteed background deletion job; stale receipt metadata is pruned during sends after seven days. Database backups may retain prior data. The local booth's existing capture backup policy is unchanged.

## Limits and failure behavior
80 emails and 150 SMS per rolling 24 hours; five requests per channel per recipient; ten requests per paired device per minute. PostgreSQL advisory locks and unique device/request IDs guard duplicate concurrent submissions. A request with an uncertain Twilio outcome is NOT sent again automatically. Retry the same request ID to check its stored outcome. Provider receipt polling is throttled. Statuses queued, sent, failed, unknown and delivered are distinct. Delivered email means accepted by the receiving mail server, not guaranteed inbox placement. Carrier receipts do not prove a guest viewed the image. No webhook endpoint is installed; explicit status checks query the providers directly. Keep both sending flags off when not in use.

## Printer rehearsal
/print-test uses the same PrintCard component and print CSS as the guest booth. Print ONE sheet and choose Canon SELPHY, postcard / 4x6, and one copy in the actual iPad print options. The web app cannot discover the physical printer, force paper settings, or verify paper/ink output. The afterprint event only means print options closed. Physical checkboxes are user confirmation, never machine certification. Match your SELPHY model and media; CP1500 official specifications describe nominal 4x6 postcard stock, with actual borderless output 100x148 mm in technical specs. The simulation uses the booth's nominal 4x6 CSS page, not a Canon driver emulator.

Software verification: node --test tests/delivery.test.mjs (provider HTTP responses are mocked, zero outbound messages). Print simulation uses source PrintCard, source print rules and local Chromium, with a 288x432-point one-page PDF. Test contact information, credentials and guest photos must never be committed.

Primary references: https://www.twilio.com/docs/messaging/api/message-resource ; https://resend.com/docs/api-reference/emails/send-email ; https://resend.com/docs/api-reference/emails/retrieve-email ; https://www.usa.canon.com/support/p/selphy-cp1500 ; https://cam.start.canon/en/P001/manual/html/UG-07_Reference_0020.html
