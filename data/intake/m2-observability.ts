export const m2FixtureObservability = {
  schemaVersion: "1.0",
  mode: "fixture_rehearsal",
  runId: "run-m2-synthetic-corpus-v1",
  observedAt: "2026-07-28T00:00:02Z",
  inputSha256:
    "b8bdea56f3c7f395eb0c62a9084af6f61face7feed23431177ef4128a1211ed8",
  indexSha256:
    "50a8f97b7edd306cd66d8142a7b3ffcefa369125b37fa46d5034e1c2dbd8d49c",
  metrics: {
    extractedPages: 3,
    normalizedEntries: 3,
    reviewCandidates: 6,
    pendingReviews: 6,
    indexTerms: 25,
    indexPostings: 37,
    ledgerEvents: 2,
    structuralQualityChecks: 3,
  },
  stages: {
    vault: {
      label: "IMMUTABLE VAULT",
      state: "VERIFIED",
      detail:
        "Input bytes stored by SHA-256; the temporary object is read-only.",
    },
    extraction: {
      label: "PAGE EXTRACTION",
      state: "VERIFIED",
      detail: "3/3 pages emitted; one simulated OCR page is flagged at 0.72.",
    },
    normalization: {
      label: "NORMALIZATION",
      state: "VERIFIED",
      detail:
        "3 entry candidates; raw text retained beside hashed derivatives.",
    },
    review: {
      label: "ENTITY REVIEW",
      state: "PENDING",
      detail:
        "6/6 fixture candidates await review and remain ineligible for public use.",
    },
    index: {
      label: "SEARCH INDEX",
      state: "VERIFIED",
      detail: "3 documents, 25 terms, and 37 source-linked postings.",
    },
    quality: {
      label: "QUALITY GATE",
      state: "VERIFIED",
      detail:
        "3/3 structural checks pass; publication remains correctly locked.",
    },
    ledger: {
      label: "RUN LEDGER",
      state: "VERIFIED",
      detail: "The two-event SHA-256 chain validates without mutation.",
    },
  },
} as const
