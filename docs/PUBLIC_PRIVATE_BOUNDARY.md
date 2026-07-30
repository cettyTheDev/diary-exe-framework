# Public/private boundary

The public framework is intentionally data-free. A production deployment
should keep project-specific material in separate private systems.

## Public repository

- UI components and route composition;
- record, citation, provenance, and approval types;
- read-only repository interfaces and generic adapters;
- deterministic synthetic fixtures and tests;
- fail-closed quality and authorization logic;
- approved-slice checksum validation and deterministic runtime compaction.
- publication-review contracts, validation, and a localhost-only review UI
  that stores no source or decision data in the repository.

## Private deployment repository

- real source registry and acquisition observations;
- approval records and publication policy;
- project-specific entities, topics, story arcs, and editorial decisions;
- deployment configuration that identifies private services.

## Private storage and services

- original document bytes and immutable checksums;
- extraction/OCR output and reviewer identity;
- production indexes and unpublished records;
- credentials, signing material, internal logs, and incident records.

## Integration rule

Implement the public `ArchiveRepository` interface in a server-only adapter.
The browser should receive only reviewed fields that are already approved for
public disclosure. A private backend does not make browser responses private.

A production adapter should expose an approved public slice, not its private
review queue. Keep the slice bounded and self-contained: exact approved ranges,
neutral editorial context, canonical dates, source identity and checksum,
cited page numbers, and only the relationships required by those records.
Replace full-page extraction text with an explicit withheld marker. Revalidate
fixture separation, checksums, citation integrity, privacy decisions, and the
minimum activation threshold again when loading the server-side runtime.

When a private deployment combines multiple approved batches, require the
same source identity and checksum across every batch. Reject duplicate batch
artifacts, overlapping review candidates, and conflicting record IDs, then
rerun production quality checks over the complete merged public slice.

Treat relationship graphs as a separate publication layer. Bind a reviewed
graph overlay to one immutable approved-artifact hash; require each edge to use
known entity endpoints and a citation assigned to an approved entry containing
both endpoints. Reject stale overlays, unknown citations, fixture leakage, and
unreviewed editorial or causal edges. A named entity alone is not permission to
publish a relationship.

The public template intentionally remains in fixture mode because it does not
ship that adapter or any production configuration. Downstream deployments
should make the active runtime state visible in the UI and must fall back to
conspicuously labeled fixtures—or stop responding—when validation fails.

Compact runtime packages are transport containers, not secrecy controls. Keep
their values server-only. Expansion must reconstruct the complete approved
artifact and pass its original checksum, review attestation, and production
quality checks before publication.

Never put secrets in client bundles, public environment variables, static
files, source maps, logs returned to the browser, or API error bodies.

The optional review workbench binds only to `127.0.0.1`; it is not a production
backend or a route to deploy. Its queue directory is ignored. Operators must
keep queue artifacts, raw transcription, reviewer names, and decision files in
private storage and review all outputs before connecting them to a public
adapter.

The optional OCR adapter is also local-only framework code. It does not confer
permission to acquire or process a document and does not make recognized text
publication-ready. Private integrations must supply their own authorized
bytes, keep rendered pages and OCR results outside this repository, verify the
transcription, and disclose only separately approved ranges.

## Publication kill switch

A deployment may provide controls to disable public routes, revoke backend
access, and stop new responses. This limits continued exposure; it does not
erase copies, caches, screenshots, archives, clones, or exports created before
shutdown.
