type BoardEntry = {
  readonly citationIds: readonly string[]
  readonly entityIds: readonly string[]
  readonly storyArcIds: readonly string[]
}

type BoardRelationship = {
  readonly sourceEntityId: string
  readonly targetEntityId: string
  readonly citationIds: readonly string[]
}

type BoardStoryArc = {
  readonly id: string
  readonly label: string
}

export type BoardClusterInput = {
  id: string
  label: string
  entityIds: string[]
}

export function createBoardClusters(
  entries: readonly BoardEntry[],
  relationships: readonly BoardRelationship[],
  storyArcs: readonly BoardStoryArc[]
): BoardClusterInput[] {
  const arcOrder = new Map(storyArcs.map((arc, index) => [arc.id, index]))
  const arcById = new Map(storyArcs.map((arc) => [arc.id, arc]))
  const votes = new Map<string, Map<string, number>>()
  const relatedEntityIds = new Set<string>()

  function addVote(entityId: string, arcId: string) {
    const entityVotes = votes.get(entityId) ?? new Map<string, number>()
    entityVotes.set(arcId, (entityVotes.get(arcId) ?? 0) + 1)
    votes.set(entityId, entityVotes)
  }

  for (const relationship of relationships) {
    relatedEntityIds.add(relationship.sourceEntityId)
    relatedEntityIds.add(relationship.targetEntityId)
    const arcIds = new Set(
      entries
        .filter(
          (entry) =>
            entry.entityIds.includes(relationship.sourceEntityId) &&
            entry.entityIds.includes(relationship.targetEntityId) &&
            entry.citationIds.some((id) =>
              relationship.citationIds.includes(id)
            )
        )
        .flatMap((entry) => entry.storyArcIds)
        .filter((id) => arcById.has(id))
    )
    for (const arcId of arcIds) {
      addVote(relationship.sourceEntityId, arcId)
      addVote(relationship.targetEntityId, arcId)
    }
  }

  const assigned = new Map<string, string[]>()
  const unassigned: string[] = []
  for (const entityId of [...relatedEntityIds].sort()) {
    const entityVotes = [...(votes.get(entityId)?.entries() ?? [])].sort(
      ([leftId, leftVotes], [rightId, rightVotes]) =>
        rightVotes - leftVotes ||
        (arcOrder.get(leftId) ?? Number.MAX_SAFE_INTEGER) -
          (arcOrder.get(rightId) ?? Number.MAX_SAFE_INTEGER) ||
        leftId.localeCompare(rightId)
    )
    const primaryArcId = entityVotes[0]?.[0]
    if (!primaryArcId) {
      unassigned.push(entityId)
      continue
    }
    assigned.set(primaryArcId, [
      ...(assigned.get(primaryArcId) ?? []),
      entityId,
    ])
  }

  const clusters = storyArcs.flatMap((arc): BoardClusterInput[] => {
    const entityIds = assigned.get(arc.id) ?? []
    return entityIds.length > 0
      ? [{ id: arc.id, label: arc.label, entityIds }]
      : []
  })
  if (unassigned.length > 0) {
    clusters.push({
      id: "board-cluster-other",
      label: "Other cited links",
      entityIds: unassigned,
    })
  }
  return clusters
}
