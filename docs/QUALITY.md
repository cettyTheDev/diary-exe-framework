# Archive quality gate

The archive quality gate turns provenance and fixture-safety rules into a deterministic report. It runs without network access and does not mutate archive data.

## Run it

```bash
npm run quality:report
```

The checked-in command evaluates the current demo dataset in `fixture` mode. It prints JSON and exits non-zero when an error is present. Automated tests separately exercise the stricter `production` mode.

## Modes

- `fixture` permits records explicitly marked `isFixture: true`. Fixture entry text must remain bracketed interface copy and cannot claim to be diary text.
- `production` rejects every fixture record and requires a valid SHA-256 checksum on every source. It is intended as the final gate for a future authoritative adapter.

Changing the mode never converts or relabels a record. A real corpus must first pass the intake boundary in `docs/INGESTION.md`.

## Reported checks

The report combines canonical graph integrity with product-level readiness checks:

- unique IDs and unique source/page coordinates;
- complete source page inventories and valid page ownership;
- valid entry, citation, entity, topic, story-arc, and relationship references;
- citation overlap with an entry's cited source pages;
- OCR confidence presence and range;
- required entry display text and coherent date precision;
- fixture leakage and production checksum enforcement.

Coverage metrics include listed pages, cited entries, cited relationships, broken references, orphan pages, unlabeled OCR pages, and fixture leakage. Ratios are `1` for an empty collection so an intentionally empty dataset does not fail a coverage calculation by division by zero.

## Current boundary

This quality report validates the shape and provenance consistency of the safe M1 fixture graph. It does not assert that an authoritative diary corpus has been found, licensed, extracted, or editorially verified.
