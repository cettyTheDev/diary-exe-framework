# Status

Updated: 2026-07-30 UTC

## Completed

- The fixture-safe Board now exposes bounded 70%–240% zoom, drag and keyboard panning, reset controls, and a focus/hover relationship lens. Dense graphs remain a full-width card list below 72rem so touch scrolling and text readability are preserved.
- The generic Board visual layer now replaces uniform rectangular nodes and a square grid with an entity-shaped evidence orbit: circular hubs, irregular person markers, organization capsules, topic hexagons, relation-count seals, orbit guides, pill arc filters, and alternating evidence-card corners. Fixture labels remain explicit and unchanged.
- A source-neutral approved-slice contract and compact runtime package are now public framework code. The compact form omits only deterministic repetition and must reconstruct an artifact that passes its original checksum, review attestation, and production-quality gates.
- Production schemas now require an HTTPS source URL plus explicit editorial posture and response state; fixture data keeps those production-only values null or absent and remains visibly synthetic.
- The relationship board is data-driven instead of four-node hard-coded: a deterministic layout supports small fixture graphs and bounded dense downstream graphs, separates repeated edges, preserves connected-component order, and switches dense nodes to a narrower-screen list.
- The public framework includes a responsive evidence-magazine discovery cover, share preview, local 1080×1350 renderer, and matching OpenGraph treatment.
- The discovery cover remains permanently fixture-labeled and publication-locked; it contains no production source identity, quotation, relationship, hash, or private review record.
- Long unbroken metadata values such as SHA-256 checksums wrap inside the generated local PNG instead of overflowing its evidence fields.

## Verified

- ESLint, strict TypeScript, all 56 fixture/boundary tests, and the nine-route production build pass.
- The fixture Board keeps every node and edge visibly labeled as demo data while exercising the same zoom/pan/lens interaction boundary as downstream reviewed graphs.
- Chromium verifies the fixture-safe controls at 140% zoom with the expected transformed stage, horizontal desktop controls, no viewport overflow, and a 390px mobile fallback with four full-width cards and hidden zoom controls.
- Compact-package regression reconstructs the exact artifact and rejects changed entry text through the original checksum gate; all three public-data boundary tests still pass.
- Chromium verifies the four-node/three-edge dynamic fixture Board with zero overlaps at 1440px, the stacked mobile Board at `390:390`, visible `DESIGN FIXTURE` and `SOURCE FILE REQUIRED` boundaries, zero named production entities, and zero console errors or warnings.

## Next

- Keep production adapters and source-specific visuals in private deployment repositories; synchronize only generic, fixture-safe framework improvements here.
