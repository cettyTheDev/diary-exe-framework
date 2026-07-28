import { createHash } from "node:crypto"

import type {
  EntityCandidateRecord,
  NormalizationResult,
  NormalizedEntryCandidate,
  PageExtractionArtifact,
} from "./contracts.ts"

const DATE_MARKER = /^\[FIXTURE DATE ([^\]]+)\]$/m
const ENTITY_MARKER = /^\[ENTITY:([^\]]+)\]$/gm
const TOPIC_MARKER = /^\[TOPIC:([^\]]+)\]$/gm
const METADATA_MARKER = /^\[(?:FIXTURE DATE|ENTITY:|TOPIC:).*\]\s*$/gm

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function stableId(prefix: string, ...parts: readonly (string | number)[]) {
  return `${prefix}-${sha256(parts.join("\u0000")).slice(0, 16)}`
}

function normalizeDate(value: string | undefined) {
  if (!value || value === "UNKNOWN") {
    return {
      date: null,
      precision: "unknown" as const,
      confidence: 1,
      evidence: value ?? "missing fixture date marker",
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return {
      date: value,
      precision: "day" as const,
      confidence: 1,
      evidence: value,
    }
  }

  if (/^\d{4}-\d{2}$/.test(value)) {
    return {
      date: `${value}-01`,
      precision: "month" as const,
      confidence: 0.9,
      evidence: value,
    }
  }

  return {
    date: null,
    precision: "unknown" as const,
    confidence: 0,
    evidence: value,
  }
}

function entityKind(label: string): EntityCandidateRecord["kind"] {
  if (label.startsWith("Person ")) return "person"
  if (label.startsWith("Organization ")) return "organization"
  if (label.startsWith("Entry ")) return "entry"
  return "unknown"
}

export function normalizeFixturePages(input: {
  runId: string
  pages: readonly PageExtractionArtifact[]
}): NormalizationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const entries: NormalizedEntryCandidate[] = []
  const entityCandidates: EntityCandidateRecord[] = []

  if (input.pages.some((page) => !page.isFixture)) {
    return {
      schemaVersion: "1.0",
      runId: input.runId,
      status: "failed",
      entries: [],
      entityCandidates: [],
      warnings,
      errors: ["Fixture normalization refuses non-fixture pages."],
    }
  }

  for (const page of [...input.pages].sort(
    (left, right) => left.pageNumber - right.pageNumber
  )) {
    const rawText = page.rawText
    const marker = rawText.match(DATE_MARKER)?.[1]
    const normalizedDate = normalizeDate(marker)
    if (normalizedDate.confidence === 0) {
      warnings.push(
        `Page ${page.pageNumber} has an unsupported fixture date marker: ${marker}.`
      )
    }
    if (page.method === "ocr" && page.confidence < 0.8) {
      warnings.push(
        `Page ${page.pageNumber} OCR confidence ${page.confidence.toFixed(2)} requires review.`
      )
    }

    const normalizedText = rawText
      .replaceAll(METADATA_MARKER, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
    const entryId = stableId(
      "entry-candidate",
      page.sourceFileId,
      page.pageNumber,
      page.rawTextSha256
    )
    const entry: NormalizedEntryCandidate = {
      schemaVersion: "1.0",
      id: entryId,
      sourceId: page.sourceId,
      sourceFileId: page.sourceFileId,
      sourcePages: [page.pageNumber],
      title: normalizedDate.date
        ? `Fixture entry — ${normalizedDate.evidence}`
        : `Fixture entry — page ${page.pageNumber}`,
      rawText,
      rawTextSha256: page.rawTextSha256,
      normalizedText,
      normalizedTextSha256: sha256(normalizedText),
      date: normalizedDate.date,
      datePrecision: normalizedDate.precision,
      dateConfidence: normalizedDate.confidence,
      dateEvidence: normalizedDate.evidence,
      evidenceKind: page.method === "ocr" ? "ocr_unverified" : "unresolved",
      isFixture: true,
    }
    entries.push(entry)

    const markers = [
      ...[...rawText.matchAll(ENTITY_MARKER)].map((match) => ({
        label: match[1].trim(),
        kind: entityKind(match[1].trim()),
      })),
      ...[...rawText.matchAll(TOPIC_MARKER)].map((match) => ({
        label: match[1].trim(),
        kind: "topic" as const,
      })),
    ]
    for (const [index, candidate] of markers.entries()) {
      entityCandidates.push({
        schemaVersion: "1.0",
        id: stableId(
          "entity-candidate",
          entryId,
          candidate.kind,
          candidate.label,
          index
        ),
        entryCandidateId: entryId,
        label: candidate.label,
        kind: candidate.kind,
        sourcePages: [page.pageNumber],
        confidence: 1,
        origin: "fixture_marker",
        isFixture: true,
      })
    }
  }

  return {
    schemaVersion: "1.0",
    runId: input.runId,
    status: errors.length
      ? "failed"
      : entityCandidates.length
        ? "needs_review"
        : "complete",
    entries,
    entityCandidates,
    warnings,
    errors,
  }
}
