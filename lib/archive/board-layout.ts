import type { Entity, Relationship } from "./types"

type BoardEntity = Pick<Entity, "id">
type BoardRelationship = Pick<
  Relationship,
  "id" | "sourceEntityId" | "targetEntityId"
>

export const BOARD_VIEWBOX = { width: 1000, height: 760 } as const

export type BoardNodeLayout = {
  id: string
  x: number
  y: number
  rotation: number
  degree: number
}

export type BoardEdgeLayout = {
  id: string
  path: string
  labelX: number
  labelY: number
}

export type BoardLayout = {
  nodes: BoardNodeLayout[]
  edges: BoardEdgeLayout[]
}

const round = (value: number) => Math.round(value * 10) / 10

function perimeterPosition(index: number, total: number) {
  const left = 85
  const right = BOARD_VIEWBOX.width - 85
  const top = 70
  const bottom = BOARD_VIEWBOX.height - 70
  const width = right - left
  const height = bottom - top
  const topCount = Math.ceil(total / 4)
  const bottomCount = topCount
  const sideCount = total - topCount - bottomCount
  const rightCount = Math.ceil(sideCount / 2)
  const leftCount = sideCount - rightCount

  if (index < topCount) {
    return { x: left + (width * (index + 1)) / (topCount + 1), y: top }
  }
  index -= topCount
  if (index < rightCount) {
    return { x: right, y: top + (height * (index + 1)) / (rightCount + 1) }
  }
  index -= rightCount
  if (index < bottomCount) {
    return { x: right - (width * (index + 1)) / (bottomCount + 1), y: bottom }
  }
  index -= bottomCount
  return { x: left, y: bottom - (height * (index + 1)) / (leftCount + 1) }
}

export function createBoardLayout(
  entities: readonly BoardEntity[],
  relationships: readonly BoardRelationship[]
): BoardLayout {
  if (entities.length === 0) return { nodes: [], edges: [] }

  const degrees = new Map(entities.map((entity) => [entity.id, 0]))
  for (const relationship of relationships) {
    degrees.set(relationship.sourceEntityId, (degrees.get(relationship.sourceEntityId) ?? 0) + 1)
    degrees.set(relationship.targetEntityId, (degrees.get(relationship.targetEntityId) ?? 0) + 1)
  }
  const ordered = [...entities].sort(
    (left, right) =>
      (degrees.get(right.id) ?? 0) - (degrees.get(left.id) ?? 0) ||
      left.id.localeCompare(right.id)
  )
  const center = ordered[0]!
  const orbitCandidates = ordered.slice(1)
  const orbitIds = new Set(orbitCandidates.map((entity) => entity.id))
  const neighbors = new Map(orbitCandidates.map((entity) => [entity.id, new Set<string>()]))
  for (const relationship of relationships) {
    if (orbitIds.has(relationship.sourceEntityId) && orbitIds.has(relationship.targetEntityId)) {
      neighbors.get(relationship.sourceEntityId)?.add(relationship.targetEntityId)
      neighbors.get(relationship.targetEntityId)?.add(relationship.sourceEntityId)
    }
  }
  const entityById = new Map(orbitCandidates.map((entity) => [entity.id, entity]))
  const visited = new Set<string>()
  const orbit = orbitCandidates.flatMap((candidate) => {
    if (visited.has(candidate.id)) return []
    const component: BoardEntity[] = []
    const queue = [candidate.id]
    while (queue.length > 0) {
      const id = queue.shift()!
      if (visited.has(id)) continue
      visited.add(id)
      const entity = entityById.get(id)
      if (entity) component.push(entity)
      queue.push(...[...(neighbors.get(id) ?? [])].sort())
    }
    return component.sort(
      (left, right) =>
        (degrees.get(right.id) ?? 0) - (degrees.get(left.id) ?? 0) ||
        left.id.localeCompare(right.id)
    )
  })
  const nodes: BoardNodeLayout[] = [
    {
      id: center.id,
      x: BOARD_VIEWBOX.width / 2,
      y: BOARD_VIEWBOX.height / 2,
      rotation: -0.4,
      degree: degrees.get(center.id) ?? 0,
    },
    ...orbit.map((entity, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / orbit.length
      const position = orbit.length >= 15
        ? perimeterPosition(index, orbit.length)
        : {
            x: BOARD_VIEWBOX.width / 2 + Math.cos(angle) * 405,
            y: BOARD_VIEWBOX.height / 2 + Math.sin(angle) * 305,
          }
      return {
        id: entity.id,
        x: round(position.x),
        y: round(position.y),
        rotation: round(((index % 5) - 2) * 0.65),
        degree: degrees.get(entity.id) ?? 0,
      }
    }),
  ]
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const pairTotals = new Map<string, number>()
  const pairIndexes = new Map<string, number>()
  for (const relationship of relationships) {
    const key = [relationship.sourceEntityId, relationship.targetEntityId].sort().join("::")
    pairTotals.set(key, (pairTotals.get(key) ?? 0) + 1)
  }
  const edges = relationships.flatMap((relationship): BoardEdgeLayout[] => {
    const source = nodeById.get(relationship.sourceEntityId)
    const target = nodeById.get(relationship.targetEntityId)
    if (!source || !target) return []
    const key = [relationship.sourceEntityId, relationship.targetEntityId].sort().join("::")
    const index = pairIndexes.get(key) ?? 0
    pairIndexes.set(key, index + 1)
    const total = pairTotals.get(key) ?? 1
    const dx = target.x - source.x
    const dy = target.y - source.y
    const length = Math.hypot(dx, dy) || 1
    const curve = 34 + (index - (total - 1) / 2) * 48
    const controlX = (source.x + target.x) / 2 - (dy / length) * curve
    const controlY = (source.y + target.y) / 2 + (dx / length) * curve
    const labelX = 0.25 * source.x + 0.5 * controlX + 0.25 * target.x
    const labelY = 0.25 * source.y + 0.5 * controlY + 0.25 * target.y
    return [{
      id: relationship.id,
      path: `M ${round(source.x)} ${round(source.y)} Q ${round(controlX)} ${round(controlY)} ${round(target.x)} ${round(target.y)}`,
      labelX: round(labelX),
      labelY: round(labelY),
    }]
  })
  return { nodes, edges }
}
