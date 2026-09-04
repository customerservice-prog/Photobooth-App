# packages/printing

Printer abstraction layer. Booth/session code never talks to a specific printer directly —
it only calls a `PrinterAdapter`. See docs/research.md §3-4 and docs/architecture.md §4 for
the reasoning behind this design and the real iOS constraints it works around.

## Interface (conceptual)

```
interface PrinterAdapter {
  connect(): Promise<void>
  status(): Promise<PrinterStatus>
  print(job: PrintJobRequest): Promise<PrintJobResult>
  cancel(jobId: string): Promise<void>
  capabilities(): PrinterCapabilities
}
```

## Adapters

- `CanonSelphyAdapter` — priority adapter. In the PWA phase, `print()` drives the standard iOS
  print sheet (AirPrint); there is no silent/headless path available to web content on iOS, so
  this adapter's job is to prepare the correct 4x6 image and hand it to the system sheet as
  cleanly as possible, not to fake a "one tap, no dialog" experience it cannot deliver yet.
- Future: `DNPAdapter`, a native-shell adapter with `UIPrintInteractionController` access for
  tighter control, etc. — same interface, different implementation.

## Status semantics (do not fake these)

Only claim what we can actually know: `QUEUED -> SENDING -> SENT_TO_PRINT_SYSTEM ->
(COMPLETED | FAILED)`. If iOS only confirms hand-off to the print system, the job stays at
`SENT_TO_PRINT_SYSTEM` — it is not marked `COMPLETED` without a real signal.

## Idempotency & abuse prevention

- Every print attempt is backed by a `PrintJob` row created with a client-generated ULID
  (idempotency key); retries increment `attempts` rather than creating new jobs.
- The guest-facing print button must debounce/disable after a request and respect
  per-session/per-event copy limits (maxPrints, copiesPerPrint, allowReprint) — see the Event
  model in packages/database/schema.prisma.

## Status

Not yet implemented (Phase 4). Requires packages/offline (for the PrintJob queue/model) and a
rendered 4x6 image from packages/renderer.
