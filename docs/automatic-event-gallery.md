# Automatic event gallery

## Before the rental

Save the customer’s event in the owner dashboard. On the booth iPad, open **Staff tools → Start event** and enter the staff PIN. **Choose the event → choose one layout or Custom → Start event.** The selected design is preloaded for both **1 Photo** and **4 Photos**, and the event’s private online gallery connects automatically. Guests only choose how many photos to take.

The owner dashboard’s **Choose layout & start event** button opens the same staff screen with that event selected. Use it on the device taking the photos. Starting an event on an office computer does not remotely switch an unrelated iPad. Custom artwork must include valid matching 1-photo and 4-photo layouts before the event starts.

Each event has its own photos, settings, print counter, and gallery. Starting or reopening an event preserves its existing photos and print usage. Staff authentication authorizes the selected customer event; a public event ID alone does not authorize uploads. Sample rehearsals do not upload to a customer gallery. Older local entries retain their separate archives.

Existing signed setup links remain compatible for previously prepared events, but scanning, copying and applying a setup link are no longer required in the main staff workflow. Before guests arrive, check the selected name, both photo previews, countdown sound and a real Canon test print on the actual booth iPad.

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

Online copies expire 30 days after their last successful backup acknowledgment. Local originals remain until explicitly removed. If an old event’s backup authorization needs renewal, unlock staff tools and use **Retry backup now**. Older signed setup proofs expire seven days after the event date; staff authentication is required to reconnect an older event.

## Storage limits

The default ceiling is **10,000 image files per event**, counting poses, collages, and keepsakes separately—not sessions or printed sheets. An optional `BOOTH_BACKUP_MAX_IMAGES` override accepts 1,500–50,000; no additional variable is required. A full event or database reports a storage problem and retains pending files locally. The owner must resolve capacity and retry before deleting the event or treating its gallery as complete.
