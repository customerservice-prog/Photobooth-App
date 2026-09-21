# Event print designs and framed digital keepsakes

The guest preview shows three actual personalized miniatures side by side using the guest photo, event details and selected finish. Eighteen designs across Wedding, Birthday, Mitzvah, Graduation, Corporate and Other use different compositions, photo shapes and stationary paper artwork. Calm Studio controls remain neutral; no decorative animation was restored.

The deterministic renderer in app/lib/keepsake-designs.mjs is shared by PrintCard, thumbnails, /designs and /print-test. The new keepsake-export.mjs converts that same composition to a 1200x1800 JPEG before sharing. Share Keepsake, Download Keepsake and configured direct text/email now use the framed output rather than the original capture. Short Video and Animated GIF are unchanged media paths.

Event fields are type-specific drafts. Save commits the new type, title, date and details together. Cancel leaves the saved event unchanged. Switching types cannot silently carry wedding wording into a birthday. Preview inputs are escaped and image sources are restricted to in-memory raster data or the approved local test image.

/designs contains fictional sample names and a placeholder portrait; it never reads guest photos or changes the saved event. /print-test uses the same SVG renderer and explicit 4x6 print rules. These pages do not certify an actual Canon print.

See docs/framed-export-verification.md for the current tests, exact checks and limitations. Credentials and enabled flags for Resend/Twilio remain prerequisites for real direct delivery. Queued/sent statuses are not recipient-delivery confirmation. Provider credentials and physical hardware were not changed by this release.
