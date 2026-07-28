# Public/private boundary

The public framework is intentionally data-free. A production deployment
should keep project-specific material in separate private systems.

## Public repository

- UI components and route composition;
- record, citation, provenance, and approval types;
- read-only repository interfaces and generic adapters;
- deterministic synthetic fixtures and tests;
- fail-closed quality and authorization logic.

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

## Publication kill switch

A deployment may provide controls to disable public routes, revoke backend
access, and stop new responses. This limits continued exposure; it does not
erase copies, caches, screenshots, archives, clones, or exports created before
shutdown.
