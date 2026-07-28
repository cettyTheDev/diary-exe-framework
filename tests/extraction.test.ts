import assert from "node:assert/strict"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import { markedFixtureTextAdapter } from "../lib/ingestion/adapters/marked-fixture-text.ts"
import {
  type PageExtractionAdapter,
  runPageExtraction,
} from "../lib/ingestion/extraction.ts"
import { storeVaultObject } from "../lib/ingestion/vault.ts"

const projectRoot = process.cwd()
const fixtureRoot = path.join(projectRoot, "tests", "fixtures", "corpus")
const fixtureFile = path.join(fixtureRoot, "synthetic-corpus.txt")

async function withFixtureReceipt<T>(
  callback: (context: {
    receipt: Awaited<ReturnType<typeof storeVaultObject>>
    contents: Buffer
  }) => Promise<T>
) {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "diary-extract-test-"))
  try {
    const receipt = await storeVaultObject({
      inputFile: fixtureFile,
      allowedInputRoot: fixtureRoot,
      vaultRoot: path.join(workspace, "vault"),
      sourceId: "source-m2-synthetic-corpus",
      recordedAt: "2026-07-28T00:00:00Z",
      isFixture: true,
    })
    return await callback({ receipt, contents: await readFile(fixtureFile) })
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
}

test("marked fixture adapter emits page text and OCR confidence", async () => {
  await withFixtureReceipt(async ({ receipt, contents }) => {
    const result = await runPageExtraction({
      runId: "run-extract-complete",
      receipt,
      contents,
      adapter: markedFixtureTextAdapter,
      authorization: { mode: "fixture" },
    })

    assert.equal(result.status, "complete")
    assert.equal(result.pages.length, 3)
    assert.deepEqual(
      result.pages.map((page) => [
        page.pageNumber,
        page.method,
        page.confidence,
      ]),
      [
        [1, "source_text", 1],
        [2, "ocr", 0.72],
        [3, "source_text", 1],
      ]
    )
    assert.equal(
      result.pages.every((page) => page.isFixture),
      true
    )
    assert.match(result.pages[0]?.rawText ?? "", /No real event or quotation/)
  })
})

test("extraction resumes after a deterministic page failure", async () => {
  await withFixtureReceipt(async ({ receipt, contents }) => {
    const failingAdapter: PageExtractionAdapter = {
      ...markedFixtureTextAdapter,
      async extractPage(page) {
        if (page.pageNumber === 2) throw new Error("Synthetic page failure.")
        return markedFixtureTextAdapter.extractPage(page)
      },
    }
    const failed = await runPageExtraction({
      runId: "run-extract-failed",
      receipt,
      contents,
      adapter: failingAdapter,
      authorization: { mode: "fixture" },
    })
    const resumed = await runPageExtraction({
      runId: "run-extract-resumed",
      receipt,
      contents,
      adapter: markedFixtureTextAdapter,
      authorization: { mode: "fixture" },
      resumePages: failed.pages,
    })

    assert.equal(failed.status, "failed")
    assert.equal(failed.failedPage, 2)
    assert.equal(failed.pages.length, 1)
    assert.equal(resumed.status, "complete")
    assert.equal(resumed.reusedPages, 1)
    assert.equal(resumed.pages.length, 3)
    assert.deepEqual(resumed.pages[0], failed.pages[0])
  })
})

test("production and checksum gates fail closed", async () => {
  await withFixtureReceipt(async ({ receipt, contents }) => {
    await assert.rejects(
      runPageExtraction({
        runId: "run-production-refused",
        receipt,
        contents,
        adapter: markedFixtureTextAdapter,
        authorization: {
          mode: "production",
          gate: {
            schemaVersion: "1.0",
            candidateId: "candidate-test",
            approvalId: null,
            readyForAcquisition: false,
            readyForExtraction: false,
            readyForQuotation: false,
            readyForPageDisplay: false,
            checks: [],
            permissions: [],
          },
        },
      }),
      /ready production gate/
    )
    const tampered = Buffer.from(contents)
    tampered[0] = tampered[0] === 65 ? 66 : 65
    await assert.rejects(
      runPageExtraction({
        runId: "run-checksum-refused",
        receipt,
        contents: tampered,
        adapter: markedFixtureTextAdapter,
        authorization: { mode: "fixture" },
      }),
      /does not match the vault receipt checksum/
    )
  })
})
