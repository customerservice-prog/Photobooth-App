# Direct photo delivery and Canon rehearsal

Direct sending is separate from the iPad share sheet. Both channels remain OFF until the owner configures real senders and runs an end-to-end test. No software unit test constitutes a real send or physical print.

## Photobooth-Booth Railway variables
- DELIVERY_DATABASE_URL: reference this project's Postgres.DATABASE_URL. Delivery uses its own booth_delivery_v1 schema.
- BOOTH_PUBLIC_URL: https://photobooth-booth-production.up.railway.app
- BOOTH_SESSION_SECRET: random 32+ byte secret; BOOTH_PAIRING_CODE: random 16+ character authorization code.
- Email: RESEND_API_KEY and BOOTH_EMAIL_FROM (bare address on a verified domain). Resend receipt checks require read access. Enable BOOTH_EMAIL_ENABLED only when ready for the owner's real test.
- SMS: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_MESSAGING_SERVICE_SID (preferred) or TWILIO_FROM_NUMBER. Use a sender approved for the traffic with appropriate opt-out handling. Enable BOOTH_SMS_ENABLED only when ready for the real test. Trial accounts require verified recipients. This code does not purchase a number, create a provider account or complete registration.

## Owner test
Open /delivery-check on the actual iPad and authorize it with BOOTH_PAIRING_CODE (12-hour HttpOnly, Secure, SameSite=Strict cookie). Use YOUR OWN phone/email, consent, and send one TEST image. Check provider receipt and then check the actual inbox/phone, attachment and link. No sending occurs automatically on page load. Never test with a customer's address.

## What guests receive
The guest photo preview now sends the FINISHED 1200x1800 JPEG, including artwork, names, date and photo finish. The separate delivery-check route sends a synthetic TEST pattern, clearly labeled. SMS contains a private 24-hour download link. Email includes the image attachment plus the link. Share Keepsake uses the device share sheet; Download Keepsake requests a local JPEG download. Neither indicates real recipient delivery by itself.

## Safety and retention
Daily rolling limits: 80 emails, 150 SMS; five per channel per recipient; ten per paired device per minute. PostgreSQL locks and unique device/request IDs protect concurrent retries. The UI freezes recipient, bytes and request ID during submission and ambiguous retries. It does not automatically resend uncertain requests. Provider receipt polling is throttled; queued, sent, delivered, failed and unknown remain distinct. Email delivered means the recipient mail server accepted it, not assured inbox placement. Carrier receipt does not mean the guest viewed the photo.

Anyone with the private 256-bit link can access that one image until it expires after 24 hours. Only the token hash is stored. Expired binary data is cleaned opportunistically during sends or expired downloads; this is not a guaranteed background-deletion job. Receipt metadata is pruned during sends after seven days. Database backups may retain prior data. Existing local booth backups are unchanged. No marketing subscription is created.

## Printer rehearsal
/print-test renders the same PrintCard/4x6 rules as guest prints. Choose ONE copy on the actual iPad AirPrint sheet and confirm the Canon SELPHY, its paper setting, image orientation and completed paper output. The browser cannot select or remotely certify the physical printer. afterprint only indicates the print options closed. Checkboxes record your confirmation, not printer telemetry. Keep front and rear paper paths clear and do not pull paper through color passes. Follow your model's Canon instructions for faults.

See docs/framed-export-verification.md for current software checks. Local Chromium render/PDF tests are print-layout simulations, not Canon driver, physical print or iPad Safari certification. Real sending remains unverified until accounts and real receipts are available.
