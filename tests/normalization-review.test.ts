import assert from "node:assert/strict"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import { markedFixtureTextAdapter } from "../lib/ingestion/adapters/marked-fixture-text.ts"
import type { EntityReviewDecision } from "../lib/ingestion/contracts.ts"
import { runPageExtraction } from "../lib/ingestion/extraction.ts"
import { normalizeFixturePages } from "../lib/ingestion/normalization.ts"
import { evaluateEntityReviewQueue } from "../lib/ingestion/review.ts"
import { storeVaultObject } from "../lib/ingestion/vault.ts"

const projectRoot = process.cwd()
const fixtureRoot = path.join(projectRoot, "tests", "fixtures", "corpus")
const fixtureFile = path.join(fixtureRoot, "synthetic-corpus.txt")

async function buildNormalization() {
  const workspace = await mkdtemp(
    path.join(os.tmpdir(), "diary-normalize-test-")
  )
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
      runId: "run-normalization-test",
      receipt,
      contents: await readFile(fixtureFile),
      adapter: markedFixtureTextAdapter,
      authorization: { mode: "fixture" },
    })
    return normalizeFixturePages({
      runId: extraction.runId,
      pages: extraction.pages,
    })
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
}

test("fixture normalization preserves raw evidence and derives reviewable records", async () => {
  const result = await buildNormalization()

  assert.equal(result.status, "needs_review")
  assert.equal(result.entries.length, 3)
  assert.deepEqual(
    result.entries.map((entry) => [
      entry.date,
      entry.datePrecision,
      entry.dateConfidence,
      entry.evidenceKind,
    ]),
    [
      ["2020-01-02", "day", 1, "unresolved"],
      ["2020-02-01", "month", 0.9, "ocr_unverified"],
      [null, "unknown", 1, "unresolved"],
    ]
  )
  assert.match(result.entries[0]?.rawText ?? "", /ENTITY:/)
  assert.doesNotMatch(result.entries[0]?.normalizedText ?? "", /ENTITY:/)
  assert.match(result.warnings.join("\n"), /OCR confidence 0\.72/)
  assert.deepEqual(
    result.entityCandidates.map((candidate) => candidate.kind),
    ["person", "topic", "organization", "topic", "entry", "topic"]
  )
})

test("entity candidates remain pending until accountable decisions exist", async () => {
  const normalization = await buildNormalization()
  const report = evaluateEntityReviewQueue({
    candidates: normalization.entityCandidates,
    decisions: [],
  })

  assert.equal(report.valid, true)
  assert.equal(report.readyForPublicUse, false)
  assert.deepEqual(report.metrics, {
    candidates: 6,
    accepted: 0,
    rejected: 0,
    pending: 6,
  })
})

test("review rejects duplicate decisions and fixtures never become public", async () => {
  const normalization = await buildNormalization()
  const decisions: EntityReviewDecision[] = normalization.entityCandidates.map(
    (candidate, index) => ({
      schemaVersion: "1.0",
      decisionId: `fixture-decision-${index + 1}`,
      candidateId: candidate.id,
      decision: "accept",
      reviewer: "fixture-reviewer",
      reviewedAt: "2026-07-28T00:00:03Z",
      note: "Synthetic review decision for pipeline testing only.",
      isFixture: true,
    })
  )
  const allReviewed = evaluateEntityReviewQueue({
    candidates: normalization.entityCandidates,
    decisions,
  })
  const duplicate = evaluateEntityReviewQueue({
    candidates: normalization.entityCandidates,
    decisions: [...decisions, { ...decisions[0], decisionId: "duplicate" }],
  })
  const orphan = evaluateEntityReviewQueue({
    candidates: normalization.entityCandidates,
    decisions: [
      {
        ...decisions[0],
        decisionId: "orphan",
        candidateId: "missing-candidate",
      },
    ],
  })

  assert.equal(allReviewed.valid, true)
  assert.equal(allReviewed.metrics.pending, 0)
  assert.equal(allReviewed.readyForPublicUse, false)
  assert.equal(duplicate.valid, false)
  assert.match(duplicate.errors.join("\n"), /duplicate decisions/)
  assert.equal(orphan.valid, false)
  assert.match(orphan.errors.join("\n"), /unknown candidate/)
})
