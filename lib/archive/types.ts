export type EvidenceKind =
  | "diary_text"
  | "ocr_unverified"
  | "editorial_note"
  | "third_party_claim"
  | "unresolved"

export type DatePrecision = "day" | "month" | "range" | "unknown"
export type CitationState = "verified" | "unresolved" | "demo"

export type Entry = {
  id: string
  date: string | null
  datePrecision: DatePrecision
  title: string
  exactText: string
  normalizedText?: string
  context: string
  evidenceKind: EvidenceKind
  sourceId: string
  sourcePages: number[]
  citationIds: string[]
  entityIds: string[]
  topicIds: string[]
  storyArcIds: string[]
  featured: boolean
  isFixture: boolean
}

export type SourceDocument = {
  id: string
  title: string
  fileName: string
  version: string
  checksum: string | null
  status: CitationState
  pageIds: string[]
  isFixture: boolean
}

export type SourcePage = {
  id: string
  sourceId: string
  pageNumber: number
  extractedText: string
  extractionKind: "source_text" | "ocr" | "none"
  confidence: number | null
  isFixture: boolean
}

export type Entity = {
  id: string
  label: string
  kind: "person" | "organization" | "event" | "topic" | "entry"
  description: string
  isFixture: boolean
}

export type RelationshipType =
  "mentioned" | "met" | "discussed" | "responded" | "editorial_link"

export type Relationship = {
  id: string
  sourceEntityId: string
  targetEntityId: string
  type: RelationshipType
  citationIds: string[]
  note: string
  isEditorial: boolean
  isFixture: boolean
}

export type Citation = {
  id: string
  sourceId: string
  pageNumbers: number[]
  label: string
  state: CitationState
  note: string
  isFixture: boolean
}

export type Topic = {
  id: string
  label: string
  description: string
  isFixture: boolean
}

export type StoryArc = {
  id: string
  label: string
  description: string
  isFixture: boolean
}

export type ArchiveData = {
  entries: Entry[]
  sources: SourceDocument[]
  pages: SourcePage[]
  entities: Entity[]
  relationships: Relationship[]
  citations: Citation[]
  topics: Topic[]
  storyArcs: StoryArc[]
}

export const evidenceLabels: Record<EvidenceKind, string> = {
  diary_text: "DIARY TEXT",
  ocr_unverified: "OCR / UNVERIFIED TRANSCRIPTION",
  editorial_note: "EDITORIAL NOTE",
  third_party_claim: "THIRD-PARTY CLAIM",
  unresolved: "UNRESOLVED",
}

export const relationshipLabels: Record<RelationshipType, string> = {
  mentioned: "mentioned",
  met: "met",
  discussed: "discussed",
  responded: "responded",
  editorial_link: "editorial link",
}
