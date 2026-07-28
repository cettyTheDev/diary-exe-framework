export type SourceAuthorityKind =
  | "fixture"
  | "owner_provided"
  | "official_public_record"
  | "third_party_unresolved"

export type UseBoundaryStatus =
  "fixture_only" | "approved" | "restricted" | "unresolved"

export type SourceCandidate = {
  schemaVersion: "1.0"
  id: string
  title: string
  publisher: string
  releasePageUrl: string
  assetUrl: string
  publishedAt: string
  discoveredAt: string
  authorityAssessment: {
    listing: "official_publisher" | "third_party" | "unresolved"
    documentBytes: "verified" | "not_acquired" | "unresolved"
    note: string
  }
  reportedPageCount: {
    value: number | null
    state: "verified_from_file" | "reported_unverified" | "unknown"
    note: string
  }
  access: {
    status: "available" | "listed_not_acquired" | "unavailable"
    checkedAt: string
    note: string
  }
  proposedUseBoundary: SourceManifest["useBoundary"]
}

export type ProductionIntakeApproval = {
  schemaVersion: "1.0"
  approvalId: string
  candidateId: string
  approvedBy: string
  approvedAt: string
  note: string
  permissions: Pick<
    SourceManifest["useBoundary"],
    "canStore" | "canExtract" | "canDisplayPages" | "canQuote"
  >
}

export type FileInventory = {
  id: string
  relativePath: string
  fileName: string
  mimeType: string
  byteLength: number
  checksumAlgorithm: "sha256"
  sha256: string
}

export type SourcePageInventory = {
  id: string
  sourceFileId: string
  pageNumber: number
  state: "fixture" | "pending_extraction" | "extracted" | "failed"
}

export type SourceManifest = {
  schemaVersion: "1.0"
  sourceId: string
  title: string
  authority: {
    kind: SourceAuthorityKind
    origin: string
    note: string
  }
  useBoundary: {
    status: UseBoundaryStatus
    note: string
    canStore: boolean
    canExtract: boolean
    canDisplayPages: boolean
    canQuote: boolean
  }
  files: readonly FileInventory[]
  pages: readonly SourcePageInventory[]
  isFixture: boolean
}

export type IngestionStage = {
  stage: "inventory" | "page_inventory" | "extraction"
  status: "complete" | "blocked" | "failed"
  recordCount: number
  note: string
}

export type IngestionRun = {
  schemaVersion: "1.0"
  runId: string
  mode: "fixture_dry_run" | "inventory"
  sourceId: string
  inputChecksums: readonly string[]
  stages: readonly IngestionStage[]
  deterministic: boolean
}

export type ExtractionRecord = {
  schemaVersion: "1.0"
  id: string
  sourceId: string
  sourceFileId: string
  pageNumber: number
  method: "source_text" | "ocr" | "none"
  rawText: string
  confidence: number | null
  state: "unverified" | "verified" | "failed"
  isFixture: boolean
}

export type ValidationIssue = {
  code: string
  severity: "error" | "warning"
  message: string
  recordId?: string
}

export type ValidationReport = {
  schemaVersion: "1.0"
  reportId: string
  sourceId: string
  valid: boolean
  errors: readonly ValidationIssue[]
  warnings: readonly ValidationIssue[]
  metrics: {
    files: number
    pages: number
    extractions: number
  }
}

export type FixtureDryRunResult = {
  manifest: SourceManifest
  run: IngestionRun
  extractions: readonly ExtractionRecord[]
  validation: ValidationReport
}

export type IntakeGateCheck = {
  id:
    | "official_listing"
    | "source_file_identity"
    | "use_boundary"
    | "page_inventory"
  status: "ready" | "blocked"
  note: string
}

export type ProductionIntakeGateReport = {
  schemaVersion: "1.0"
  candidateId: string
  approvalId: string | null
  readyForAcquisition: boolean
  readyForExtraction: boolean
  readyForQuotation: boolean
  readyForPageDisplay: boolean
  checks: readonly IntakeGateCheck[]
  permissions: readonly {
    id: "store" | "extract" | "quote" | "display_pages"
    status: "ready" | "blocked"
    note: string
  }[]
}

export type VaultReceipt = {
  schemaVersion: "1.0"
  receiptId: string
  sourceId: string
  objectId: string
  originalRelativePath: string
  storedRelativePath: string
  file: FileInventory
  recordedAt: string
  action: "created" | "reused"
  isFixture: boolean
}

