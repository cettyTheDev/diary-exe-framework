import assert from "node:assert/strict"
import test from "node:test"

import { archiveFixtures } from "../data/editorial/demo-fixtures.ts"
import { createArchiveRepository } from "../lib/archive/repository.ts"
import {
  createShareReceiptModel,
  getShareReceiptFileName,
} from "../lib/archive/share-receipt.ts"

const repository = createArchiveRepository(archiveFixtures)

function getModelInput(entryId: string) {
  const entry = repository.getEntry(entryId)!
  return {
    entry,
    source: repository.getSource(entry.sourceId)!,
    citations: repository.getCitations(entry.citationIds),
    entities: repository.getEntities(entry.entityIds),
    topics: repository.getTopics(entry.topicIds),
    storyArc: repository.getStoryArcs(entry.storyArcIds)[0],
  }
}

test("fixture share receipts embed evidence, date, source, and permanent watermark", () => {
  const first = createShareReceiptModel(getModelInput("entry-demo-001"))
  const month = createShareReceiptModel(getModelInput("entry-demo-003"))

  assert.deepEqual(
    {
      date: first.dateLabel,
      evidence: first.evidenceLabel,
      page: first.source.pageLabel,
      checksum: first.source.checksumLabel,
      citation: first.source.citationStateLabel,
      watermark: first.watermark,
      fixture: first.isFixture,
    },
    {
      date: "JAN 02, 2020",
      evidence: "UNRESOLVED",
      page: "DEMO PAGE 1",
      checksum: "NOT COMPUTED",
      citation: "DEMO",
      watermark: "FIXTURE — NOT SOURCE EVIDENCE",
      fixture: true,
    }
  )
  assert.equal(month.dateLabel, "MAR 2020 / MONTH PRECISION")
  assert.equal(
    getShareReceiptFileName(first),
    "diary-exe-receipt-entry-demo-001.png"
  )
})

test("share receipt refuses mixed fixture and production records", () => {
  const input = getModelInput("entry-demo-001")
  assert.throws(
    () =>
      createShareReceiptModel({
        ...input,
        source: { ...input.source, isFixture: false },
      }),
    /mixed fixture and production/
  )
})

test("production share receipt fails closed until source and citations verify", () => {
  const fixture = getModelInput("entry-demo-002")
  const production = {
    entry: {
      ...fixture.entry,
      evidenceKind: "diary_text" as const,
      isFixture: false,
    },
    source: {
      ...fixture.source,
      checksum: null,
      status: "unresolved" as const,
      isFixture: false,
    },
    citations: fixture.citations.map((citation) => ({
      ...citation,
      state: "unresolved" as const,
      isFixture: false,
    })),
    entities: fixture.entities.map((entity) => ({
      ...entity,
      isFixture: false,
    })),
    topics: fixture.topics.map((topic) => ({ ...topic, isFixture: false })),
    storyArc: fixture.storyArc
      ? { ...fixture.storyArc, isFixture: false }
      : undefined,
  }

  assert.throws(() => createShareReceiptModel(production), /source SHA-256/)

  const verified = createShareReceiptModel({
    ...production,
    source: {
      ...production.source,
      checksum: "a".repeat(64),
      status: "verified",
    },
    citations: production.citations.map((citation) => ({
      ...citation,
      state: "verified" as const,
    })),
  })
  assert.equal(verified.isFixture, false)
  assert.equal(verified.watermark, "SOURCE-LINKED RECEIPT")
})
