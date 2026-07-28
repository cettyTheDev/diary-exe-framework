import { validateArchiveData } from "./integrity.ts"
import type {
  ArchiveData,
  Citation,
  Entity,
  Entry,
  EvidenceKind,
  Relationship,
  SourceDocument,
  SourcePage,
  StoryArc,
  Topic,
} from "./types.ts"

export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T

export type ArchiveEntry = DeepReadonly<Entry>
export type ArchiveSource = DeepReadonly<SourceDocument>
export type ArchivePage = DeepReadonly<SourcePage>
export type ArchiveEntity = DeepReadonly<Entity>
export type ArchiveRelationship = DeepReadonly<Relationship>
export type ArchiveCitation = DeepReadonly<Citation>
export type ArchiveTopic = DeepReadonly<Topic>
export type ArchiveStoryArc = DeepReadonly<StoryArc>

export type EntryQuery = {
  text?: string
  evidenceKind?: EvidenceKind
  entityId?: string
  topicId?: string
  storyArcId?: string
  featured?: boolean
}

export type EntityQuery = {
  kinds?: readonly Entity["kind"][]
}

export type ArchiveSummary = {
  entryCount: number
  sourceCount: number
  pageCount: number
  verifiedPages: number
  demoRecords: number
  citedEdges: number
  brokenRefs: number
}

export interface ArchiveRepository {
  listEntries(query?: EntryQuery): readonly ArchiveEntry[]
  getEntry(id: string): ArchiveEntry | undefined
  listSources(): readonly ArchiveSource[]
  getSource(id: string): ArchiveSource | undefined
  listPages(sourceId?: string): readonly ArchivePage[]
  getPage(sourceId: string, pageNumber: number): ArchivePage | undefined
  getEntriesForPage(
    sourceId: string,
    pageNumber: number
  ): readonly ArchiveEntry[]
  listEntities(query?: EntityQuery): readonly ArchiveEntity[]
  getEntity(id: string): ArchiveEntity | undefined
  getEntities(ids: readonly string[]): readonly ArchiveEntity[]
  listRelationships(): readonly ArchiveRelationship[]
  getRelationship(id: string): ArchiveRelationship | undefined
  listCitations(): readonly ArchiveCitation[]
  getCitation(id: string): ArchiveCitation | undefined
  getCitations(ids: readonly string[]): readonly ArchiveCitation[]
  listTopics(): readonly ArchiveTopic[]
  getTopic(id: string): ArchiveTopic | undefined
  getTopics(ids: readonly string[]): readonly ArchiveTopic[]
  listStoryArcs(): readonly ArchiveStoryArc[]
  getStoryArc(id: string): ArchiveStoryArc | undefined
  getStoryArcs(ids: readonly string[]): readonly ArchiveStoryArc[]
  getSummary(): ArchiveSummary
}

function getMany<RecordType>(
  ids: readonly string[],
  index: ReadonlyMap<string, RecordType>
) {
  return ids.flatMap((id) => {
    const item = index.get(id)
    return item ? [item] : []
  })
}

export function createArchiveRepository(data: ArchiveData): ArchiveRepository {
  const entries = [...data.entries]
  const sources = [...data.sources]
  const pages = [...data.pages]
  const entities = [...data.entities]
  const relationships = [...data.relationships]
  const citations = [...data.citations]
  const topics = [...data.topics]
  const storyArcs = [...data.storyArcs]

  const entryIndex = new Map(entries.map((item) => [item.id, item]))
  const sourceIndex = new Map(sources.map((item) => [item.id, item]))
  const entityIndex = new Map(entities.map((item) => [item.id, item]))
  const relationshipIndex = new Map(
    relationships.map((item) => [item.id, item])
  )
  const citationIndex = new Map(citations.map((item) => [item.id, item]))
  const topicIndex = new Map(topics.map((item) => [item.id, item]))
  const storyArcIndex = new Map(storyArcs.map((item) => [item.id, item]))
  const brokenRefs = validateArchiveData(data).length

  return {
    listEntries(query = {}) {
      const normalizedText = query.text?.trim().toLowerCase()

      return entries.filter((entry) => {
        const searchBlob =
          `${entry.title} ${entry.exactText} ${entry.context}`.toLowerCase()
        return (
          (!normalizedText || searchBlob.includes(normalizedText)) &&
          (!query.evidenceKind || entry.evidenceKind === query.evidenceKind) &&
          (!query.entityId || entry.entityIds.includes(query.entityId)) &&
          (!query.topicId || entry.topicIds.includes(query.topicId)) &&
          (!query.storyArcId || entry.storyArcIds.includes(query.storyArcId)) &&
          (query.featured === undefined || entry.featured === query.featured)
        )
      })
    },
    getEntry(id) {
      return entryIndex.get(id)
    },
    listSources() {
      return sources
    },
    getSource(id) {
      return sourceIndex.get(id)
    },
    listPages(sourceId) {
      return pages
        .filter((page) => !sourceId || page.sourceId === sourceId)
        .sort((left, right) => left.pageNumber - right.pageNumber)
    },
    getPage(sourceId, pageNumber) {
      return pages.find(
        (page) => page.sourceId === sourceId && page.pageNumber === pageNumber
      )
    },
    getEntriesForPage(sourceId, pageNumber) {
      return entries.filter(
        (entry) =>
          entry.sourceId === sourceId && entry.sourcePages.includes(pageNumber)
      )
    },
    listEntities(query = {}) {
      return entities.filter(
        (entity) => !query.kinds || query.kinds.includes(entity.kind)
      )
    },
    getEntity(id) {
      return entityIndex.get(id)
    },
    getEntities(ids) {
      return getMany(ids, entityIndex)
    },
    listRelationships() {
      return relationships
    },
    getRelationship(id) {
      return relationshipIndex.get(id)
    },
    listCitations() {
      return citations
    },
    getCitation(id) {
      return citationIndex.get(id)
    },
    getCitations(ids) {
      return getMany(ids, citationIndex)
    },
    listTopics() {
      return topics
    },
    getTopic(id) {
      return topicIndex.get(id)
    },
    getTopics(ids) {
      return getMany(ids, topicIndex)
    },
    listStoryArcs() {
      return storyArcs
    },
    getStoryArc(id) {
      return storyArcIndex.get(id)
    },
    getStoryArcs(ids) {
      return getMany(ids, storyArcIndex)
    },
    getSummary() {
      return {
        entryCount: entries.length,
        sourceCount: sources.length,
        pageCount: pages.length,
        verifiedPages: pages.filter(
          (page) => page.extractionKind === "source_text"
        ).length,
        demoRecords: entries.filter((entry) => entry.isFixture).length,
        citedEdges: relationships.filter(
          (relationship) => relationship.citationIds.length > 0
        ).length,
        brokenRefs,
      }
    },
  }
}
