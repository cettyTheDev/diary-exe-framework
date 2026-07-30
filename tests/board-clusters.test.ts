import assert from "node:assert/strict"
import test from "node:test"

import { createBoardClusters } from "../lib/archive/board-clusters.ts"
import type { Entry, Relationship, StoryArc } from "../lib/archive/types.ts"

const arcs: StoryArc[] = [
  { id: "arc-response", label: "Response", description: "Test response arc.", isFixture: true },
  { id: "arc-review", label: "Review", description: "Test review arc.", isFixture: true },
]

function entry(id: string, citationId: string, entityIds: string[], storyArcIds: string[]): Entry {
  return {
    id,
    date: null,
    datePrecision: "unknown",
    title: "Cluster test entry",
    exactText: "Synthetic cluster test text.",
    context: "Synthetic cluster test context.",
    evidenceKind: "unresolved",
    sourceId: "source-test",
    sourcePages: [1],
    citationIds: [citationId],
    entityIds,
    topicIds: [],
    storyArcIds,
    featured: false,
    isFixture: true,
  }
}

function relationship(id: string, citationId: string, sourceEntityId: string, targetEntityId: string): Relationship {
  return {
    id,
    sourceEntityId,
    targetEntityId,
    type: "discussed",
    citationIds: [citationId],
    note: "Synthetic cluster test edge.",
    isEditorial: false,
    isFixture: true,
  }
}

test("board clusters use citation-backed arc votes and deterministic tie order", () => {
  const entries = [
    entry("entry-response-one", "citation-one", ["entity-hub", "entity-alpha"], ["arc-response"]),
    entry("entry-response-two", "citation-two", ["entity-hub", "entity-alpha"], ["arc-response"]),
    entry("entry-review", "citation-three", ["entity-hub", "entity-bravo"], ["arc-review"]),
  ]
  const relationships = [
    relationship("relationship-one", "citation-one", "entity-hub", "entity-alpha"),
    relationship("relationship-two", "citation-two", "entity-hub", "entity-alpha"),
    relationship("relationship-three", "citation-three", "entity-hub", "entity-bravo"),
  ]

  assert.deepEqual(createBoardClusters(entries, relationships, arcs), [
    { id: "arc-response", label: "Response", entityIds: ["entity-alpha", "entity-hub"] },
    { id: "arc-review", label: "Review", entityIds: ["entity-bravo"] },
  ])
})

test("board clusters keep uncategorized cited entities in an explicit fallback", () => {
  const relationships = [
    relationship("relationship-unassigned", "citation-missing", "entity-alpha", "entity-bravo"),
  ]

  assert.deepEqual(createBoardClusters([], relationships, arcs), [
    {
      id: "board-cluster-other",
      label: "Other cited links",
      entityIds: ["entity-alpha", "entity-bravo"],
    },
  ])
})
