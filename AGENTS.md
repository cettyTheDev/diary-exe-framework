# DIARY.EXE resident developer notes

- Read `README.md`, `docs/ARCHITECTURE.md`, `docs/CONTENT_RULES.md`, and
  `docs/STATUS.md` before changing product behavior.
- Preserve provenance: no public-facing quote, claim, relationship, or annotation without an evidence kind and citation state.
- Keep originals immutable under `data/raw/`; derived stages belong in their matching data directories.
- Demo content must set `isFixture: true` and remain visibly labeled in the UI. Never invent diary quotations.
- Run `npm run check` and browser verification after material UI changes.
- Update `docs/STATUS.md` before handoff.
- Do not acquire or publish real source files, deploy, transact, or use external services without explicit maintainer authorization.
