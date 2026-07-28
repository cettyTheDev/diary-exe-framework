import assert from "node:assert/strict"
import test from "node:test"

import { archiveFixtures } from "../data/editorial/demo-fixtures.ts"
import { validateArchiveData } from "../lib/archive/integrity.ts"

test("fixture graph has complete citation and reference integrity", () => {
  assert.deepEqual(validateArchiveData(archiveFixtures), [])
})

test("fixture copy cannot masquerade as sourced diary quotation", () => {
  for (const entry of archiveFixtures.entries) {
    assert.equal(entry.isFixture, true)
    assert.equal(entry.exactText.startsWith("["), true)
    assert.notEqual(entry.evidenceKind, "diary_text")
  }
})

test("relationships are typed, cited, and visibly synthetic", () => {
  for (const relationship of archiveFixtures.relationships) {
    assert.equal(relationship.isFixture, true)
    assert.ok(relationship.citationIds.length > 0)
    assert.ok(relationship.type.length > 0)
  }
})