export type IngestionLedgerEvent = {
  schemaVersion: "1.0"
  eventId: string
  occurredAt: string
  runId: string
  stage: string
  status: "started" | "completed" | "blocked" | "failed"
  detail: string
}

export type IngestionLedgerRecord = {
  schemaVersion: "1.0"
  sequence: number
  previousHash: string | null
  event: IngestionLedgerEvent
  recordHash: string
}

export type IngestionLedgerReport = {
  valid: boolean
  records: readonly IngestionLedgerRecord[]
  errors: readonly string[]
  headHash: string | null
}

export type PageExtractionArtifact = {
  schemaVersion: "1.0"
  id: string
  sourceId: string
  sourceFileId: string
  pageNumber: number
  method: "source_text" | "ocr"
  rawText: string
  inputPageSha256: string
  rawTextSha256: string
  confidence: number
  verificationState: "unverified" | "verified"
  extractor: {
    id: string
    version: string
  }
  isFixture: boolean
}

export type PageExtractionRunResult = {
  schemaVersion: "1.0"
  runId: string
  status: "complete" | "failed"
  pages: readonly PageExtractionArtifact[]
  totalPages: number
  reusedPages: number
  failedPage: number | null
  errors: readonly string[]
}

export type NormalizedEntryCandidate = {
  schemaVersion: "1.0"
  id: string
  sourceId: string
  sourceFileId: string
  sourcePages: readonly number[]
  title: string
  rawText: string
  rawTextSha256: string
  normalizedText: string
  normalizedTextSha256: string
  date: string | null
  datePrecision: "day" | "month" | "range" | "unknown"
  dateConfidence: number
  dateEvidence: string
  evidenceKind: "ocr_unverified" | "unresolved"
  isFixture: boolean
}

export type EntityCandidateRecord = {
  schemaVersion: "1.0"
  id: string
  entryCandidateId: string
  label: string
  kind: "person" | "organization" | "entry" | "topic" | "unknown"
  sourcePages: readonly number[]
  confidence: number
  origin: "fixture_marker" | "model" | "rule"
  isFixture: boolean
}

export type NormalizationResult = {
  schemaVersion: "1.0"
  runId: string
  status: "complete" | "needs_review" | "failed"
  entries: readonly NormalizedEntryCandidate[]
  entityCandidates: readonly EntityCandidateRecord[]
  warnings: readonly string[]
  errors: readonly string[]
}

export type EntityReviewDecision = {
  schemaVersion: "1.0"
  decisionId: string
  candidateId: string
  decision: "accept" | "reject"
  reviewer: string
  reviewedAt: string
  note: string
  isFixture: boolean
}

export type EntityReviewReport = {
  valid: boolean
  readyForPublicUse: boolean
  metrics: {
    candidates: number
    accepted: number
    rejected: number
    pending: number
  }
  errors: readonly string[]
}

export type CorpusIndexDocument = {
  schemaVersion: "1.0"
  id: string
  title: string
  normalizedText: string
  date: string | null
  sourceId: string
  sourceFileId: string
  sourcePages: readonly number[]
  tokenCount: number
  isFixture: boolean
}

export type CorpusIndexPosting = {
  documentId: string
  frequency: number
}

export type CorpusSearchIndex = {
  schemaVersion: "1.0"
  indexId: string
  runId: string
  indexSha256: string
  documents: readonly CorpusIndexDocument[]
  postings: Readonly<Record<string, readonly CorpusIndexPosting[]>>
  isFixture: boolean
}

export type CorpusSearchHit = {
  document: CorpusIndexDocument
  score: number
  matchedTerms: readonly string[]
}

export type CorpusSearchSummary = {
  indexId: string
  indexSha256: string
  documents: number
  terms: number
  postings: number
  isFixture: boolean
}

export type M2PipelineQualityCheck = {
  id:
    | "extraction_complete"
    | "record_alignment"
    | "index_integrity"
    | "ocr_review"
    | "entity_review"
    | "publication_boundary"
  status: "pass" | "warning" | "blocked"
  note: string
}

export type M2PipelineQualityReport = {
  schemaVersion: "1.0"
  runId: string
  valid: boolean
  readyForPublication: boolean
  checks: readonly M2PipelineQualityCheck[]
  metrics: {
    extractedPages: number
    normalizedEntries: number
    indexedDocuments: number
    lowConfidenceOcrPages: number
    pendingEntityReviews: number
  }
  errors: readonly string[]
}
