import assert from "node:assert/strict"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import {
  buildCorpusSearchIndex,
  createCorpusSearchRepository,
  verifyCorpusSearchIndex,
} from "../lib/archive/full-text-index.ts"
import { m2FixtureObservability } from "../data/intake/m2-observability.ts"
import { markedFixtureTextAdapter } from "../lib/ingestion/adapters/marked-fixture-text.ts"
import { runPageExtraction } from "../lib/ingestion/extraction.ts"
import { normalizeFixturePages } from "../lib/ingestion/normalization.ts"
import { evaluateM2PipelineQuality } from "../lib/ingestion/pipeline-quality.ts"
import { evaluateEntityReviewQueue } from "../lib/ingestion/review.ts"
import { storeVaultObject } from "../lib/ingestion/vault.ts"

const projectRoot = process.cwd()
const fixtureRoot = path.join(projectRoot, "tests", "fixtures", "corpus")
const fixtureFile = path.join(fixtureRoot, "synthetic-corpus.txt")

async function withNormalizedFixture<T>(
  callback: (result: ReturnType<typeof normalizeFixturePages>) => Promise<T> | T
) {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "diary-index-test-"))
  try {
    const receipt = await storeVaultObject({
      inputFile: fixtureFile,
      allowedInputRoot: fixtureRoot,
      vaultRoot: path.join(workspace, "vault"),
      sourceId: "source-m2-synthetic-corpus",
      recordedAt: "2026-07-28T00:00:00Z",
      isFixture: true,
    })
    const extraction = await runPageExtraction({
      runId: "run-index-test",
      receipt,
      contents: await readFile(fixtureFile),
      adapter: markedFixtureTextAdapter,
      authorization: { mode: "fixture" },
    })
    return await callback(
      normalizeFixturePages({
        runId: extraction.runId,
        pages: extraction.pages,
      })
    )
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
}

test("fixture full-text index is deterministic and independently verifiable", async () => {
  await withNormalizedFixture((normalization) => {
    const first = buildCorpusSearchIndex({
      runId: m2FixtureObservability.runId,
      entries: normalization.entries,
      authorization: { mode: "fixture" },
    })
    const second = buildCorpusSearchIndex({
      runId: m2FixtureObservability.runId,
      entries: [...normalization.entries].reverse(),
      authorization: { mode: "fixture" },
    })

    assert.deepEqual(second, first)
    assert.equal(verifyCorpusSearchIndex(first), true)
    assert.equal(first.indexSha256, m2FixtureObservability.indexSha256)
    assert.equal(first.documents.length, 3)
    assert.equal(
      first.documents.length,
      m2FixtureObservability.metrics.normalizedEntries
    )
    assert.equal(
      Object.keys(first.postings).length,
      m2FixtureObservability.metrics.indexTerms
    )
    assert.equal(
      first.documents.some((document) =>
        /ENTITY:/.test(document.normalizedText)
      ),
      false
    )
  })
})

test("read-only search adapter returns ranked source-linked documents", async () => {
  await withNormalizedFixture((normalization) => {
    const index = buildCorpusSearchIndex({
      runId: normalization.runId,
      entries: normalization.entries,
      authorization: { mode: "fixture" },
    })
    const repository = createCorpusSearchRepository(index)
    const hits = repository.search("synthetic checkpoint")

    assert.equal(hits.length, 3)
    assert.deepEqual(
      hits.map((hit) => hit.document.sourcePages[0]),
      [1, 2, 3]
    )
    assert.equal(repository.search("quotation").length, 1)
    assert.equal(repository.search("").length, 0)
    assert.equal("save" in repository, false)
    assert.equal("delete" in repository, false)
    assert.deepEqual(repository.getSummary(), {
      indexId: index.indexId,
      indexSha256: index.indexSha256,
      documents: 3,
      terms: Object.keys(index.postings).length,
      postings: Object.values(index.postings).reduce(
        (total, records) => total + records.length,
        0
      ),
      isFixture: true,
    })
  })
})

