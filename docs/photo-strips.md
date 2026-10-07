# Classic photo strips — release 2026.10.07.4

The guest captures all configured original poses first, then chooses **4×6 Card** or **Photo Strip** on the keepsake page. Both are enabled by default; existing events continue to start on the card.

The strip renderer consumes the original poses, in order. It does not split a flattened card or synthesize missing poses. Four-pose sessions have four photos vertically per strip; three-pose events use three without filler. The same self-contained renderer is used by the preview, selected print-only sheet, downloadable/shareable JPEG and finalized archive artifact.

**Two matching strips** puts two identical 2×6 designs on one 1200×1800 4×6 sheet. The guest can also choose one centered strip. One printed sheet is one print request in both cases. Cut the finished sheet manually between the strips; there is no automatic cutter command. Digital Copy saves the selected 4×6 sheet layout. Filters apply to each original photo, not the surrounding artwork. The whole original photograph is fitted into each cell.

Staff controls are in the booth's **Event preparation → Design → Photo layout options**, and in general **Event setup → Personalize**. Enable either layout, choose the default, select the starting strip arrangement, set an optional footer and choose whether to use party colors. These settings are device-local like the existing booth event setup; they do not synchronize with the remote booking database. Download/import the event settings backup to move them between browsers. Existing photo archives, print counts and invoices are not reset or changed by choosing a layout.

Managed-event archive recovery reads the original poses for the selected saved session. Old general-booth cached cards without originals remain usable as cards; a strip requires a new capture. The app never invents original poses for those old cards.

QA: `npm run test:delivery`, `npm run build`, and `node scripts/classic-strip-proof.mjs` in apps/booth. The dedicated workflow runs Chromium and WebKit, downloads an actual rendered JPEG, checks all 32 corner markers in the duplicated four-pose sheet, verifies original ordering, defaults, settings/counter/archive preservation, iPad/phone layouts, and a single mocked print request. Post-merge checks wait for the exact deployed release. Automated tests do not use a physical iPad, printer, paper, email, or text message. Run a real Canon test sheet before the event.
