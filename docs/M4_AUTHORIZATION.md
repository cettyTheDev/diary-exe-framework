# M4 staged authorization

Updated: 2026-07-28 UTC

## Purpose

M4 separates permission to acquire and store a source from permission to
extract it, quote it, or display page images. No later permission silently
grants an earlier operation.

The public example candidate has no real source identity or approval record.
Every operation remains locked, and no source bytes are included.

## Decision record

The existing `ProductionIntakeApproval` record is the only input that can
represent an Owner decision. It must contain:

- a non-empty approval ID;
- the exact candidate ID;
- an accountable approver;
- a parseable decision timestamp;
- a non-empty note describing scope;
- independent booleans for storage, extraction/OCR, quotation, and page display.

An invalid or candidate-mismatched record is treated as absent. The browser UI
is read-only and cannot create or broaden an approval.

## Staged readiness

1. `readyForAcquisition` requires an official listing, an available candidate,
   a valid decision record, and storage permission.
2. `readyForExtraction` additionally requires authenticated bytes, SHA-256,
   explicit extraction permission, and a sequential file-bound page inventory.
3. `readyForQuotation` additionally requires quotation permission.
4. `readyForPageDisplay` additionally requires page-display permission.

Quotation and page display remain independent. Passing either one does not
grant the other. Publication remains separately controlled by the review and
quality gates documented in `docs/M2_PIPELINE.md`.

## Current report

Run:

```bash
npm run intake:gate
```

The expected framework report has zero of four source checks ready, zero of
four operation permissions ready, and every staged readiness field set to
`false`.
