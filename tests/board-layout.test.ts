import assert from "node:assert/strict"
import test from "node:test"

import { BOARD_VIEWBOX, createBoardLayout } from "../lib/archive/board-layout.ts"
import type { Entity, Relationship } from "../lib/archive/types.ts"

const entities: Entity[] = ["alpha", "bravo", "charlie", "delta"].map((id) => ({
  id: `entity-${id}`,
  label: id,
  kind: "person",
  description: "Layout test node.",
  isFixture: false,
}))
const relationships: Relationship[] = [
  ["relationship-alpha-bravo-one", "entity-alpha", "entity-bravo", "discussed"],
  ["relationship-alpha-bravo-two", "entity-alpha", "entity-bravo", "met"],
  ["relationship-alpha-charlie", "entity-alpha", "entity-charlie", "briefed"],
].map(([id, sourceEntityId, targetEntityId, type], index) => ({
  id,
  sourceEntityId,
  targetEntityId,
  type: type as Relationship["type"],
  citationIds: [`citation-test-${index}`],
  note: "Layout test edge.",
  isEditorial: false,
  isFixture: false,
}))

test("board layout centers the highest-degree node and keeps nodes in bounds", () => {
  const layout = createBoardLayout(entities, relationships)
  const center = layout.nodes.find((node) => node.id === "entity-alpha")
  assert.equal(center?.x, BOARD_VIEWBOX.width / 2)
  assert.equal(center?.y, BOARD_VIEWBOX.height / 2)
  assert.equal(center?.degree, 3)
  assert.equal(layout.nodes.every((node) =>
    node.x >= 0 && node.x <= BOARD_VIEWBOX.width &&
    node.y >= 0 && node.y <= BOARD_VIEWBOX.height
  ), true)
})

test("board layout is deterministic and separates repeated endpoint pairs", () => {
  const first = createBoardLayout(entities, relationships)
  assert.deepEqual(first, createBoardLayout(entities, relationships))
  assert.notEqual(first.edges[0]?.path, first.edges[1]?.path)
  assert.equal(first.edges.length, relationships.length)
})

test("board layout keeps secondary connected components adjacent on the orbit", () => {
  const componentEntities: Entity[] = ["hub", "alpha", "bravo", "remote"].map((id) => ({
    id: `entity-${id}`,
    label: id,
    kind: "person",
    description: "Layout component test node.",
    isFixture: false,
  }))
  const componentRelationships: Relationship[] = [
    ...["alpha", "bravo", "remote"].map((id, index): Relationship => ({
      id: `relationship-hub-${id}`,
      sourceEntityId: "entity-hub",
      targetEntityId: `entity-${id}`,
      type: "discussed",
      citationIds: [`citation-component-${index}`],
      note: "Layout component test edge.",
      isEditorial: false,
      isFixture: false,
    })),
    {
      id: "relationship-alpha-bravo-component",
      sourceEntityId: "entity-alpha",
      targetEntityId: "entity-bravo",
      type: "discussed",
      citationIds: ["citation-component-pair"],
      note: "Layout component test edge.",
      isEditorial: false,
      isFixture: false,
    },
  ]
  const orbitIds = createBoardLayout(componentEntities, componentRelationships)
    .nodes.slice(1).map((node) => node.id)
  assert.equal(Math.abs(orbitIds.indexOf("entity-alpha") - orbitIds.indexOf("entity-bravo")), 1)
})

test("board layout moves a dense graph onto a separated perimeter", () => {
  const denseEntities: Entity[] = Array.from({ length: 23 }, (_, index) => ({
    id: `entity-dense-${String(index).padStart(2, "0")}`,
    label: `dense ${index}`,
    kind: "person",
    description: "Dense layout test node.",
    isFixture: false,
  }))
  const denseRelationships: Relationship[] = denseEntities.slice(1).map((entity, index) => ({
    id: `relationship-dense-${String(index).padStart(2, "0")}`,
    sourceEntityId: denseEntities[0]!.id,
    targetEntityId: entity.id,
    type: "discussed",
    citationIds: [`citation-dense-${index}`],
    note: "Dense layout test edge.",
    isEditorial: false,
    isFixture: false,
  }))
  const orbit = createBoardLayout(denseEntities, denseRelationships).nodes.slice(1)
  assert.equal(orbit.length, 22)
  assert.equal(orbit.every((node) =>
    node.x === 85 || node.x === BOARD_VIEWBOX.width - 85 ||
    node.y === 70 || node.y === BOARD_VIEWBOX.height - 70
  ), true)
  assert.equal(orbit.every((node, index) => {
    const next = orbit[(index + 1) % orbit.length]!
    return Math.hypot(next.x - node.x, next.y - node.y) >= 100
  }), true)
})
