import { createHash } from "node:crypto"

import {
  generateArchiveQualityReport,
  type ArchiveQualityReport,
} from "../archive/quality.ts"
import type { ArchiveData } from "../archive/types.ts"
import type {
  PublicationPublishDecision,
  PublicationReviewCandidate,
  PublicationReviewDecision,
  PublicationReviewReport,
} from "./contracts.ts"
import { evaluatePublicationReviewQueue } from "./publication-review.ts"

export type ApprovedArchiveSource = {
  id: string
  title: string
  fileName: string
  version: string
  sourceFileId: string
  sha256: string
  sourceUrl: string
}

export type ApprovedArchiveArtifactPayload = {
  schemaVersion: "1.0"
  mode: "approved_archive_slice"
  sourceRunId: string
  publicationReady: true
  review: PublicationReviewReport
  quality: ArchiveQualityReport
  data: ArchiveData
}

export type ApprovedArchiveArtifact = ApprovedArchiveArtifactPayload & {
  artifactSha256: string
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function stableId(prefix: string, ...parts: readonly string[]) {
  return `${prefix}-${sha256(parts.join("\u0000")).slice(0, 16)}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function hasArchiveCollections(value: unknown): value is ArchiveData {
  return (
    isRecord(value) &&
    Array.isArray(value.sources) &&
    Array.isArray(value.pages) &&
    Array.isArray(value.entries) &&
    Array.isArray(value.citations) &&
    Array.isArray(value.entities) &&
    Array.isArray(value.relationships) &&
    Array.isArray(value.topics) &&
    Array.isArray(value.storyArcs)
  )
}

export function createApprovedArchiveArtifact(
  sourceRunId: string,
  approved: ReturnType<typeof buildApprovedArchiveSlice>
): ApprovedArchiveArtifact {
  const payload: ApprovedArchiveArtifactPayload = {
    schemaVersion: "1.0",
    mode: "approved_archive_slice",
    sourceRunId,
    publicationReady: true,
    review: approved.review,
    quality: approved.quality,
    data: approved.data,
  }
  return {
    ...payload,
    artifactSha256: sha256(JSON.stringify(payload)),
  }
}

export function parseApprovedArchiveArtifact(
  value: unknown
): ApprovedArchiveArtifact {
  if (!isRecord(value)) {
    throw new Error("Approved archive artifact must be a JSON object.")
  }
  const { artifactSha256, ...payload } = value
  if (
    typeof artifactSha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(artifactSha256) ||
    sha256(JSON.stringify(payload)) !== artifactSha256
  ) {
    throw new Error("Approved archive artifact checksum does not match.")
  }
  if (
    payload.schemaVersion !== "1.0" ||
    payload.mode !== "approved_archive_slice" ||
    typeof payload.sourceRunId !== "string" ||
    payload.publicationReady !== true ||
    !isRecord(payload.review) ||
    payload.review.valid !== true ||
    payload.review.readyForPublication !== true ||
    !isRecord(payload.quality) ||
    payload.quality.valid !== true ||
    payload.quality.mode !== "production" ||
    !hasArchiveCollections(payload.data)
  ) {
    throw new Error("Approved archive artifact is not publication-ready.")
  }

  let quality: ArchiveQualityReport
  try {
    quality = generateArchiveQualityReport(payload.data, "production")
  } catch {
    throw new Error("Approved archive artifact data is malformed.")
  }
  if (
    !quality.valid ||
    JSON.stringify(quality) !== JSON.stringify(payload.quality)
  ) {
    throw new Error(
      "Approved archive artifact quality attestation does not match."
    )
  }
  if (
    payload.data.entries.length === 0 ||
    payload.data.pages.some(
      (page) =>
        page.extractedText !==
        "[FULL PAGE TEXT WITHHELD — APPROVED QUOTATIONS ONLY]"
    )
  ) {
    throw new Error(
      "Approved archive artifact must contain entries and withhold full page text."
    )
  }

  return {
    ...(payload as ApprovedArchiveArtifactPayload),
    artifactSha256,
  }
}

export function buildApprovedArchiveSlice(input: {
  source: ApprovedArchiveSource
  candidates: readonly PublicationReviewCandidate[]
  decisions: readonly PublicationReviewDecision[]
}) {
  if (!/^[a-f0-9]{64}$/.test(input.source.sha256)) {
    throw new Error("Approved archive slice requires a source SHA-256.")
  }
  try {
    if (new URL(input.source.sourceUrl).protocol !== "https:") {
      throw new Error("not HTTPS")
    }
  } catch {
    throw new Error("Approved archive slice requires an HTTPS source URL.")
  }
  if (
    input.candidates.some(
      (candidate) =>
        candidate.sourceId !== input.source.id ||
        candidate.sourceFileId !== input.source.sourceFileId
    )
  ) {
    throw new Error("Publication candidates do not match the approved source.")
  }

  const review = evaluatePublicationReviewQueue({
    candidates: input.candidates,
    decisions: input.decisions,
  })
  if (!review.readyForPublication) {
    throw new Error(
      `Publication review is not ready: ${review.errors.join("; ") || `${review.metrics.pending} pending decision(s)`}`
    )
  }

  const candidateIndex = new Map(
    input.candidates.map((candidate) => [candidate.id, candidate])
  )
  const publishDecisions = input.decisions.filter(
    (decision): decision is PublicationPublishDecision =>
      decision.disposition === "publish"
  )
  const approvedCandidates = review.approvedCandidateIds.map((id) => {
    const candidate = candidateIndex.get(id)
    if (!candidate) throw new Error(`Approved candidate ${id} is missing.`)
    return candidate
  })
  const pageRecords = approvedCandidates
    .map((candidate) => ({
      id: stableId("page", candidate.sourceId, candidate.pageNumber.toString()),
      sourceId: candidate.sourceId,
      pageNumber: candidate.pageNumber,
      extractedText: "[FULL PAGE TEXT WITHHELD — APPROVED QUOTATIONS ONLY]",
      extractionKind: candidate.method,
      confidence: candidate.confidence,
      isFixture: false,
    }))
    .sort((left, right) => left.pageNumber - right.pageNumber)

  const citations = publishDecisions.map((decision) => {
    const candidate = candidateIndex.get(decision.candidateId)!
    return {
      id: stableId("citation", decision.decisionId, candidate.rawTextSha256),
      sourceId: input.source.id,
      pageNumbers: [candidate.pageNumber],
      label: `Official source page ${candidate.pageNumber}`,
      state: "verified" as const,
      note: "Source-verified quotation linked to the official source package.",
      isFixture: false,
    }
  })
  const citationByDecision = new Map(
    publishDecisions.map((decision, index) => [
      decision.decisionId,
      citations[index]!,
    ])
  )
  const entries = publishDecisions.map((decision) => {
    const candidate = candidateIndex.get(decision.candidateId)!
    return {
      id: stableId(
        "entry",
        decision.decisionId,
        candidate.rawTextSha256,
        decision.exactText
      ),
      date: decision.date,
      datePrecision: decision.datePrecision,
      title: decision.title,
      exactText: decision.exactText,
      normalizedText: decision.exactText.replace(/\s+/g, " ").trim(),
      context: decision.context,
      evidenceKind: decision.evidenceKind,
      sourceId: input.source.id,
      sourcePages: [candidate.pageNumber],
      citationIds: [citationByDecision.get(decision.decisionId)!.id],
      entityIds: [],
      topicIds: [],
      storyArcIds: [],
      featured: false,
      editorialPosture: decision.editorialPosture,
      responseState: decision.responseState,
      isFixture: false,
    }
  })
  const data: ArchiveData = {
    sources: [
      {
        id: input.source.id,
        title: input.source.title,
        fileName: input.source.fileName,
        version: input.source.version,
        checksum: input.source.sha256,
        sourceUrl: input.source.sourceUrl,
        status: "verified",
        pageIds: pageRecords.map((page) => page.id),
        isFixture: false,
      },
    ],
    pages: pageRecords,
    entries,
    citations,
    entities: [],
    relationships: [],
    topics: [],
    storyArcs: [],
  }
  const quality = generateArchiveQualityReport(data, "production")
  if (!quality.valid) {
    throw new Error(
      `Approved archive slice failed production quality: ${quality.errors
        .map((error) => error.message)
        .join("; ")}`
    )
  }

  return { data, review, quality }
}
