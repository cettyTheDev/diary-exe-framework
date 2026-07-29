import { createHash } from "node:crypto"

import type {
  PageExtractionRunResult,
  PublicationPublishDecision,
  PublicationReviewCandidate,
  PublicationReviewDecision,
  PublicationReviewReport,
  PublicationSensitivePattern,
} from "./contracts.ts"

const MAX_QUOTE_CHARACTERS = 1200

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function stableCandidateId(
  sourceFileId: string,
  pageNumber: number,
  rawTextSha256: string
) {
  return `publication-candidate-${sha256(
    `${sourceFileId}\u0000${pageNumber}\u0000${rawTextSha256}`
  ).slice(0, 16)}`
}

function sensitivePatternFlags(rawText: string) {
  const flags: PublicationSensitivePattern[] = []
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(rawText)) {
    flags.push("email_address")
  }
  if (/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/.test(rawText)) {
    flags.push("phone_number")
  }
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(rawText)) {
    flags.push("ssn_pattern")
  }
  if (
    /^\[OCR REQUIRED — NO SOURCE TEXT EXTRACTED FROM PAGE \d+\]$/.test(rawText)
  ) {
    flags.push("ocr_required")
  }
  return flags
}

export function createPublicationReviewQueue(
  extraction: PageExtractionRunResult
): readonly PublicationReviewCandidate[] {
  if (extraction.status !== "complete") {
    throw new Error("Publication review requires a complete extraction run.")
  }
  if (extraction.pages.some((page) => page.isFixture)) {
    throw new Error("Publication review refuses fixture extraction pages.")
  }

  return [...extraction.pages]
    .sort((left, right) => left.pageNumber - right.pageNumber)
    .map((page) => {
      if (sha256(page.rawText) !== page.rawTextSha256) {
        throw new Error(
          `Extraction page ${page.id} raw-text checksum does not match.`
        )
      }
      const flags = sensitivePatternFlags(page.rawText)
      return {
        schemaVersion: "1.0",
        id: stableCandidateId(
          page.sourceFileId,
          page.pageNumber,
          page.rawTextSha256
        ),
        extractionId: page.id,
        sourceId: page.sourceId,
        sourceFileId: page.sourceFileId,
        pageNumber: page.pageNumber,
        rawText: page.rawText,
        rawTextSha256: page.rawTextSha256,
        method: page.method,
        confidence: page.confidence,
        sensitivePatternFlags: flags,
        readyForQuoteReview:
          page.rawText.trim().length > 0 && !flags.includes("ocr_required"),
        isFixture: false,
      } satisfies PublicationReviewCandidate
    })
}

function baseDecisionErrors(decision: PublicationReviewDecision) {
  const errors: string[] = []
  if (!decision.decisionId.trim()) errors.push("requires a decision ID")
  if (!decision.reviewer.trim()) errors.push("requires an accountable reviewer")
  if (!decision.note.trim()) errors.push("requires a review note")
  if (!Number.isFinite(Date.parse(decision.reviewedAt))) {
    errors.push("requires a parseable review timestamp")
  }
  if (decision.isFixture) errors.push("cannot be a fixture decision")
  return errors
}

function publishDecisionErrors(
  candidate: PublicationReviewCandidate,
  decision: PublicationPublishDecision
) {
  const errors: string[] = []
  if (!candidate.readyForQuoteReview) {
    errors.push("candidate is not ready for quotation review")
  }
  if (
    !Number.isSafeInteger(decision.quoteStart) ||
    !Number.isSafeInteger(decision.quoteEnd) ||
    decision.quoteStart < 0 ||
    decision.quoteEnd <= decision.quoteStart ||
    decision.quoteEnd > candidate.rawText.length
  ) {
    errors.push("quote offsets are invalid")
  } else if (
    candidate.rawText.slice(decision.quoteStart, decision.quoteEnd) !==
    decision.exactText
  ) {
    errors.push("exact text does not match the approved source range")
  }
  if (
    decision.exactText.trim().length === 0 ||
    decision.exactText.length > MAX_QUOTE_CHARACTERS
  ) {
    errors.push(`exact text must contain 1–${MAX_QUOTE_CHARACTERS} characters`)
  }
  if (!decision.title.trim() || !decision.context.trim()) {
    errors.push("title and context are required")
  }
  if (decision.context.includes(`\"${decision.exactText}\"`)) {
    errors.push("editorial context must not restyle the quotation")
  }
  if (decision.date === null && decision.datePrecision !== "unknown") {
    errors.push("an undated record must use unknown date precision")
  }
  if (decision.date !== null && decision.datePrecision === "unknown") {
    errors.push("a dated record cannot use unknown date precision")
  }
  if (
    decision.date !== null &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(decision.date) ||
      !Number.isFinite(Date.parse(`${decision.date}T00:00:00Z`)))
  ) {
    errors.push("date must be a valid canonical YYYY-MM-DD value")
  }
  if (
    decision.recordType === "diary_entry" &&
    decision.evidenceKind !== "diary_text"
  ) {
    errors.push("a verified diary entry must use diary_text evidence")
  }
  if (
    decision.recordType !== "diary_entry" &&
    decision.evidenceKind === "diary_text"
  ) {
    errors.push("non-diary records cannot use diary_text evidence")
  }
  if (
    decision.editorialPosture !== "source_record" &&
    decision.responseState === "not_applicable"
  ) {
    errors.push("publisher claims and comparisons require a response state")
  }
  if (!decision.privacyNote.trim()) {
    errors.push("privacy review requires an explanatory note")
  }
  if (
    candidate.sensitivePatternFlags.some((flag) => flag !== "ocr_required") &&
    decision.privacyReview === "clear" &&
    decision.privacyNote.trim().length < 20
  ) {
    errors.push(
      "flagged personal-data patterns require a specific privacy note"
    )
  }
  return errors
}

