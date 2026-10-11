# Direct photo delivery and Canon rehearsal

Direct sending is separate from the iPad share sheet. Each channel needs its configured sender. No software unit test constitutes a real inbox receipt or physical print.

## Photobooth-Booth Railway variables
- DELIVERY_DATABASE_URL: reference this project's Postgres.DATABASE_URL. Delivery uses its own booth_delivery_v1 schema.
- BOOTH_PUBLIC_URL: https://photobooth-booth-production.up.railway.app
- BOOTH_SESSION_SECRET: random 32+ byte secret; BOOTH_PAIRING_CODE: random 16+ character authorization code.
- Email: RESEND_API_KEY and BOOTH_EMAIL_FROM (bare address on a verified domain), with BOOTH_EMAIL_ENABLED=true. A domain-restricted sending-only key is sufficient for sending. Set BOOTH_EMAIL_RECEIPTS_ENABLED=false for that key; guests see provider acceptance and must check their inbox, without a nonfunctional receipt button. Receipt-capable keys retain the existing checks when this flag is omitted or true.
- SMS: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_MESSAGING_SERVICE_SID (preferred) or TWILIO_FROM_NUMBER. Use a sender approved for the traffic with appropriate opt-out handling. Enable BOOTH_SMS_ENABLED only when ready for the real test. Trial accounts require verified recipients. This code does not purchase a number, create a provider account or complete registration.

## Owner test
Start the event through /staff/start on the actual iPad. A successful, authenticated event start authorizes delivery for 12 hours with an HttpOnly, Secure, SameSite=Strict cookie. Repeated starts preserve the device's quota and receipt identity. Event reads, failed saves, invalid staff sessions and other origins cannot authorize delivery. The separate BOOTH_PAIRING_CODE remains available for manual diagnostic authorization.

Staff Tools and /delivery-check now show the current channel state (disabled, needs setup, or configured), exact missing/invalid setting names, shared storage/authorization dependencies, sender type and email receipt capability. These diagnostics require a valid, unexpired staff session and are never returned by the public guest configuration response. Only setting names and booleans are shown, never credential or sender values. Refresh checks the deployed runtime's configuration; it does not connect to the database, verify provider credentials or certify domain/sender approval.

Open /delivery-check, use YOUR OWN phone/email, consent, and send one TEST image. Where supported, check the provider receipt; always check the actual inbox/phone, attachment and link. No sending occurs automatically on page load. Never test with a customer's address. Guest forms offer only configured channels after this iPad is authorized.

## What guests receive
The guest photo preview now sends the FINISHED 1200x1800 JPEG, including artwork, names, date and photo finish. The separate delivery-check route sends a synthetic TEST pattern, clearly labeled. SMS contains a private 24-hour download link. Email includes the image attachment plus the link. Share Keepsake uses the device share sheet; Download Keepsake requests a local JPEG download. Neither indicates real recipient delivery by itself.

## Safety and retention
Daily rolling limits: 80 emails, 150 SMS; five per channel per recipient; ten per paired device per minute. PostgreSQL locks and unique device/request IDs protect concurrent retries. The UI freezes recipient, bytes and request ID during submission and ambiguous retries. It does not automatically resend uncertain requests. Provider receipt polling is throttled; queued, sent, delivered, failed and unknown remain distinct. Email delivered means the recipient mail server accepted it, not assured inbox placement. Carrier receipt does not mean the guest viewed the photo.

Anyone with the private 256-bit link can access that one image until it expires after 24 hours. Only the token hash is stored. Expired binary data is cleaned opportunistically during sends or expired downloads; this is not a guaranteed background-deletion job. Receipt metadata is pruned during sends after seven days. Database backups may retain prior data. Existing local booth backups are unchanged. No marketing subscription is created.

## Printer rehearsal
/print-test reads the current event's saved approved design and offers 1 Photo or 4 Photos. Both use the exact shared 1200×1800 JPEG exporter and the same artwork as guest prints, with four distinct local sample poses. Print media exposes only the selected finished JPEG on one 4×6 sheet. Missing or invalid event settings require staff to choose/review the event first. Rehearsal does not change event settings, upload samples, archive photos or use the print allowance; background event and backup coordinators pause on this route.

Choose ONE copy on the actual iPad AirPrint sheet and confirm the Canon SELPHY, its paper setting, image orientation and completed paper output. The browser cannot select or remotely certify the physical printer. afterprint only indicates the print options closed. Checkboxes record your confirmation, not printer telemetry. Keep front and rear paper paths clear and do not pull paper through color passes. Follow your model's Canon instructions for faults.

See docs/framed-export-verification.md for current software checks. Local Chromium render/PDF tests are print-layout simulations, not Canon driver, physical print or iPad Safari certification. Real sending remains unverified until accounts and real receipts are available.
