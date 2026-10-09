# Automatic event gallery

## Before the rental

In the owner dashboard, open **Events → the event**, save its approved design, and choose **Load on iPad**. Open that event’s signed setup link on the event iPad, review it, and tap **Apply event to this iPad**. Loading an authorized event connects its private online gallery automatically; guests do not need to unlock staff tools or enable backups.

Each event has its own photos, settings, print counter, and gallery. A public event ID alone does not authorize uploads. Sample rehearsals do not upload to a customer gallery. Older local entries retain their separate archives.

## During the rental

Each original pose saves on the iPad immediately after capture, including poses from an interrupted session. Completed sessions also save their capture collage and finished approved keepsake. Every available file uploads to that event’s backend gallery while online. Uploads preserve JPEG bytes; later keepsake rendering can update the finished image without replacing original poses or the capture collage.

Offline photos remain in the iPad’s durable event archive. Keep the booth open and reconnect it to the internet: uploads retry on reconnection, when photos save, and periodically while the app is open. Closing or suspending the app pauses uploads; reopening the correct event resumes its queue. Upload acknowledgment does not remove local files or count a print.

Open **Staff tools → Automatic event gallery** to check progress or tap **Retry backup now**. “Automatic backup connected” with no photos means the connection is ready. “All … photo files saved” and zero pending files mean the current archive scan received acknowledgments for every file. Waiting files, connection problems, and full storage remain visible rather than being reported as saved.

## After the rental

1. Keep the correct event open on its iPad while online until all files are saved and pending uploads are zero.
2. In the owner dashboard, open **Events → the event → Open digital gallery**.
3. Download **all uploaded photos ZIP**, including every displayed part for a larger gallery. Session folders contain every uploaded original pose and available collage/keepsake. Pending iPad files are not in the online ZIP yet.
4. Open the ZIP files and verify the photos before sending the gallery to the customer. Keep a checked copy. The iPad also offers **Staff tools → Finish the event → Download complete event gallery ZIP**.
5. Only after verifying exports and zero pending uploads should staff remove the local event or complete, archive, and permanently delete its owner booking. Owner deletion removes that event’s remaining backend images. It does not deliver photos automatically.

Online copies expire 30 days after their last successful backup acknowledgment. Local originals remain until explicitly removed. If an old event’s backup authorization needs renewal, unlock staff tools and use **Retry backup now**; setup proofs expire seven days after the event date, so a new link alone cannot reconnect an older event.

## Storage limits

The default ceiling is **10,000 image files per event**, counting poses, collages, and keepsakes separately—not sessions or printed sheets. An optional `BOOTH_BACKUP_MAX_IMAGES` override accepts 1,500–50,000; no additional variable is required. A full event or database reports a storage problem and retains pending files locally. The owner must resolve capacity and retry before deleting the event or treating its gallery as complete.
