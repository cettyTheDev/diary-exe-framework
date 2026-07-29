# DIARY.EXE Framework

An evidence-first archive interface and ingestion framework for building
source-linked timelines, relationship boards, receipts, and page-level review
workflows.

## Live project

[Explore DIARY.EXE](https://diary-exe.vercel.app) — a live project built with
this framework. Its reviewed production content, source registry, and private
publication pipeline are not included in this public repository.

This public repository contains framework code and conspicuously labeled
synthetic fixtures only. It contains no real source registry, source URL,
document, quotation, page image, production index, approval record, credential,
or private project history.

## What is included

- a Next.js archive UI with receipts, timeline, relationship, and source views;
- typed provenance, citation, review, and authorization contracts;
- deterministic fixture-only ingestion, extraction, indexing, and quality
  checks;
- bounded contiguous extraction windows for downstream page-batch workflows;
- exact-range publication review contracts plus a localhost-only accountable review
  workbench;
- a bounded local PDF.js/Tesseract OCR adapter for private image-only page
  processing, with no network provider;
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
npm run review:workbench -- --queue data/editorial/review-queues/<run-id>/queue.json --decisions data/editorial/review-queues/<run-id>/decisions.json --reviewer <name>
npm run quality:report
```

The review workbench is a standalone Node process, not a public Next.js route.
It accepts only queue/decision artifacts inside the ignored
`data/editorial/review-queues/` directory, binds to `127.0.0.1`, requires a
random session token, derives exact quotation text server-side, and writes the
decision file atomically with `0600` permissions. Downstream private systems
are responsible for creating a queue with the exported contracts and for
keeping raw extraction text and reviewer identity out of Git and deployment
artifacts.

`createPdfJsTesseractOcrAdapter` is available to private downstream pipelines
that have already passed their own source and use-authorization gates. It
preserves embedded text pages, renders only image-only pages in memory, streams
PNG bytes to a local Tesseract process over stdin, records confidence and tool
version, and returns an explicit OCR-required marker for blank scans. The
adapter has bounded page count, render scale, process output, and per-page
runtime; its output is unverified extraction evidence and still requires
accountable source and publication review.

The extraction kernel accepts a positive contiguous page window instead of
assuming every run starts at page one. Downstream adapters remain responsible
for enforcing their own maximum window size, document bounds, authorization,
and private-output location.

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
