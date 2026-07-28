# Editorial overlays

Updated: 2026-07-28 UTC

## Purpose

Story arcs are curated navigation overlays on canonical archive records. They
help a reader follow a review theme without changing source text, evidence
labels, citations, or chronological ordering.

## Safety contract

- An arc is an editorial grouping, not a claim that one record caused another.
- Selecting an arc only changes visual scope. It does not create or delete
  entities, relationships, entries, or citations.
- Board threads remain typed relationships and keep their citation state and
  page label visible.
- A relationship belongs to an active board scope only when at least one of its
  citations is attached to an entry in that arc.
- Nodes outside the selected arc remain inspectable but are visually muted.
- Current arcs and records are visibly marked fixtures.

## Permalinks

- Timeline: `/timeline?arc=<story-arc-id>`
- Board: `/board?arc=<story-arc-id>`
- Board focus can be combined with an arc using `focus=<entity-or-edge-id>`.

Unknown arc identifiers fail back to the complete evidence-safe fixture view.
