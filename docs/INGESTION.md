# Ingestion contract

M1.2 provides a deterministic, read-only fixture dry run. It proves file inventory and validation boundaries; it does not authorize or perform real corpus ingestion.

The public framework includes only a deliberately non-resolving example candidate. Run `npm run intake:gate` to inspect the fail-closed production gate. Real candidate registries belong in a private deployment repository.

M4 further separates acquisition/storage, extraction/OCR, quotation, and page-display readiness. See `docs/M4_AUTHORIZATION.md`. The browser projection is read-only and cannot create an approval.

## Safe dry run

```bash
npm run intake:dry-run
```

The command is intentionally locked to `tests/fixtures/intake/safe-intake-fixture.txt`. It:

1. resolves the real fixture path and refuses paths outside `tests/fixtures/intake/`;
2. reads one explicitly synthetic local file;
3. records file name, MIME type, byte length, and SHA-256;
4. inventories explicit fixture page markers;
5. emits `SourceManifest`, `FileInventory`, `IngestionRun`, and `ValidationReport` JSON to stdout;
6. emits zero `ExtractionRecord` items and marks extraction as blocked.

It performs no network access, OCR, source extraction, file mutation, generated-output write, or publication action.

## Contract records

- `SourceManifest`: authority statement, use boundary, immutable file inventory, page inventory, and fixture state.
- `FileInventory`: relative path, MIME type, byte length, checksum algorithm, and SHA-256.
- `SourcePageInventory`: stable source-file/page identity and processing state.
- `IngestionRun`: deterministic run ID, input checksums, ordered stages, counts, and stage status.
- `ExtractionRecord`: future page-level source text/OCR record with method, confidence, verification state, and fixture flag.
- `ValidationReport`: errors, warnings, and file/page/extraction coverage metrics.

The TypeScript definitions live in `lib/ingestion/contracts.ts`. The fixture-only runner lives in `lib/ingestion/fixture-dry-run.ts`.

## Real-source gate

The fixture runner must not be repurposed as evidence. A separate authoritative adapter can be implemented only after the Owner confirms:

- source identity and version;
- origin and acquisition method;
- storage, extraction, quotation, and page-display boundaries;
- immutable source location;
- expected file/page inventory.

Real intake must record original-file checksums before extraction. It must never overwrite originals, and every derived record must retain source-file and page identity.

M2's immutable vault and tamper-evident run ledger are documented in `docs/M2_PIPELINE.md`. Their executable demo remains fixture-only and uses a temporary directory.
