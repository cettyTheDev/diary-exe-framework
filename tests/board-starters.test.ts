import assert from "node:assert/strict"
import test from "node:test"

import { createBoardStarters } from "../lib/archive/board-starters.ts"
import type { ArchiveStoryArc } from "../lib/archive/repository.ts"

const arcs = ["alpha", "beta", "gamma", "empty"].map(
  (id) =>
    ({
      id,
      label: id,
      description: `${id} fixture`,
      isFixture: true,
    }) as ArchiveStoryArc
)
const entries = [
  { id: "e-alpha", storyArcIds: ["alpha"], citationIds: ["c1", "c2"] },
  { id: "e-beta-1", storyArcIds: ["beta"], citationIds: ["c3"] },
  { id: "e-beta-2", storyArcIds: ["beta"], citationIds: ["c4"] },
  { id: "e-gamma", storyArcIds: ["gamma"], citationIds: ["c5"] },
]
const relationships = [
  { id: "r1", citationIds: ["c1"] },
  { id: "r2", citationIds: ["c2"] },
  { id: "r3", citationIds: ["c3"] },
  { id: "r4", citationIds: ["c4"] },
  { id: "r5", citationIds: ["c5"] },
]

test("board starters rank cited arcs and preserve canonical tie order", () => {
  assert.deepEqual(createBoardStarters(entries, relationships, arcs), [
    { arc: arcs[0], edgeCount: 2, entryCount: 1 },
    { arc: arcs[1], edgeCount: 2, entryCount: 2 },
    { arc: arcs[2], edgeCount: 1, entryCount: 1 },
  ])
})

test("board starters exclude uncited arcs and validate the limit", () => {
  assert.equal(createBoardStarters(entries, relationships, arcs, 2).length, 2)
  assert.deepEqual(createBoardStarters(entries, relationships, arcs, 0), [])
  assert.throws(
    () => createBoardStarters(entries, relationships, arcs, -1),
    /non-negative integer/
  )
})
