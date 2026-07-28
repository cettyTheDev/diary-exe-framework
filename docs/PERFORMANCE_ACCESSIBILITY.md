# Performance and accessibility audit

Updated: 2026-07-28 UTC

## Release scope

This audit covers the M3 fixture UI at `/receipts`, `/timeline`, `/board`, and
`/sources`, including the receipt composer and story-arc board controls.

## Performance

- All product routes and the OpenGraph image remain statically prerendered.
- The receipt composer is an on-demand client chunk and is absent from the
  initial `/receipts` request list.
- The Canvas PNG renderer is a second on-demand chunk loaded only after the user
  selects `DOWNLOAD PNG`.
- The renderer uses system fonts and local drawing commands. It performs no
  upload, remote font, image, analytics, transaction, or social request.
- A fresh local production-browser sample recorded navigation completion at
  103 ms, DOMContentLoaded at 23 ms, and first contentful paint at 276 ms. These
  values are a local regression baseline, not a public-network performance
  claim.

## Accessibility

- Composer and Trace use labeled modal sheets with visible titles and close
  controls.
- Keyboard focus remains trapped inside the open composer; `Shift+Tab` reaches
  the close control and `Escape` closes the sheet and removes its URL state.
- Composer download/copy results and footer clipboard failures use polite live
  status text.
- Story-arc controls expose pressed state; icon-only arc links have explicit
  accessible names.
- Evidence labels and the permanent fixture warning are represented as text,
  not color alone.
- At 390×844, Receipts composer and Board both report document scroll width
  equal to viewport width (`390:390`).
- Reduced-motion handling remains global through
  `prefers-reduced-motion: reduce`.
- Final local browser checks reported zero console errors or warnings.

## Known boundary

The visual receipt preview intentionally scales a 1080×1350 card down on narrow
screens. All of its text remains represented in the accessibility tree, and the
downloaded PNG preserves the full-resolution metadata. The exported fixture
tested as an RGBA PNG at exactly 1080×1350.
