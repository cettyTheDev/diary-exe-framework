import { verifyCorpusSearchIndex } from "../archive/full-text-index.ts"
import type {
  CorpusSearchIndex,
  EntityReviewReport,
  M2PipelineQualityCheck,
  M2PipelineQualityReport,
  NormalizationResult,
  PageExtractionRunResult,
} from "./contracts.ts"

export function evaluateM2PipelineQuality(input: {
  runId: string
  extraction: PageExtractionRunResult
  normalization: NormalizationResult
  review: EntityReviewReport
  searchIndex: CorpusSearchIndex
}): M2PipelineQualityReport {
  const checks: M2PipelineQualityCheck[] = []
  const errors: string[] = []
  const lowConfidenceOcrPages = input.extraction.pages.filter(
    (page) => page.method === "ocr" && page.confidence < 0.8
  ).length
  const countsAlign =
    input.extraction.pages.length === input.normalization.entries.length &&
    input.normalization.entries.length === input.searchIndex.documents.length
  const lineageAligns = input.searchIndex.documents.every((document) => {
    const entry = input.normalization.entries.find(
      (candidate) => candidate.id === document.id
    )
    return (
      entry !== undefined &&
      entry.sourceId === document.sourceId &&
      entry.sourceFileId === document.sourceFileId &&
      JSON.stringify(entry.sourcePages) === JSON.stringify(document.sourcePages)
    )
  })
  const indexValid = verifyCorpusSearchIndex(input.searchIndex)

  checks.push({
    id: "extraction_complete",
    status: input.extraction.status === "complete" ? "pass" : "blocked",
    note:
      input.extraction.status === "complete"
        ? `${input.extraction.pages.length}/${input.extraction.totalPages} pages extracted.`
        : `Extraction stopped at page ${input.extraction.failedPage ?? "unknown"}.`,
  })
  checks.push({
    id: "record_alignment",
    status: countsAlign && lineageAligns ? "pass" : "blocked",
    note:
      countsAlign && lineageAligns
        ? "Extraction, normalization, and index counts and source pointers align."
        : "Pipeline record counts or source pointers do not align.",
  })
  checks.push({
    id: "index_integrity",
    status: indexValid ? "pass" : "blocked",
    note: indexValid
      ? "The deterministic index payload matches its SHA-256."
      : "The deterministic index payload checksum does not match.",
  })
  checks.push({
    id: "ocr_review",
    status: lowConfidenceOcrPages ? "warning" : "pass",
    note: lowConfidenceOcrPages
      ? `${lowConfidenceOcrPages} low-confidence OCR page requires review.`
      : "No low-confidence OCR pages remain.",
  })
  checks.push({
    id: "entity_review",
    status: input.review.metrics.pending ? "blocked" : "pass",
    note: input.review.metrics.pending
      ? `${input.review.metrics.pending} entity candidates remain pending.`
      : "All entity candidates have accountable decisions.",
  })

  const containsFixtures =
    input.extraction.pages.some((page) => page.isFixture) ||
    input.normalization.entries.some((entry) => entry.isFixture) ||
    input.searchIndex.isFixture
  checks.push({
    id: "publication_boundary",
    status:
      !containsFixtures && input.review.readyForPublicUse ? "pass" : "blocked",
    note:
      !containsFixtures && input.review.readyForPublicUse
        ? "Records are non-fixture and the review report permits public use."
        : "Fixture or review boundaries prohibit publication.",
  })

  const structuralChecks = checks.slice(0, 3)
  for (const check of structuralChecks) {
    if (check.status === "blocked") errors.push(check.note)
  }
  const valid = errors.length === 0

  return {
    schemaVersion: "1.0",
    runId: input.runId,
    valid,
    readyForPublication:
      valid && checks.every((check) => check.status === "pass"),
    checks,
    metrics: {
      extractedPages: input.extraction.pages.length,
      normalizedEntries: input.normalization.entries.length,
      indexedDocuments: input.searchIndex.documents.length,
      lowConfidenceOcrPages,
      pendingEntityReviews: input.review.metrics.pending,
    },
    errors,
  }
}
