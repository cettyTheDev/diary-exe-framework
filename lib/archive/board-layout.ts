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
  trunks: BoardTrunkLayout[]
}

export type BoardClusterLayout = {
  id: string
  label: string
  path: string
  labelX: number
  labelY: number
  labelAnchor: "start" | "middle" | "end"
  nodeCount: number
  anchorX: number
  anchorY: number
}

export type BoardTrunkLayout = {
  id: string
  path: string
}

const round = (value: number) => Math.round(value * 10) / 10
const CLUSTER_HUB = { x: 430, y: 370 } as const
const CLUSTER_ANCHORS = [
  { x: 705, y: 215 },
  { x: 245, y: 600 },
  { x: 235, y: 145 },
  { x: 805, y: 625 },
  { x: 145, y: 390 },
  { x: 875, y: 430 },
  { x: 480, y: 625 },
  { x: 870, y: 130 },
] as const
const SCATTER_PATTERNS: Record<number, readonly { x: number; y: number }[]> = {
  1: [{ x: 0, y: 0 }],
  2: [
    { x: -62, y: -15 },
    { x: 62, y: 18 },
  ],
  3: [
    { x: -85, y: -40 },
    { x: 75, y: -55 },
    { x: 5, y: 55 },
  ],
  4: [
    { x: -75, y: -50 },
    { x: 75, y: -65 },
    { x: -55, y: 60 },
    { x: 85, y: 50 },
  ],
  5: [
    { x: -115, y: -50 },
    { x: 20, y: -80 },
    { x: 125, y: -15 },
    { x: -55, y: 65 },
    { x: 75, y: 75 },
  ],
  6: [
    { x: -125, y: -60 },
    { x: 5, y: -85 },
    { x: 130, y: -40 },
    { x: -100, y: 60 },
    { x: 30, y: 45 },
    { x: 130, y: 75 },
  ],
  7: [
    { x: -130, y: -65 },
    { x: 0, y: -95 },
    { x: 130, y: -55 },
    { x: -145, y: 40 },
    { x: -10, y: 20 },
    { x: 130, y: 45 },
    { x: 25, y: 115 },
  ],
  8: [
    { x: -130, y: -70 },
    { x: 0, y: -100 },
    { x: 135, y: -65 },
    { x: -150, y: 25 },
    { x: -15, y: 0 },
    { x: 135, y: 30 },
    { x: -75, y: 110 },
    { x: 70, y: 115 },
  ],
  9: [
    { x: -145, y: -90 },
    { x: -10, y: -108 },
    { x: 125, y: -72 },
    { x: -125, y: -12 },
    { x: 15, y: 8 },
    { x: 155, y: 18 },
    { x: -150, y: 92 },
    { x: -12, y: 104 },
    { x: 132, y: 112 },
  ],
}

function scatterOffset(index: number, total: number) {
  const pattern = SCATTER_PATTERNS[total]
  if (pattern) return pattern[index]!
  const columns = Math.ceil(Math.sqrt(total * 1.35))
  const rows = Math.ceil(total / columns)
  const column = index % columns
  const row = Math.floor(index / columns)
  return {
    x: (column - (columns - 1) / 2) * 105 + (row % 2) * 18,
    y: (row - (rows - 1) / 2) * 78,
  }
}

