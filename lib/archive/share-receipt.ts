import type {
  ArchiveCitation,
  ArchiveEntity,
  ArchiveEntry,
  ArchiveSource,
  ArchiveStoryArc,
  ArchiveTopic,
} from "./repository.ts"
import { evidenceLabels } from "./types.ts"

export type ShareReceiptModel = {
  schemaVersion: "1.0"
  id: string
  entryId: string
  title: string
  excerpt: string
  context: string
  dateLabel: string
  datePrecision: ArchiveEntry["datePrecision"]
  evidenceLabel: string
  entities: readonly string[]
  topics: readonly string[]
  storyArc: string
  source: {
    title: string
    fileName: string
    version: string
    pageLabel: string
    checksumLabel: string
    citationStateLabel: string
  }
  watermark: "FIXTURE — NOT SOURCE EVIDENCE" | "SOURCE-LINKED RECEIPT"
  isFixture: boolean
}

function formatReceiptDate(entry: ArchiveEntry) {
  if (!entry.date) return "DATE UNRESOLVED"

  const date = new Date(`${entry.date}T00:00:00Z`)
  if (entry.datePrecision === "month") {
    const month = new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    })
      .format(date)
      .toUpperCase()
    return `${month} / MONTH PRECISION`
  }

  const label = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(date)
    .toUpperCase()

  return entry.datePrecision === "range" ? `${label} / RANGE PRECISION` : label
}

function assertFixtureBoundary(input: {
  entry: ArchiveEntry
  source: ArchiveSource
  citations: readonly ArchiveCitation[]
  entities: readonly ArchiveEntity[]
  topics: readonly ArchiveTopic[]
  storyArc?: ArchiveStoryArc
}) {
  const records = [
    input.entry,
    input.source,
    ...input.citations,
    ...input.entities,
    ...input.topics,
    ...(input.storyArc ? [input.storyArc] : []),
  ]
  if (records.some((record) => record.isFixture !== input.entry.isFixture)) {
    throw new Error(
      "Share receipt refuses mixed fixture and production records."
    )
  }
}

function assertSourceLinks(input: {
  entry: ArchiveEntry
  source: ArchiveSource
  citations: readonly ArchiveCitation[]
}) {
  if (input.source.id !== input.entry.sourceId) {
    throw new Error("Share receipt source does not match the entry source.")
  }
  if (!input.citations.length) {
    throw new Error("Share receipt requires at least one citation.")
  }
  if (
    input.citations.some(
      (citation) =>
        citation.sourceId !== input.entry.sourceId ||
        !citation.pageNumbers.some((page) =>
          input.entry.sourcePages.includes(page)
        )
    )
  ) {
    throw new Error(
      "Share receipt citation does not cover an entry source page."
    )
  }
}

function assertProductionReady(input: {
  entry: ArchiveEntry
  source: ArchiveSource
  citations: readonly ArchiveCitation[]
}) {
  if (input.entry.isFixture) return
  if (
    !input.source.checksum ||
    !/^[a-f0-9]{64}$/i.test(input.source.checksum)
  ) {
    throw new Error("Production share receipt requires a source SHA-256.")
  }
  if (input.source.status !== "verified") {
    throw new Error("Production share receipt requires a verified source.")
  }
  if (input.citations.some((citation) => citation.state !== "verified")) {
    throw new Error("Production share receipt requires verified citations.")
  }
  if (
    input.entry.evidenceKind === "unresolved" ||
    input.entry.evidenceKind === "third_party_claim"
  ) {
    throw new Error(
      "Production share receipt refuses unresolved or third-party evidence."
    )
  }
}

export function createShareReceiptModel(input: {
  entry: ArchiveEntry
  source: ArchiveSource
  citations: readonly ArchiveCitation[]
  entities: readonly ArchiveEntity[]
  topics: readonly ArchiveTopic[]
  storyArc?: ArchiveStoryArc
}): ShareReceiptModel {
  assertFixtureBoundary(input)
  assertSourceLinks(input)
  assertProductionReady(input)

  if (!input.entry.exactText.trim() || !input.entry.context.trim()) {
    throw new Error("Share receipt requires excerpt and context text.")
  }

  const citationStates = [
    ...new Set(input.citations.map((citation) => citation.state.toUpperCase())),
  ].sort()

  return {
    schemaVersion: "1.0",
    id: `share-receipt-${input.entry.id}-v1`,
    entryId: input.entry.id,
    title: input.entry.title,
    excerpt: input.entry.exactText,
    context: input.entry.context,
    dateLabel: formatReceiptDate(input.entry),
    datePrecision: input.entry.datePrecision,
    evidenceLabel: evidenceLabels[input.entry.evidenceKind],
    entities: input.entities.map((entity) => entity.label),
    topics: input.topics.map((topic) => topic.label),
    storyArc: input.storyArc?.label ?? "UNASSIGNED",
    source: {
      title: input.source.title,
      fileName: input.source.fileName,
      version: input.source.version,
      pageLabel: `${input.entry.isFixture ? "DEMO " : ""}${input.entry.sourcePages
        .map((page) => `PAGE ${page}`)
        .join(" / ")}`,
      checksumLabel: input.source.checksum ?? "NOT COMPUTED",
      citationStateLabel: citationStates.join(" / "),
    },
    watermark: input.entry.isFixture
      ? "FIXTURE — NOT SOURCE EVIDENCE"
      : "SOURCE-LINKED RECEIPT",
    isFixture: input.entry.isFixture,
  }
}

export function getShareReceiptFileName(model: ShareReceiptModel) {
  const safeEntryId = model.entryId.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase()
  return `diary-exe-receipt-${safeEntryId}.png`
}