test("indexing and repository integrity gates fail closed", async () => {
  await withNormalizedFixture((normalization) => {
    assert.throws(
      () =>
        buildCorpusSearchIndex({
          runId: normalization.runId,
          entries: [
            {
              ...normalization.entries[0],
              isFixture: false,
            },
          ],
          authorization: { mode: "fixture" },
        }),
      /refuses non-fixture/
    )
    assert.throws(
      () =>
        buildCorpusSearchIndex({
          runId: normalization.runId,
          entries: normalization.entries,
          authorization: {
            mode: "production",
            review: {
              valid: false,
              readyForPublicUse: false,
              metrics: { candidates: 0, accepted: 0, rejected: 0, pending: 0 },
              errors: ["not ready"],
            },
          },
        }),
      /refuses fixture entries/
    )
    assert.throws(
      () =>
        buildCorpusSearchIndex({
          runId: normalization.runId,
          entries: [
            {
              ...normalization.entries[0],
              normalizedText: "tampered derivative",
            },
          ],
          authorization: { mode: "fixture" },
        }),
      /normalized-text checksum does not match/
    )

    const validIndex = buildCorpusSearchIndex({
      runId: normalization.runId,
      entries: normalization.entries,
      authorization: { mode: "fixture" },
    })
    const tamperedIndex = {
      ...validIndex,
      documents: [
        { ...validIndex.documents[0], normalizedText: "tampered" },
        ...validIndex.documents.slice(1),
      ],
    }
    assert.equal(verifyCorpusSearchIndex(tamperedIndex), false)
    assert.throws(
      () => createCorpusSearchRepository(tamperedIndex),
      /checksum does not match/
    )
  })
})

test("M2 quality gate separates structural validity from publication readiness", async () => {
  await withNormalizedFixture((normalization) => {
    const searchIndex = buildCorpusSearchIndex({
      runId: normalization.runId,
      entries: normalization.entries,
      authorization: { mode: "fixture" },
    })
    const review = evaluateEntityReviewQueue({
      candidates: normalization.entityCandidates,
      decisions: [],
    })
    const extractionPages = normalization.entries.map((entry, index) => ({
      schemaVersion: "1.0" as const,
      id: `quality-page-${index + 1}`,
      sourceId: entry.sourceId,
      sourceFileId: entry.sourceFileId,
      pageNumber: entry.sourcePages[0],
      method: index === 1 ? ("ocr" as const) : ("source_text" as const),
      rawText: entry.rawText,
      inputPageSha256: entry.rawTextSha256,
      rawTextSha256: entry.rawTextSha256,
      confidence: index === 1 ? 0.72 : 1,
      verificationState: "unverified" as const,
      extractor: { id: "quality-fixture", version: "1.0.0" },
      isFixture: true,
    }))
    const extraction = {
      schemaVersion: "1.0" as const,
      runId: normalization.runId,
      status: "complete" as const,
      pages: extractionPages,
      totalPages: extractionPages.length,
      reusedPages: 0,
      failedPage: null,
      errors: [],
    }
    const report = evaluateM2PipelineQuality({
      runId: normalization.runId,
      extraction,
      normalization,
      review,
      searchIndex,
    })
    const tamperedReport = evaluateM2PipelineQuality({
      runId: normalization.runId,
      extraction,
      normalization,
      review,
      searchIndex: {
        ...searchIndex,
        documents: searchIndex.documents.slice(1),
      },
    })

    assert.equal(report.valid, true)
    assert.equal(report.readyForPublication, false)
    assert.equal(
      report.checks.slice(0, 3).filter((check) => check.status === "pass")
        .length,
      m2FixtureObservability.metrics.structuralQualityChecks
    )
    assert.deepEqual(
      report.checks.map((check) => [check.id, check.status]),
      [
        ["extraction_complete", "pass"],
        ["record_alignment", "pass"],
        ["index_integrity", "pass"],
        ["ocr_review", "warning"],
        ["entity_review", "blocked"],
        ["publication_boundary", "blocked"],
      ]
    )
    assert.equal(tamperedReport.valid, false)
    assert.equal(tamperedReport.readyForPublication, false)
  })
})
