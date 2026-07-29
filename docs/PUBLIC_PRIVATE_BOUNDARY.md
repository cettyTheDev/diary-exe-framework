# Public/private boundary

The public framework is intentionally data-free. A production deployment
should keep project-specific material in separate private systems.

## Public repository

- UI components and route composition;
- record, citation, provenance, and approval types;
- read-only repository interfaces and generic adapters;
- deterministic synthetic fixtures and tests;
- fail-closed quality and authorization logic.
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
