import type { SourceCandidate } from "../../lib/ingestion/contracts.ts"

export const exampleReleaseCandidate = {
  schemaVersion: "1.0",
  id: "candidate-example-unconfigured",
  title: "EXAMPLE SOURCE — NOT CONFIGURED",
  publisher: "Example publisher placeholder",
  releasePageUrl: "https://example.invalid/source-listing",
  assetUrl: "https://example.invalid/source-asset.pdf",
  publishedAt: "2000-01-01",
  discoveredAt: "2000-01-01T00:00:00Z",
  authorityAssessment: {
    listing: "unresolved",
    documentBytes: "not_acquired",
    note: "Framework placeholder only. No publisher or source has been configured.",
  },
  reportedPageCount: {
    value: null,
    state: "unknown",
    note: "No source file or page count is included in the public framework.",
  },
  access: {
    status: "unavailable",
    checkedAt: "2000-01-01T00:00:00Z",
    note: "Example.invalid is intentionally non-resolving; no network acquisition is performed.",
  },
  proposedUseBoundary: {
    status: "unresolved",
    note: "A private deployment must supply its own accountable authorization record.",
    canStore: false,
    canExtract: false,
    canDisplayPages: false,
    canQuote: false,
  },
  isFixture: true,
} as const satisfies SourceCandidate & { isFixture: true }
