import { validateArchiveData } from "./integrity.ts"
import type { ArchiveData } from "./types.ts"

export type ArchiveQualityMode = "fixture" | "production"

export type ArchiveQualityIssue = {
  code: string
  severity: "error" | "warning"
  message: string
  recordId?: string
}

export type ArchiveQualityReport = {
  schemaVersion: "1.0"
  mode: ArchiveQualityMode
  valid: boolean
  errors: readonly ArchiveQualityIssue[]
  warnings: readonly ArchiveQualityIssue[]
  metrics: {
    sources: number
    pages: number
    entries: number
    relationships: number
    citations: number
    fixtureRecords: number
    fixtureLeakage: number
    brokenReferences: number
    orphanPages: number
    listedPageCoverage: number
    entryCitationCoverage: number
    relationshipCitationCoverage: number
    unlabeledOcrPages: number
  }
}

function ratio(numerator: number, denominator: number) {
  return denominator === 0 ? 1 : numerator / denominator
}

export function generateArchiveQualityReport(
  data: ArchiveData,
  mode: ArchiveQualityMode
): ArchiveQualityReport {
  const integrityErrors = validateArchiveData(data)
  const errors: ArchiveQualityIssue[] = integrityErrors.map((message) => ({
    code: "BROKEN_REFERENCE_OR_SCHEMA",
    severity: "error",
    message,
  }))
  const warnings: ArchiveQualityIssue[] = []
  const recordCollections = [
    data.sources,
    data.pages,
    data.entries,
    data.entities,
    data.relationships,
    data.citations,
    data.topics,
    data.storyArcs,
  ]
  const fixtureRecords = recordCollections.reduce(
    (count, collection) =>
      count + collection.filter((record) => record.isFixture).length,
    0
  )

  if (mode === "production") {
    for (const collection of recordCollections) {
      for (const record of collection) {
        if (record.isFixture) {
          errors.push({
            code: "FIXTURE_LEAKAGE",
            severity: "error",
            message: `Fixture record ${record.id} is not allowed in production mode.`,
            recordId: record.id,
          })
        }
      }
    }
    for (const source of data.sources) {
      if (!source.checksum || !/^[a-f0-9]{64}$/.test(source.checksum)) {
        errors.push({
          code: "PRODUCTION_CHECKSUM_REQUIRED",
          severity: "error",
          message: `Production source ${source.id} requires a SHA-256 checksum.`,
          recordId: source.id,
        })
      }
    }
  } else if (fixtureRecords === 0) {
    warnings.push({
      code: "FIXTURE_MODE_WITHOUT_FIXTURES",
      severity: "warning",
      message: "Fixture-mode quality report contains no fixture records.",
    })
  }

  for (const entry of data.entries) {
    if (
      !entry.title.trim() ||
      !entry.context.trim() ||
      !entry.exactText.trim()
    ) {
      errors.push({
        code: "ENTRY_REQUIRED_TEXT_MISSING",
        severity: "error",
        message: `Entry ${entry.id} is missing required display text.`,
        recordId: entry.id,
      })
    }
    if (
      entry.isFixture &&
      (entry.evidenceKind === "diary_text" ||
        !entry.exactText.startsWith("[") ||
        !entry.exactText.endsWith("]"))
    ) {
      errors.push({
        code: "FIXTURE_QUOTATION_LEAKAGE",
        severity: "error",
        message: `Fixture entry ${entry.id} could be mistaken for sourced diary text.`,
        recordId: entry.id,
      })
    }
    if (entry.date === null && entry.datePrecision !== "unknown") {
      errors.push({
        code: "DATE_PRECISION_MISMATCH",
        severity: "error",
        message: `Undated entry ${entry.id} must use unknown date precision.`,
        recordId: entry.id,
      })
    }
  }

  const listedPageIds = new Set(
    data.sources.flatMap((source) => source.pageIds)
  )
  const orphanPages = data.pages.filter((page) => !listedPageIds.has(page.id))
  const unlabeledOcrPages = data.pages.filter(
    (page) => page.extractionKind === "ocr" && page.confidence === null
  )
  const entriesWithCitations = data.entries.filter(
    (entry) => entry.citationIds.length > 0
  ).length
  const relationshipsWithCitations = data.relationships.filter(
    (relationship) => relationship.citationIds.length > 0
  ).length
  const metrics = {
    sources: data.sources.length,
    pages: data.pages.length,
    entries: data.entries.length,
    relationships: data.relationships.length,
    citations: data.citations.length,
    fixtureRecords,
    fixtureLeakage: mode === "production" ? fixtureRecords : 0,
    brokenReferences: integrityErrors.length,
    orphanPages: orphanPages.length,
    listedPageCoverage: ratio(
      data.pages.length - orphanPages.length,
      data.pages.length
    ),
    entryCitationCoverage: ratio(entriesWithCitations, data.entries.length),
    relationshipCitationCoverage: ratio(
      relationshipsWithCitations,
      data.relationships.length
    ),
    unlabeledOcrPages: unlabeledOcrPages.length,
  }

  return {
    schemaVersion: "1.0",
    mode,
    valid: errors.length === 0,
    errors,
    warnings,
    metrics,
  }
}
