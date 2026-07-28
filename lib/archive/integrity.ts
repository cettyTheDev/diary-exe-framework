import { evidenceLabels, type ArchiveData } from "./types.ts"

function duplicateIds(items: { id: string }[]) {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  for (const item of items) {
    if (seen.has(item.id)) duplicates.add(item.id)
    seen.add(item.id)
  }

  return [...duplicates]
}

export function validateArchiveData(data: ArchiveData): string[] {
  const errors: string[] = []
  const collections = [
    data.entries,
    data.sources,
    data.pages,
    data.entities,
    data.relationships,
    data.citations,
    data.topics,
    data.storyArcs,
  ]
  const allIds = collections.flatMap((collection) =>
    collection.map((item) => item.id)
  )

  for (const id of duplicateIds(allIds.map((id) => ({ id })))) {
    errors.push(`Duplicate canonical id: ${id}`)
  }

  const sourceIds = new Set(data.sources.map((source) => source.id))
  const pageIndex = new Map(data.pages.map((page) => [page.id, page]))
  const pageKeys = new Set(
    data.pages.map((page) => `${page.sourceId}:${page.pageNumber}`)
  )
  const citationIds = new Set(data.citations.map((citation) => citation.id))
  const citationIndex = new Map(
    data.citations.map((citation) => [citation.id, citation])
  )
  const entityIds = new Set(data.entities.map((entity) => entity.id))
  const topicIds = new Set(data.topics.map((topic) => topic.id))
  const storyArcIds = new Set(data.storyArcs.map((arc) => arc.id))

  for (const key of duplicateIds(
    data.pages.map((page) => ({
      id: `${page.sourceId}:${page.pageNumber}`,
    }))
  )) {
    errors.push(`Duplicate source page key: ${key}`)
  }

  for (const source of data.sources) {
    for (const pageId of source.pageIds) {
      const page = pageIndex.get(pageId)
      if (!page) {
        errors.push(`Source ${source.id} references missing page id ${pageId}`)
      } else if (page.sourceId !== source.id) {
        errors.push(
          `Source ${source.id} references page ${pageId} from another source`
        )
      }
    }

    for (const page of data.pages.filter(
      (item) => item.sourceId === source.id
    )) {
      if (!source.pageIds.includes(page.id)) {
        errors.push(`Source ${source.id} does not list page id ${page.id}`)
      }
    }
  }

  for (const page of data.pages) {
    if (!sourceIds.has(page.sourceId)) {
      errors.push(`Page ${page.id} references missing source ${page.sourceId}`)
    }
    if (!Number.isInteger(page.pageNumber) || page.pageNumber < 1) {
      errors.push(`Page ${page.id} has invalid page number ${page.pageNumber}`)
    }
    if (
      page.confidence !== null &&
      (page.confidence < 0 || page.confidence > 1)
    ) {
      errors.push(`Page ${page.id} has invalid confidence ${page.confidence}`)
    }
    if (page.extractionKind === "ocr" && page.confidence === null) {
      errors.push(`OCR page ${page.id} has no confidence`)
    }
  }

  for (const citation of data.citations) {
    if (!sourceIds.has(citation.sourceId)) {
      errors.push(
        `Citation ${citation.id} references missing source ${citation.sourceId}`
      )
    }
    for (const page of citation.pageNumbers) {
      if (!pageKeys.has(`${citation.sourceId}:${page}`)) {
        errors.push(`Citation ${citation.id} references missing page ${page}`)
      }
    }
  }

  for (const entry of data.entries) {
    if (!(entry.evidenceKind in evidenceLabels))
      errors.push(`Entry ${entry.id} has no evidence kind`)
    if (!sourceIds.has(entry.sourceId)) {
      errors.push(
        `Entry ${entry.id} references missing source ${entry.sourceId}`
      )
    }
    for (const page of entry.sourcePages) {
      if (!pageKeys.has(`${entry.sourceId}:${page}`)) {
        errors.push(`Entry ${entry.id} references missing source page ${page}`)
      }
    }
    if (entry.sourcePages.length === 0) {
      errors.push(`Entry ${entry.id} has no source pages`)
    }
    if (entry.citationIds.length === 0) {
      errors.push(`Entry ${entry.id} has no citations`)
    }
    for (const id of entry.citationIds) {
      if (!citationIds.has(id)) {
        errors.push(`Entry ${entry.id} missing citation ${id}`)
        continue
      }
      const citation = citationIndex.get(id)
      if (citation?.sourceId !== entry.sourceId) {
        errors.push(`Entry ${entry.id} citation ${id} uses another source`)
      } else if (
        !citation.pageNumbers.some((page) => entry.sourcePages.includes(page))
      ) {
        errors.push(
          `Entry ${entry.id} citation ${id} does not overlap its pages`
        )
      }
    }
    for (const id of entry.entityIds) {
      if (!entityIds.has(id))
        errors.push(`Entry ${entry.id} missing entity ${id}`)
    }
    for (const id of entry.topicIds) {
      if (!topicIds.has(id))
        errors.push(`Entry ${entry.id} missing topic ${id}`)
    }
    for (const id of entry.storyArcIds) {
      if (!storyArcIds.has(id))
        errors.push(`Entry ${entry.id} missing arc ${id}`)
    }
  }

  for (const relationship of data.relationships) {
    if (!entityIds.has(relationship.sourceEntityId)) {
      errors.push(`Relationship ${relationship.id} has missing source entity`)
    }
    if (!entityIds.has(relationship.targetEntityId)) {
      errors.push(`Relationship ${relationship.id} has missing target entity`)
    }
    if (relationship.citationIds.length === 0) {
      errors.push(`Relationship ${relationship.id} has no citations`)
    }
    for (const id of relationship.citationIds) {
      if (!citationIds.has(id)) {
        errors.push(`Relationship ${relationship.id} missing citation ${id}`)
      }
    }
  }

  return errors
}