function convexHull(points: { x: number; y: number }[]) {
  const sorted = [...points].sort((left, right) => left.x - right.x || left.y - right.y)
  const cross = (
    origin: { x: number; y: number },
    left: { x: number; y: number },
    right: { x: number; y: number }
  ) =>
    (left.x - origin.x) * (right.y - origin.y) -
    (left.y - origin.y) * (right.x - origin.x)
  const half = (items: { x: number; y: number }[]) => {
    const result: { x: number; y: number }[] = []
    for (const point of items) {
      while (
        result.length >= 2 &&
        cross(result.at(-2)!, result.at(-1)!, point) <= 0
      ) {
        result.pop()
      }
      result.push(point)
    }
    return result
  }
  const lower = half(sorted)
  const upper = half([...sorted].reverse())
  return [...lower.slice(0, -1), ...upper.slice(0, -1)]
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
  if (entities.length === 0) {
    return { nodes: [], edges: [], clusters: [], trunks: [] }
  }

  const degrees = new Map(entities.map((entity) => [entity.id, 0]))
  for (const relationship of relationships) {
    degrees.set(
      relationship.sourceEntityId,
      (degrees.get(relationship.sourceEntityId) ?? 0) + 1
    )
    degrees.set(
      relationship.targetEntityId,
      (degrees.get(relationship.targetEntityId) ?? 0) + 1
    )
  }

  const ordered = [...entities].sort(
    (left, right) =>
      (degrees.get(right.id) ?? 0) - (degrees.get(left.id) ?? 0) ||
      left.id.localeCompare(right.id)
  )
  const center = ordered[0]!
  const orbitCandidates = ordered.slice(1)
  const orbitIds = new Set(orbitCandidates.map((entity) => entity.id))
  const neighbors = new Map(
    orbitCandidates.map((entity) => [entity.id, new Set<string>()])
  )
  for (const relationship of relationships) {
    if (
      orbitIds.has(relationship.sourceEntityId) &&
      orbitIds.has(relationship.targetEntityId)
    ) {
      neighbors
        .get(relationship.sourceEntityId)
        ?.add(relationship.targetEntityId)
      neighbors
        .get(relationship.targetEntityId)
        ?.add(relationship.sourceEntityId)
    }
  }
  const entityById = new Map(
    orbitCandidates.map((entity) => [entity.id, entity])
  )
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
  const clusterGroups = clusters.flatMap((cluster) => {
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
    return members.length > 0 ? [{ cluster, members }] : []
  })
  const ungroupedOrbit = orbit.filter(
    (entity) => !assignedEntityIds.has(entity.id)
  )
  const positionedOrbit = [
    ...clusterGroups.flatMap(({ cluster, members }) =>
      members.map((entity) => ({ entity, clusterId: cluster.id }))
    ),
    ...ungroupedOrbit.map((entity) => ({ entity, clusterId: null })),
  ]
  const clusterMode = clusterGroups.length >= 2 && positionedOrbit.length >= 3
  const anchorByCluster = new Map(
    clusterGroups.map(({ cluster }, index) => {
      const fallbackColumn = index % 3
      const fallbackRow = Math.floor(index / 3)
      return [
        cluster.id,
        CLUSTER_ANCHORS[index] ?? {
          x: 160 + fallbackColumn * 330 + (fallbackRow % 2) * 55,
          y: 115 + fallbackRow * 205,
        },
      ] as const
    })
  )
  const memberIndex = new Map(
    clusterGroups.flatMap(({ cluster, members }) =>
      members.map(
        (entity, index) =>
          [
            entity.id,
            { index, total: members.length, clusterId: cluster.id },
          ] as const
      )
    )
  )
  const hub = clusterMode
    ? CLUSTER_HUB
    : { x: BOARD_VIEWBOX.width / 2, y: BOARD_VIEWBOX.height / 2 }
  const nodes: BoardNodeLayout[] = [
    {
      id: center.id,
      x: hub.x,
      y: hub.y,
      rotation: -0.4,
      degree: degrees.get(center.id) ?? 0,
      clusterId: null,
    },
    ...positionedOrbit.map(({ entity, clusterId }, index) => {
      const membership = memberIndex.get(entity.id)
      const anchor = membership
        ? anchorByCluster.get(membership.clusterId)
        : undefined
      const offset = membership
        ? scatterOffset(membership.index, membership.total)
        : undefined
      const angle =
        -Math.PI / 2 + (Math.PI * 2 * index) / positionedOrbit.length
      const position =
        clusterMode && anchor && offset
          ? {
              x: Math.min(920, Math.max(80, anchor.x + offset.x)),
              y: Math.min(695, Math.max(65, anchor.y + offset.y)),
            }
          : positionedOrbit.length >= 15
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
        clusterId,
      }
    }),
  ]
  const clusterLayouts = clusterMode
    ? clusterGroups.flatMap(({ cluster }): BoardClusterLayout[] => {
        const members = nodes.filter((node) => node.clusterId === cluster.id)
        if (members.length === 0) return []
        const expanded = members.flatMap((node, nodeIndex) =>
          Array.from({ length: 8 }, (_, pointIndex) => {
            const angle = (Math.PI * 2 * pointIndex) / 8
            const wobble = 1 + (((nodeIndex + pointIndex) % 3) - 1) * 0.08
            return {
              x: node.x + Math.cos(angle) * 76 * wobble,
              y: node.y + Math.sin(angle) * 58 * wobble,
            }
          })
        )
        const hull = convexHull(expanded)
        const minX = Math.min(...hull.map((point) => point.x))
        const maxX = Math.max(...hull.map((point) => point.x))
        const minY = Math.min(...hull.map((point) => point.y))
        const centroidX =
          members.reduce((sum, member) => sum + member.x, 0) / members.length
        const centroidY =
          members.reduce((sum, member) => sum + member.y, 0) / members.length
        const towardHubX = hub.x - centroidX
        const towardHubY = hub.y - centroidY
        const distanceToHub = Math.hypot(towardHubX, towardHubY) || 1
        const towardHubUnitX = towardHubX / distanceToHub
        const towardHubUnitY = towardHubY / distanceToHub
        const nearestMemberProjection = Math.max(
          ...members.map(
            (member) =>
              (member.x - centroidX) * towardHubUnitX +
              (member.y - centroidY) * towardHubUnitY
          )
        )
        const portShift = Math.min(225, nearestMemberProjection + 82)
        const anchorX = centroidX + towardHubUnitX * portShift
        const anchorY = centroidY + towardHubUnitY * portShift
        const labelOnRight = centroidX > 610
        return [
          {
            id: cluster.id,
            label: cluster.label,
            path: smoothClosedPath(hull),
            labelX: round(labelOnRight ? maxX - 12 : minX + 12),
            labelY: round(Math.max(24, minY + 18)),
            labelAnchor: labelOnRight ? "end" : "start",
            nodeCount: members.length,
            anchorX: round(anchorX),
            anchorY: round(anchorY),
          },
        ]
      })
    : []
  const clusterLayoutById = new Map(
    clusterLayouts.map((cluster) => [cluster.id, cluster])
  )
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const pairTotals = new Map<string, number>()
  const pairIndexes = new Map<string, number>()

  for (const relationship of relationships) {
    const key = [relationship.sourceEntityId, relationship.targetEntityId]
      .sort()
      .join("::")
    pairTotals.set(key, (pairTotals.get(key) ?? 0) + 1)
  }

  const edges = relationships.flatMap(
    (relationship, relationshipOrder): BoardEdgeLayout[] => {
    const source = nodeById.get(relationship.sourceEntityId)
    const target = nodeById.get(relationship.targetEntityId)
    if (!source || !target) return []
    const key = [relationship.sourceEntityId, relationship.targetEntityId]
      .sort()
      .join("::")
    const index = pairIndexes.get(key) ?? 0
    pairIndexes.set(key, index + 1)
    const total = pairTotals.get(key) ?? 1
    const sourceIsHub = source.id === center.id
    const targetIsHub = target.id === center.id
    const peripheral = sourceIsHub ? target : targetIsHub ? source : undefined
    const branchAnchor = peripheral?.clusterId
      ? clusterLayoutById.get(peripheral.clusterId)
      : undefined
    const start = branchAnchor
      ? { x: branchAnchor.anchorX, y: branchAnchor.anchorY }
      : source
    const end = branchAnchor ? peripheral! : target
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.hypot(dx, dy) || 1
    const curve =
      (branchAnchor ? 18 : 34) + (index - (total - 1) / 2) * 48
    const controlX = (start.x + end.x) / 2 - (dy / length) * curve
    const controlY = (start.y + end.y) / 2 + (dx / length) * curve
    const labelT = branchAnchor
      ? Math.min(
          0.75,
          Math.max(0.12, 1 - 84 / length) +
            ((relationshipOrder % 3) - 1) * 0.035
        )
      : 0.5
    const inverseLabelT = 1 - labelT
    const labelX =
      inverseLabelT ** 2 * start.x +
      2 * inverseLabelT * labelT * controlX +
      labelT ** 2 * end.x
    const labelY =
      inverseLabelT ** 2 * start.y +
      2 * inverseLabelT * labelT * controlY +
      labelT ** 2 * end.y

    return [
      {
        id: relationship.id,
        path: `M ${round(start.x)} ${round(start.y)} Q ${round(controlX)} ${round(controlY)} ${round(end.x)} ${round(end.y)}`,
        labelX: round(labelX),
        labelY: round(labelY),
      },
    ]
    }
  )
  const connectedClusterIds = new Set(
    relationships.flatMap((relationship) => {
      const source = nodeById.get(relationship.sourceEntityId)
      const target = nodeById.get(relationship.targetEntityId)
      if (!source || !target) return []
      if (source.id === center.id && target.clusterId) return [target.clusterId]
      if (target.id === center.id && source.clusterId) return [source.clusterId]
      return []
    })
  )
  const trunks = clusterLayouts.flatMap((cluster, index): BoardTrunkLayout[] => {
    if (!connectedClusterIds.has(cluster.id)) return []
    const gateway =
      cluster.anchorY > hub.y + 135
        ? { x: hub.x + 48, y: hub.y + 126 }
        : cluster.anchorX < hub.x - 70
          ? { x: hub.x - 112, y: hub.y + 8 }
          : { x: hub.x + 118, y: hub.y - 12 }
    const firstControl = {
      x: (hub.x + gateway.x) / 2,
      y: (hub.y + gateway.y) / 2 + ((index % 2) * 2 - 1) * 8,
    }
    const secondControl = {
      x: (gateway.x + cluster.anchorX) / 2 + ((index % 3) - 1) * 18,
      y: (gateway.y + cluster.anchorY) / 2,
    }
    return [
      {
        id: cluster.id,
        path: `M ${round(hub.x)} ${round(hub.y)} Q ${round(firstControl.x)} ${round(firstControl.y)} ${round(gateway.x)} ${round(gateway.y)} Q ${round(secondControl.x)} ${round(secondControl.y)} ${cluster.anchorX} ${cluster.anchorY}`,
      },
    ]
  })

  return { nodes, edges, clusters: clusterLayouts, trunks }
}
