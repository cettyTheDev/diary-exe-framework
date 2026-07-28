import { mkdtemp, readFile, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { markedFixtureTextAdapter } from "../lib/ingestion/adapters/marked-fixture-text.ts"
import {
  buildCorpusSearchIndex,
  createCorpusSearchRepository,
  verifyCorpusSearchIndex,
} from "../lib/archive/full-text-index.ts"
import { runPageExtraction } from "../lib/ingestion/extraction.ts"
import {
  appendLedgerEvent,
  readAndVerifyLedger,
} from "../lib/ingestion/ledger.ts"
import { normalizeFixturePages } from "../lib/ingestion/normalization.ts"
import { evaluateM2PipelineQuality } from "../lib/ingestion/pipeline-quality.ts"
import { evaluateEntityReviewQueue } from "../lib/ingestion/review.ts"
import { storeVaultObject } from "../lib/ingestion/vault.ts"

const projectRoot = process.cwd()
const fixtureRoot = path.join(projectRoot, "tests", "fixtures", "corpus")
const fixtureFile = path.join(fixtureRoot, "synthetic-corpus.txt")
const workspace = await mkdtemp(path.join(os.tmpdir(), "diary-exe-m2-"))
const runId = "run-m2-synthetic-corpus-v1"

try {
  const receipt = await storeVaultObject({
    inputFile: fixtureFile,
    allowedInputRoot: fixtureRoot,
    vaultRoot: path.join(workspace, "vault"),
    sourceId: "source-m2-synthetic-corpus",
    recordedAt: "2026-07-28T00:00:00Z",
    isFixture: true,
  })
  const ledgerRoot = path.join(workspace, "ledger")
  const ledgerFile = path.join(ledgerRoot, "events.jsonl")
  await appendLedgerEvent({
    ledgerFile,
    ledgerRoot,
    event: {
      schemaVersion: "1.0",
      eventId: "m2-fixture-extraction-started",
      occurredAt: "2026-07-28T00:00:01Z",
      runId,
      stage: "page_extraction",
      status: "started",
      detail: "Started the marked synthetic corpus extractor.",
    },
  })
  const extraction = await runPageExtraction({
    runId,
    receipt,
    contents: await readFile(fixtureFile),
    adapter: markedFixtureTextAdapter,
    authorization: { mode: "fixture" },
  })
  const normalization = normalizeFixturePages({
    runId,
    pages: extraction.pages,
  })
  const review = evaluateEntityReviewQueue({
    candidates: normalization.entityCandidates,
    decisions: [],
  })
  const searchIndex = buildCorpusSearchIndex({
    runId,
    entries: normalization.entries,
    authorization: { mode: "fixture" },
  })
  const searchRepository = createCorpusSearchRepository(searchIndex)
  const searchVerification = {
    valid: verifyCorpusSearchIndex(searchIndex),
    summary: searchRepository.getSummary(),
    syntheticCheckpointHits: searchRepository
      .search("synthetic checkpoint")
      .map((hit) => ({
        documentId: hit.document.id,
        score: hit.score,
        sourcePages: hit.document.sourcePages,
      })),
  }
  const quality = evaluateM2PipelineQuality({
    runId,
    extraction,
    normalization,
    review,
    searchIndex,
  })
  await appendLedgerEvent({
    ledgerFile,
    ledgerRoot,
    event: {
      schemaVersion: "1.0",
      eventId: "m2-fixture-extraction-completed",
      occurredAt: "2026-07-28T00:00:02Z",
      runId,
      stage: "page_extraction",
      status: extraction.status === "complete" ? "completed" : "failed",
      detail: `Produced ${extraction.pages.length} of ${extraction.totalPages} synthetic page records.`,
    },
  })
  const ledger = await readAndVerifyLedger(ledgerFile)

  process.stdout.write(
    `${JSON.stringify(
      {
        receipt,
        extraction,
        normalization,
        review,
        searchIndex,
        searchVerification,
        quality,
        ledger,
      },
      null,
      2
    )}\n`
  )
  if (
    extraction.status !== "complete" ||
    normalization.status === "failed" ||
    !review.valid ||
    !searchVerification.valid ||
    !quality.valid ||
    !ledger.valid
  ) {
    process.exitCode = 1
  }
} finally {
  await rm(workspace, { recursive: true, force: true })
}
