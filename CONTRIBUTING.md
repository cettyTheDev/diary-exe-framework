# Contributing

DIARY.EXE Framework accepts code, tests, accessibility improvements,
documentation, adapters, and synthetic fixtures. Keep every change
evidence-first and fail closed.

## Public-repository boundary

Do not submit:

- real source URLs, titles, files, page images, quotations, or checksums;
- real people, organizations, events, claims, or relationship assertions;
- production indexes, approval records, private API locations, or credentials;
- personal data or material with unresolved redistribution rights.

All examples must use reserved domains such as `example.invalid`, neutral
placeholder names, and `isFixture: true` wherever the record supports a fixture
flag.

## Before opening a pull request

1. Read `docs/CONTENT_RULES.md`, `docs/M4_AUTHORIZATION.md`, and
   `docs/PUBLIC_PRIVATE_BOUNDARY.md`.
2. Preserve source, page, checksum, citation, and review boundaries.
3. Run `npm run check` and `npm run build`.
4. Add or update tests for behavior changes.

A pull request or issue never grants permission to acquire or publish a real
source.

## Reporting problems

Use a public issue for ordinary bugs and feature requests. Follow
`SECURITY.md` for vulnerabilities or reports containing sensitive details.
