import assert from "node:assert/strict"
import test from "node:test"

import { archiveFixtures } from "../data/editorial/demo-fixtures.ts"
import { createArchiveRepository } from "../lib/archive/repository.ts"

const repository = createArchiveRepository(archiveFixtures)

test("archive repository combines text and canonical filters", () => {
  const results = repository.listEntries({
    text: "pending",
    evidenceKind: "ocr_unverified",
    topicId: "topic-ocr",
  })

  assert.deepEqual(
    results.map((entry) => entry.id),
    ["entry-demo-002"]
  )
})

test("archive repository resolves ordered relations without exposing writes", () => {
  const entry = repository.getEntry("entry-demo-001")
  assert.ok(entry)
  assert.deepEqual(
    repository.getEntities(entry.entityIds).map((entity) => entity.id),
    entry.entityIds
  )
  assert.equal("saveEntry" in repository, false)
  assert.equal("deleteEntry" in repository, false)
})

test("archive repository resolves pages and reports fixture summary", () => {
  assert.equal(repository.getPage("source-demo-manifest", 2)?.id, "page-demo-2")
  assert.deepEqual(
    repository
      .getEntriesForPage("source-demo-manifest", 3)
      .map((entry) => entry.id),
    ["entry-demo-003", "entry-demo-004"]
  )
  assert.deepEqual(repository.getSummary(), {
    entryCount: 4,
    sourceCount: 1,
    pageCount: 3,
    verifiedPages: 0,
    demoRecords: 4,
    citedEdges: 3,
    brokenRefs: 0,
  })
})
