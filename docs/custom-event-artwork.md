# One event design

Choose the event type on the owner event form. Each type has one standard choice, plus Custom. Previously saved standard designs stay selected when reopening an event. Selecting the standard option or changing the occasion selects its current default.

Custom offers two paths:

- Build: choose background, border and text colors, plus an optional heading/footer. The event supplies the name and date.
- Upload: choose paired PNG/JPEG artwork for the one-photo and four-photo sheets. Include the desired names/date in the artwork and leave empty photo windows. Existing text remains unchanged. Adjust photo openings in the owner preview to align them with the artwork. Both layouts are portrait 4×6 sheets.

Save the event and use Load on iPad. Custom artwork is stored in the existing event theme JSON. The QR contains a signed event reference; the iPad downloads the validated artwork through the protected event-sync route before staff apply it. It then retains the paired layouts locally for offline capture. Existing event photos and print counters survive updates.

The guest still sees only 1 Photo or 4 Photos, followed by one finished JPEG with Print, Send and Done. That same finished JPEG is saved in the event archive and included in the gallery ZIP. Uploading artwork does not prove physical printing or send email/SMS.

Artwork is decoded and prepared on the owner device. Only PNG/JPEG data images are accepted, with 300 KB per prepared image and 800 KB per normalized design. The shared renderer rejects external/SVG images, incomplete pairs and invalid or overlapping photo windows. Setup downloads are bounded, and device storage failures restore the previous settings.
