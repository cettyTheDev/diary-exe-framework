import type { Entity, Relationship } from "./types"
import type { BoardClusterInput } from "./board-clusters"

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
  clusterId: string | null
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
  clusters: BoardClusterLayout[]
}

export type BoardClusterLayout = {
  id: string
  label: string
  path: string
  labelX: number
  labelY: number
  labelAnchor: "start" | "middle" | "end"
  nodeCount: number
}

const round = (value: number) => Math.round(value * 10) / 10
const clampIslandLabelY = (value: number) =>
  Math.min(720, Math.max(26, value))

function placeIslandLabel(x: number, y: number) {
  if (x < 140) {
    return { x: 18, y: clampIslandLabelY(y), anchor: "start" as const }
  }
  if (x > 860) {
    return { x: 982, y: clampIslandLabelY(y), anchor: "end" as const }
  }
  return { x, y: clampIslandLabelY(y), anchor: "middle" as const }
}

function smoothClosedPath(points: { x: number; y: number }[]) {
  if (points.length < 3) return ""
  const midpoint = (
    left: { x: number; y: number },
    right: { x: number; y: number }
  ) => ({ x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 })
  const start = midpoint(points.at(-1)!, points[0]!)
  return [
    `M ${round(start.x)} ${round(start.y)}`,
    ...points.map((point, index) => {
      const next = points[(index + 1) % points.length]!
      const end = midpoint(point, next)
      return `Q ${round(point.x)} ${round(point.y)} ${round(end.x)} ${round(end.y)}`
    }),
    "Z",
  ].join(" ")
}

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
  relationships: readonly BoardRelationship[],
  clusters: readonly BoardClusterInput[] = []
): BoardLayout {
  if (entities.length === 0) return { nodes: [], edges: [], clusters: [] }

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
  const orbitIndex = new Map(orbit.map((entity, index) => [entity.id, index]))
  const assignedEntityIds = new Set<string>()
  const groupedOrbit = clusters.flatMap((cluster) => {
    const members = cluster.entityIds
      .filter((id) => orbitIds.has(id) && !assignedEntityIds.has(id))
      .map((id) => entityById.get(id))
      .filter((entity): entity is BoardEntity => Boolean(entity))
      .sort(
        (left, right) =>
          (orbitIndex.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
          (orbitIndex.get(right.id) ?? Number.MAX_SAFE_INTEGER)
      )
    members.forEach((entity) => assignedEntityIds.add(entity.id))
    return members.map((entity) => ({ entity, clusterId: cluster.id }))
  })
  const ungroupedOrbit = orbit
    .filter((entity) => !assignedEntityIds.has(entity.id))
    .map((entity) => ({ entity, clusterId: null }))
  const positionedOrbit = [...groupedOrbit, ...ungroupedOrbit]
  const clusterMode = clusters.length >= 2 && positionedOrbit.length >= 3
  const visibleClusterCount = clusters.filter((cluster) =>
    positionedOrbit.some((item) => item.clusterId === cluster.id)
  ).length
  const clusterGapUnits = 0.8
  const totalOrbitUnits =
    positionedOrbit.length + visibleClusterCount * clusterGapUnits
  let clusterCursor = 0
  let previousClusterId: string | null | undefined
  const nodes: BoardNodeLayout[] = [
    {
      id: center.id,
      x: BOARD_VIEWBOX.width / 2,
      y: BOARD_VIEWBOX.height / 2,
      rotation: -0.4,
      degree: degrees.get(center.id) ?? 0,
      clusterId: null,
    },
    ...positionedOrbit.map(({ entity, clusterId }, index) => {
      if (
        clusterMode &&
        previousClusterId !== undefined &&
        clusterId !== previousClusterId
      ) {
        clusterCursor += clusterGapUnits
      }
      const angle = clusterMode
        ? -Math.PI / 2 +
          (Math.PI * 2 * (clusterCursor + 0.5)) / totalOrbitUnits
        : -Math.PI / 2 +
          (Math.PI * 2 * index) / positionedOrbit.length
      const radialJitter = clusterMode ? ((index % 3) - 1) * 12 : 0
      const position = clusterMode
        ? {
            x:
              BOARD_VIEWBOX.width / 2 +
              Math.cos(angle) * (390 + radialJitter),
            y:
              BOARD_VIEWBOX.height / 2 +
              Math.sin(angle) * (292 + radialJitter * 0.55),
          }
        : positionedOrbit.length >= 15
          ? perimeterPosition(index, orbit.length)
          : {
              x: BOARD_VIEWBOX.width / 2 + Math.cos(angle) * 405,
              y: BOARD_VIEWBOX.height / 2 + Math.sin(angle) * 305,
            }
      clusterCursor += 1
      previousClusterId = clusterId
      return {
        id: entity.id,
        x: round(position.x),
        y: round(position.y),
        rotation: round(((index % 5) - 2) * 0.65),
        degree: degrees.get(entity.id) ?? 0,
        clusterId,
      }
    }),
  ]
  const clusterLayouts = clusterMode
    ? clusters.flatMap((cluster): BoardClusterLayout[] => {
        const members = nodes.filter((node) => node.clusterId === cluster.id)
        if (members.length === 0) return []
        const radial = members.map((node) => {
          const dx = node.x - BOARD_VIEWBOX.width / 2
          const dy = node.y - BOARD_VIEWBOX.height / 2
          const length = Math.hypot(dx, dy) || 1
          return { node, ux: dx / length, uy: dy / length }
        })
        if (members.length === 1) {
          const { node, ux, uy } = radial[0]!
          const label = placeIslandLabel(node.x + ux * 112, node.y + uy * 98)
          return [
            {
              id: cluster.id,
              label: cluster.label,
              path: `M ${round(node.x - 100)} ${round(node.y)} A 100 76 0 1 0 ${round(node.x + 100)} ${round(node.y)} A 100 76 0 1 0 ${round(node.x - 100)} ${round(node.y)} Z`,
              labelX: round(label.x),
              labelY: round(label.y),
              labelAnchor: label.anchor,
              nodeCount: 1,
            },
          ]
        }
        const outer = radial.map(({ node, ux, uy }) => ({
          x: node.x + ux * 62,
          y: node.y + uy * 54,
        }))
        const inner = radial
          .map(({ node, ux, uy }) => ({
            x: node.x - ux * 62,
            y: node.y - uy * 54,
          }))
          .reverse()
        const first = radial[0]!
        const last = radial.at(-1)!
        const firstTangent = { x: -first.uy, y: first.ux }
        const lastTangent = { x: -last.uy, y: last.ux }
        outer[0] = {
          x: outer[0]!.x - firstTangent.x * 52,
          y: outer[0]!.y - firstTangent.y * 52,
        }
        outer[outer.length - 1] = {
          x: outer.at(-1)!.x + lastTangent.x * 52,
          y: outer.at(-1)!.y + lastTangent.y * 52,
        }
        inner[0] = {
          x: inner[0]!.x + lastTangent.x * 52,
          y: inner[0]!.y + lastTangent.y * 52,
        }
        inner[inner.length - 1] = {
          x: inner.at(-1)!.x - firstTangent.x * 52,
          y: inner.at(-1)!.y - firstTangent.y * 52,
        }
        const labelAnchor = radial[Math.floor(radial.length / 2)]!
        const label = placeIslandLabel(
          labelAnchor.node.x + labelAnchor.ux * 112,
          labelAnchor.node.y + labelAnchor.uy * 98
        )
        return [
          {
            id: cluster.id,
            label: cluster.label,
            path: smoothClosedPath([...outer, ...inner]),
            labelX: round(label.x),
            labelY: round(label.y),
            labelAnchor: label.anchor,
            nodeCount: members.length,
          },
        ]
      })
    : []
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
  return { nodes, edges, clusters: clusterLayouts }
}
