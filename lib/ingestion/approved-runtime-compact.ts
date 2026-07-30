import type {
  ArchiveData,
  Entry,
  SourceDocument,
} from "../archive/types.ts"
import {
  parseApprovedArchiveArtifact,
  type ApprovedArchiveArtifact,
} from "./approved-archive-slice.ts"

const WITHHELD_PAGE_TEXT =
  "[FULL PAGE TEXT WITHHELD — APPROVED QUOTATIONS ONLY]"
const MAX_RUNTIME_RECORDS = 2_000

type CompactEntry = Omit<Entry, "normalizedText">
type CompactSource = Omit<SourceDocument, "pageIds">

export type CompactApprovedRuntimePackage = {
  schemaVersion: "1.0"
  mode: "approved_runtime_compact"
  artifact: Omit<ApprovedArchiveArtifact, "data">
  data: {
    source: CompactSource
    pageCoordinates: [id: string, pageNumber: number][]
    entries: CompactEntry[]
    citations: ArchiveData["citations"]
    entities: ArchiveData["entities"]
    relationships: ArchiveData["relationships"]
    topics: ArchiveData["topics"]
    storyArcs: ArchiveData["storyArcs"]
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeExactText(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function omitKey<T extends object, K extends keyof T>(value: T, key: K) {
  const copy = { ...value }
  delete copy[key]
  return copy as Omit<T, K>
}

export function createCompactApprovedRuntimePackage(
  artifactValue: unknown
): CompactApprovedRuntimePackage {
  const artifact = parseApprovedArchiveArtifact(artifactValue)
  if (artifact.data.sources.length !== 1) {
    throw new Error("Compact approved runtime requires exactly one source.")
  }
  const source = artifact.data.sources[0]
  if (
    artifact.data.pages.some(
      (page) =>
        page.sourceId !== source.id ||
        page.extractedText !== WITHHELD_PAGE_TEXT ||
        page.extractionKind !== "source_text" ||
        page.confidence !== 1 ||
        page.isFixture !== false
    )
  ) {
    throw new Error(
      "Compact approved runtime accepts only the verified withheld-page template."
    )
  }
  if (
    artifact.data.entries.some(
      (entry) =>
        entry.normalizedText !== normalizeExactText(entry.exactText)
    )
  ) {
    throw new Error(
      "Compact approved runtime requires deterministically normalized entries."
    )
  }

  const compactSource = omitKey(source, "pageIds")
  const entries = artifact.data.entries.map((entry) =>
    omitKey(entry, "normalizedText")
  )
  const artifactHeader = omitKey(artifact, "data")
  return {
    schemaVersion: "1.0",
    mode: "approved_runtime_compact",
    artifact: artifactHeader,
    data: {
      source: compactSource,
      pageCoordinates: artifact.data.pages.map((page) => [
        page.id,
        page.pageNumber,
      ]),
      entries,
      citations: artifact.data.citations,
      entities: artifact.data.entities,
      relationships: artifact.data.relationships,
      topics: artifact.data.topics,
      storyArcs: artifact.data.storyArcs,
    },
  }
}

export function expandCompactApprovedRuntimePackage(
  value: unknown
): ApprovedArchiveArtifact {
  if (
    !isRecord(value) ||
    value.schemaVersion !== "1.0" ||
    value.mode !== "approved_runtime_compact" ||
    !isRecord(value.artifact) ||
    !isRecord(value.data) ||
    !isRecord(value.data.source) ||
    !Array.isArray(value.data.pageCoordinates) ||
    value.data.pageCoordinates.length < 1 ||
    value.data.pageCoordinates.length > MAX_RUNTIME_RECORDS ||
    !Array.isArray(value.data.entries) ||
    value.data.entries.length < 1 ||
    value.data.entries.length > MAX_RUNTIME_RECORDS ||
    !Array.isArray(value.data.citations) ||
    value.data.citations.length > MAX_RUNTIME_RECORDS ||
    !Array.isArray(value.data.entities) ||
    value.data.entities.length > MAX_RUNTIME_RECORDS ||
    !Array.isArray(value.data.relationships) ||
    value.data.relationships.length > MAX_RUNTIME_RECORDS ||
    !Array.isArray(value.data.topics) ||
    value.data.topics.length > MAX_RUNTIME_RECORDS ||
    !Array.isArray(value.data.storyArcs) ||
    value.data.storyArcs.length > MAX_RUNTIME_RECORDS
  ) {
    throw new Error("Compact approved runtime package is invalid or unbounded.")
  }

  const sourceId = value.data.source.id
  if (typeof sourceId !== "string") {
    throw new Error("Compact approved runtime source identity is invalid.")
  }
  const compactSource = value.data.source
  const pages = value.data.pageCoordinates.map((coordinate) => {
    if (
      !Array.isArray(coordinate) ||
      coordinate.length !== 2 ||
      typeof coordinate[0] !== "string" ||
      !Number.isSafeInteger(coordinate[1]) ||
      coordinate[1] < 1
    ) {
      throw new Error("Compact approved runtime page coordinate is invalid.")
    }
    return {
      id: coordinate[0],
      sourceId,
      pageNumber: coordinate[1],
      extractedText: WITHHELD_PAGE_TEXT,
      extractionKind: "source_text" as const,
      confidence: 1,
      isFixture: false,
    }
  })
  const entries = value.data.entries.map((entry) => {
    if (!isRecord(entry) || typeof entry.exactText !== "string") {
      throw new Error("Compact approved runtime entry is invalid.")
    }
    return {
      id: entry.id,
      date: entry.date,
      datePrecision: entry.datePrecision,
      title: entry.title,
      exactText: entry.exactText,
      normalizedText: normalizeExactText(entry.exactText),
      context: entry.context,
      evidenceKind: entry.evidenceKind,
      sourceId: entry.sourceId,
      sourcePages: entry.sourcePages,
      citationIds: entry.citationIds,
      entityIds: entry.entityIds,
      topicIds: entry.topicIds,
      storyArcIds: entry.storyArcIds,
      featured: entry.featured,
      editorialPosture: entry.editorialPosture,
      responseState: entry.responseState,
      isFixture: entry.isFixture,
    }
  })

  return parseApprovedArchiveArtifact({
    ...value.artifact,
    data: {
      sources: [
        {
          id: compactSource.id,
          title: compactSource.title,
          fileName: compactSource.fileName,
          version: compactSource.version,
          checksum: compactSource.checksum,
          sourceUrl: compactSource.sourceUrl,
          status: compactSource.status,
          pageIds: pages.map((page) => page.id),
          isFixture: compactSource.isFixture,
        },
      ],
      pages,
      entries,
      citations: value.data.citations,
      entities: value.data.entities,
      relationships: value.data.relationships,
      topics: value.data.topics,
      storyArcs: value.data.storyArcs,
    },
  })
}
