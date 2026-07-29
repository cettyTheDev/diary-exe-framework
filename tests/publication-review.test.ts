import { createHash } from "node:crypto"
import assert from "node:assert/strict"
import test from "node:test"

import type {
  PageExtractionArtifact,
  PageExtractionRunResult,
  PublicationPublishDecision,
  PublicationRejectDecision,
} from "../lib/ingestion/contracts.ts"
import {
  createPublicationReviewQueue,
  evaluatePublicationReviewQueue,
} from "../lib/ingestion/publication-review.ts"

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function extractionPage(
  pageNumber: number,
  rawText: string,
  method: "source_text" | "ocr" = "source_text"
): PageExtractionArtifact {
  return {
    schemaVersion: "1.0",
    id: `extraction-production-${pageNumber}`,
    sourceId: "source-production-test",
    sourceFileId: "file-production-test",
    pageNumber,
    method,
    rawText,
    inputPageSha256: sha256(`input-${pageNumber}`),
    rawTextSha256: sha256(rawText),
    confidence: method === "source_text" ? 1 : 0,
    verificationState: "unverified",
    extractor: { id: "production-test", version: "1.0.0" },
    isFixture: false,
  }
}

function extractionRun(
  pages: readonly PageExtractionArtifact[]
): PageExtractionRunResult {
  return {
    schemaVersion: "1.0",
    runId: "run-publication-review-test",
    status: "complete",
    pages,
    totalPages: pages.length,
    reusedPages: 0,
    failedPage: null,
    errors: [],
  }
}

function publishDecision(
  candidateId: string,
  rawText: string
): PublicationPublishDecision {
  const exactText = "Daily note was recorded."
  const quoteStart = rawText.indexOf(exactText)
  return {
    schemaVersion: "1.0",
    decisionId: "publication-decision-publish-1",
    candidateId,
    disposition: "publish",
    quoteStart,
    quoteEnd: quoteStart + exactText.length,
    exactText,
    title: "A verified daily record",
    context: "This test-only context describes the selected source range.",
    date: "2020-03-01",
    datePrecision: "day",
    recordType: "diary_entry",
    evidenceKind: "diary_text",
    editorialPosture: "source_record",
    responseState: "not_applicable",
    privacyReview: "clear",
    privacyNote:
      "The detected address is an institutional test address and is excluded from the selected quotation.",
    thirdPartyReview: "none",
    transcriptionVerified: true,
    sourceLinkVerified: true,
    reviewer: "reviewer-test",
    reviewedAt: "2026-07-28T18:00:00Z",
    note: "Test-only accountable publication decision.",
    isFixture: false,
  }
}

function rejectDecision(candidateId: string): PublicationRejectDecision {
  return {
    schemaVersion: "1.0",
    decisionId: "publication-decision-reject-2",
    candidateId,
    disposition: "reject",
    reason: "extraction_quality",
    reviewer: "reviewer-test",
    reviewedAt: "2026-07-28T18:00:00Z",
    note: "No embedded source text; OCR is required before review.",
    isFixture: false,
  }
}

test("publication queue flags sensitive patterns and OCR-required pages", () => {
  const text = "Daily note was recorded. Contact test@example.gov for context."
  const queue = createPublicationReviewQueue(
    extractionRun([
      extractionPage(1, text),
      extractionPage(
        2,
        "[OCR REQUIRED — NO SOURCE TEXT EXTRACTED FROM PAGE 2]",
        "ocr"
      ),
    ])
  )

  assert.equal(queue.length, 2)
  assert.deepEqual(queue[0]?.sensitivePatternFlags, ["email_address"])
  assert.equal(queue[0]?.readyForQuoteReview, true)
  assert.deepEqual(queue[1]?.sensitivePatternFlags, ["ocr_required"])
  assert.equal(queue[1]?.readyForQuoteReview, false)
})

test("publication review requires a decision for every candidate", () => {
  const text = "Daily note was recorded. Contact test@example.gov for context."
  const candidates = createPublicationReviewQueue(
    extractionRun([
      extractionPage(1, text),
      extractionPage(
        2,
        "[OCR REQUIRED — NO SOURCE TEXT EXTRACTED FROM PAGE 2]",
        "ocr"
      ),
    ])
  )
  const incomplete = evaluatePublicationReviewQueue({
    candidates,
    decisions: [publishDecision(candidates[0]!.id, text)],
  })
  const ready = evaluatePublicationReviewQueue({
    candidates,
    decisions: [
      publishDecision(candidates[0]!.id, text),
      rejectDecision(candidates[1]!.id),
    ],
  })

  assert.equal(incomplete.readyForPublication, false)
  assert.equal(incomplete.metrics.pending, 1)
  assert.equal(ready.valid, true)
  assert.equal(ready.readyForPublication, true)
  assert.deepEqual(ready.metrics, {
    candidates: 2,
    publish: 1,
    reject: 1,
    pending: 0,
    blocked: 0,
  })
})

test("publication review blocks mismatched quotes and unattributed comparisons", () => {
  const text = "Daily note was recorded."
  const candidates = createPublicationReviewQueue(
    extractionRun([extractionPage(1, text)])
  )
  const decision = publishDecision(candidates[0]!.id, text)
  const report = evaluatePublicationReviewQueue({
    candidates,
    decisions: [
      {
        ...decision,
        exactText: "Text that is not present.",
        editorialPosture: "editorial_comparison",
        responseState: "not_applicable",
      },
    ],
  })

  assert.equal(report.valid, false)
  assert.equal(report.readyForPublication, false)
  assert.equal(report.metrics.blocked, 1)
  assert.match(report.errors.join("\n"), /does not match/)
  assert.match(report.errors.join("\n"), /require a response state/)
})

test("publication review allows multiple non-overlapping entries on one page", () => {
  const firstText = "Daily note was recorded."
  const secondText = "A second dated note followed."
  const text = `${firstText} ${secondText}`
  const candidates = createPublicationReviewQueue(
    extractionRun([extractionPage(1, text)])
  )
  const first = publishDecision(candidates[0]!.id, text)
  const secondStart = text.indexOf(secondText)
  const ready = evaluatePublicationReviewQueue({
    candidates,
    decisions: [
      first,
      {
        ...first,
        decisionId: "publication-decision-publish-2",
        quoteStart: secondStart,
        quoteEnd: secondStart + secondText.length,
        exactText: secondText,
        title: "A second verified daily record",
      },
    ],
  })
  const overlap = evaluatePublicationReviewQueue({
    candidates,
    decisions: [
      first,
      {
        ...first,
        decisionId: "publication-decision-overlap",
      },
    ],
  })

  assert.equal(ready.readyForPublication, true)
  assert.equal(ready.metrics.publish, 2)
  assert.equal(ready.approvedCandidateIds.length, 1)
  assert.equal(overlap.readyForPublication, false)
  assert.match(overlap.errors.join("\n"), /overlaps another approved quote/)
})

test("publication queue refuses fixture or tampered extraction pages", () => {
  const page = extractionPage(1, "Daily note was recorded.")
  assert.throws(
    () =>
      createPublicationReviewQueue(
        extractionRun([{ ...page, isFixture: true }])
      ),
    /refuses fixture/
  )
  assert.throws(
    () =>
      createPublicationReviewQueue(
        extractionRun([{ ...page, rawText: "tampered" }])
      ),
    /checksum does not match/
  )
})
