import type {
  ArchiveEntry,
  ArchiveRelationship,
  ArchiveStoryArc,
} from "./repository.ts"

export type BoardStarter = {
  arc: ArchiveStoryArc
  edgeCount: number
  entryCount: number
}

type BoardStarterEntry = Pick<ArchiveEntry, "storyArcIds" | "citationIds">
type BoardStarterRelationship = Pick<ArchiveRelationship, "citationIds">

export function createBoardStarters(
  entries: readonly BoardStarterEntry[],
  relationships: readonly BoardStarterRelationship[],
  storyArcs: readonly ArchiveStoryArc[],
  limit = 3
): BoardStarter[] {
  if (!Number.isSafeInteger(limit) || limit < 0) {
    throw new Error("Board starter limit must be a non-negative integer.")
  }

  return storyArcs
    .map((arc, index) => {
      const arcEntries = entries.filter((entry) =>
        entry.storyArcIds.includes(arc.id)
      )
      const citationIds = new Set(
        arcEntries.flatMap((entry) => entry.citationIds)
      )
      const edgeCount = relationships.filter((relationship) =>
        relationship.citationIds.some((id) => citationIds.has(id))
      ).length

      return { arc, edgeCount, entryCount: arcEntries.length, index }
    })
    .filter((item) => item.edgeCount > 0)
    .sort((left, right) =>
      right.edgeCount === left.edgeCount
        ? left.index - right.index
        : right.edgeCount - left.edgeCount
    )
    .slice(0, limit)
    .map(({ arc, edgeCount, entryCount }) => ({
      arc,
      edgeCount,
      entryCount,
    }))
}
