# Architecture

## Product flow

```text
RECEIPTS -> shared trace sheet -> TIMELINE -> THE BOARD -> SOURCE FILES
```

Each top-level mode is a shareable App Router route. A selected entry is encoded as `?trace=<entry-id>` so browser back/forward and copied URLs preserve context. Timeline query/filter/density state uses `q`, `evidence`, `entity`, `topic`, `arc`, and `density`; Source page selection uses `page`; Board selection uses `focus`. Default values are omitted, unrelated state is preserved, and query keys are sorted deterministically by `lib/archive/url-state.ts`. Same-route query changes use the native History API, which keeps Next's `useSearchParams` state synchronized while preserving direct-link interaction in static production builds. All modes consume the same `ArchiveData` record graph.

## Rendering boundary

- Route pages are small Server Components.
- `ArchiveApp` is the small interactive orchestration boundary for URL-backed trace state and view selection.
- `ArchiveShell` owns the shared header, navigation, introduction, footer, and copy interaction.
- RECEIPTS, TIMELINE, THE BOARD, SOURCE FILES, and the shared Trace sheet live in independent client modules under `components/archive/views/` and `components/archive/trace/`.
- Shared evidence badges, date formatting, filter definitions, and select composition live under `components/archive/shared/`; product copy and navigation configuration live in `archive-config.ts`.
- UI modules read through the no-write `ArchiveRepository` contract in `lib/archive/repository.ts`; `data/archive-repository.ts` is the only runtime adapter that knows about demo fixtures. The repository owns entry filtering, canonical lookups, page-to-entry resolution, relation hydration, and archive summary metrics.
- `lib/archive/board-layout.ts` keeps small graphs on a deterministic degree-centered orbit and moves dense 16–24-node graphs to a separated rectangular perimeter. Dense graphs fall back to a stacked representation below 72rem so downstream private adapters can expand reviewed relationship sets without overlapping evidence controls.
- Future corpus payloads must be queried server-side or through a read-only index; the full archive must not be shipped in the initial client bundle.
- `loading.tsx`, `error.tsx`, and `not-found.tsx` provide route-level states.

## Provenance model

Entries refer to sources, entities, topics, story arcs, and citations by stable ID. Relationships require at least one citation. A citation records source pages and a state (`verified`, `unresolved`, or `demo`). Schema integrity is enforced by `lib/archive/integrity.ts`; the higher-level `lib/archive/quality.ts` gate adds coverage, fixture leakage, OCR labeling, and production checksum checks. See `docs/QUALITY.md`.

## Ingestion boundary

The five `data/` stages are intentionally separate. Future M2 ingestion should inventory originals and checksums first, then extract page-by-page, preserve OCR confidence, normalize without deleting raw text, and emit deterministic records. Public relationships require accountable source review.

The repository contract is intentionally storage-agnostic. A future server or generated-index adapter must satisfy the same read methods rather than exposing corpus storage directly to UI components.

`approved-archive-slice.ts` defines the source-neutral, checksummed public-slice
contract. `approved-runtime-compact.ts` may encode a valid single-source slice
without repeated page templates, source page IDs, or deterministically derived
normalized text. Expansion restores the exact artifact structure and reruns
the original checksum and production-quality validation before a downstream
adapter can consume it.

M1.2 ingestion contracts and the fixture-only dry-run boundary are documented in `docs/INGESTION.md`. The current runner is path-confined, deterministic, read-only, and stops before extraction; it is not the future authoritative-source adapter.
