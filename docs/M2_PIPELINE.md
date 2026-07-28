# M2 corpus pipeline

M2 is implemented as a fail-closed, local-first pipeline. Until the production intake gate passes, every executable demonstration uses only files under `tests/fixtures/` and every generated record remains a fixture.

## Stages

```text
source candidate + Owner use decision
  -> immutable content-addressed vault
  -> page inventory
  -> page extraction / OCR adapter
  -> date and entry segmentation
  -> normalization without raw-text deletion
  -> entity candidate review
  -> deterministic full-text index
  -> archive quality gate
  -> read-only product adapter
```

Each stage receives explicit records and emits explicit records. No stage may silently broaden storage, extraction, quotation, or page-display permissions.

## Immutable vault

`lib/ingestion/vault.ts` accepts only a local file contained by an explicitly supplied input root. It hashes the bytes before storage and writes them under `<vault>/<sha256>/<filename>` using create-exclusive semantics. Existing objects are reused only after their bytes hash to the same digest. Stored files are set read-only.

The returned `VaultReceipt` records original and stored relative paths, SHA-256, MIME type, byte length, source ID, fixture state, timestamp, and whether the object was created or reused.

## Append-only run ledger

`lib/ingestion/ledger.ts` stores one JSON record per line. Each record includes a monotonically increasing sequence, the previous record hash, and its own SHA-256. The reader validates the full chain before another event can be appended. Editing or reordering an existing event makes subsequent appends fail.

This is tamper-evident, not an external trust anchor. Production backups or signed attestations can be added later without changing event semantics.

## Safe demonstration

```bash
npm run m2:vault-demo
```

The command creates a temporary workspace, stores the known synthetic intake fixture, writes and verifies one ledger event, prints the receipt/report, and removes only that temporary workspace. It does not touch `data/raw/`, perform network access, or process the source candidate.

## Page extraction and recovery

`lib/ingestion/extraction.ts` accepts a vault receipt, exact input bytes, an adapter, and an explicit authorization mode. Fixture mode refuses non-fixture receipts. Production mode refuses fixture receipts and any gate that is not ready. The receipt checksum is verified again before the adapter can see bytes.

The checked-in `marked-fixture-text` adapter is not a PDF parser or OCR engine. It processes only the explicit synthetic corpus fixture and demonstrates ordered page records, raw-text hashes, extractor versioning, and OCR confidence propagation. A failed run returns completed page records as a checkpoint; a retry reuses only records whose file, page payload, adapter ID, and adapter version still match.

```bash
npm run m2:fixture-pipeline
```

The command runs the fixture through a temporary vault, extracts three synthetic pages (including one simulated OCR-labeled page), records start/completion events, verifies the ledger, prints the result, and removes the temporary workspace.

## Segmentation, normalization, and review

`lib/ingestion/normalization.ts` converts each ordered synthetic page into one fixture entry candidate. It records date value, precision, confidence, and the literal marker that supports the date decision. A month-only marker is represented as the first day of that month only for sorting and retains `datePrecision: "month"`; an unknown date remains null.

Raw extraction text and its checksum are never replaced. The normalized display field is a separately hashed derivative with fixture control markers removed. OCR-derived entries remain `ocr_unverified`, and OCR confidence below 0.80 emits a review warning.

Entity and topic markers become typed candidates with stable IDs and source-page pointers. `lib/ingestion/review.ts` requires one accountable decision per candidate, rejects orphan and duplicate decisions, and reports accepted, rejected, and pending counts. Fixture candidates remain permanently ineligible for public use even after every synthetic decision is accepted.

`npm run m2:fixture-pipeline` now includes extraction, normalization, the pending review report, and the verified ledger in one end-to-end result.

## Deterministic full-text index

`lib/archive/full-text-index.ts` builds a stable, content-verifiable inverted index from normalized entry candidates. It validates both raw and normalized checksums before indexing, sorts documents and term postings deterministically, and records a SHA-256 over the complete index payload. Only title and normalized display text are searchable; raw evidence and unreviewed entity labels are excluded.

Fixture indexing refuses non-fixture entries. Production indexing refuses fixtures and requires a valid, public-ready entity review report. The repository adapter exposes only `search`, `getDocument`, and `getSummary`; it verifies the index checksum at construction and has no mutation surface. Queries require all normalized terms and return deterministic frequency-ranked hits with their source-page pointers.

## Pipeline quality gate

`lib/ingestion/pipeline-quality.ts` distinguishes technical integrity from publication readiness. Extraction completion, cross-stage count/source alignment, and index checksum validity determine whether the run is structurally valid. Low-confidence OCR is a warning; pending entity review and fixture presence independently keep publication locked. A fixture rehearsal can therefore prove the machinery without ever becoming publishable content.