export function evaluatePublicationReviewQueue(input: {
  candidates: readonly PublicationReviewCandidate[]
  decisions: readonly PublicationReviewDecision[]
}): PublicationReviewReport {
  const errors: string[] = []
  const candidateIndex = new Map(
    input.candidates.map((candidate) => [candidate.id, candidate])
  )
  if (candidateIndex.size !== input.candidates.length) {
    errors.push("Publication review queue contains duplicate candidate IDs.")
  }
  if (input.candidates.some((candidate) => candidate.isFixture)) {
    errors.push("Publication review queue contains fixture candidates.")
  }

  const decidedCandidateIds = new Set<string>()
  const decisionIds = new Set<string>()
  const candidateDecisions = new Map<
    string,
    { publishRanges: [number, number][]; rejected: boolean }
  >()
  const approvedCandidateIds: string[] = []
  let publish = 0
  let reject = 0
  let blocked = 0

  for (const decision of input.decisions) {
    if (decisionIds.has(decision.decisionId)) {
      errors.push(`Decision ID ${decision.decisionId} is duplicated.`)
      blocked += 1
      continue
    }
    decisionIds.add(decision.decisionId)
    const candidate = candidateIndex.get(decision.candidateId)
    if (!candidate) {
      errors.push(
        `Decision ${decision.decisionId} references an unknown candidate.`
      )
      blocked += 1
      continue
    }
    decidedCandidateIds.add(decision.candidateId)
    const group = candidateDecisions.get(decision.candidateId) ?? {
      publishRanges: [],
      rejected: false,
    }
    candidateDecisions.set(decision.candidateId, group)
    const decisionErrors = baseDecisionErrors(decision)
    if (decision.disposition === "publish") {
      if (group.rejected) {
        decisionErrors.push("cannot publish a candidate already rejected")
      }
      if (
        group.publishRanges.some(
          ([start, end]) =>
            decision.quoteStart < end && decision.quoteEnd > start
        )
      ) {
        decisionErrors.push("overlaps another approved quote range")
      }
      decisionErrors.push(...publishDecisionErrors(candidate, decision))
    } else {
      if (group.rejected || group.publishRanges.length > 0) {
        decisionErrors.push(
          "cannot reject a candidate with another publication decision"
        )
      }
    }
    if (decisionErrors.length) {
      errors.push(
        ...decisionErrors.map(
          (error) => `Decision ${decision.decisionId} ${error}.`
        )
      )
      blocked += 1
      continue
    }
    if (decision.disposition === "publish") {
      publish += 1
      group.publishRanges.push([decision.quoteStart, decision.quoteEnd])
      if (!approvedCandidateIds.includes(candidate.id)) {
        approvedCandidateIds.push(candidate.id)
      }
    } else {
      reject += 1
      group.rejected = true
    }
  }

  const pending = input.candidates.length - decidedCandidateIds.size
  const valid = errors.length === 0
  return {
    schemaVersion: "1.0",
    valid,
    readyForPublication:
      valid &&
      input.candidates.length > 0 &&
      publish > 0 &&
      pending === 0 &&
      blocked === 0,
    approvedCandidateIds,
    metrics: {
      candidates: input.candidates.length,
      publish,
      reject,
      pending,
      blocked,
    },
    errors,
  }
}
