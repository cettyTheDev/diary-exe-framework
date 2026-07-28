# DIARY.EXE Framework

An evidence-first archive interface and ingestion framework for building
source-linked timelines, relationship boards, receipts, and page-level review
workflows.

This public repository contains framework code and conspicuously labeled
synthetic fixtures only. It contains no real source registry, source URL,
document, quotation, page image, production index, approval record, credential,
or private project history.

## What is included

- a Next.js archive UI with receipts, timeline, relationship, and source views;
- typed provenance, citation, review, and authorization contracts;
- deterministic fixture-only ingestion, extraction, indexing, and quality
  checks;
- a read-only `ArchiveRepository` boundary for replacing fixtures with a
  private server-side adapter;
- fail-closed storage, extraction, quotation, and page-display gates.

## What is not included

- real people, institutions, events, claims, or source candidates;
- production documents, OCR, indexes, or editorial decisions;
- permission to acquire, reproduce, quote, or display third-party material;
- a production backend, credentials, or private API configuration.

## Local development

```bash
npm install
npm run dev
```

Then open `http://localhost:3000/receipts`.

## Quality checks

```bash
npm run check
npm run build
npm run intake:dry-run
npm run intake:gate
npm run m2:vault-demo
npm run m2:fixture-pipeline
npm run quality:report
```

## Public/private boundary

The intended deployment model is:

```text
public framework repository
  UI + contracts + adapters + synthetic fixtures

private deployment repository
  source registry + authorization records + editorial policy

private storage and server-side services
  original files + extraction + review + production indexes
```

A browser can only receive information that is safe to disclose. Secrets must
remain in server-only environment variables and must never use a public client
prefix. See `docs/PUBLIC_PRIVATE_BOUNDARY.md`.

## Disclaimer

This repository provides a software framework, not source material, factual
claims, legal clearance, authenticity certification, or endorsement. Operators
are responsible for source rights, privacy, accuracy, security, and publication
decisions. See `DISCLAIMER.md` before connecting any real data.

## Contributing and security

Read `CONTRIBUTING.md` before opening a pull request. Do not submit real source
material, personal data, credentials, or project-specific source registries.
For vulnerabilities, follow `SECURITY.md` and avoid putting sensitive details
in a public issue.

## License

The framework code and repository-authored synthetic fixtures are available
under the MIT License. See `LICENSE`. The license does not grant rights to any
third-party data connected by downstream users.
