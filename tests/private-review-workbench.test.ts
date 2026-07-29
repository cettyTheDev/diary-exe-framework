import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { chmod, mkdtemp, readFile, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, test } from "node:test"

import {
  createPrivateReviewWorkbenchServer,
  decisionRevision,
  parsePrivateReviewArtifacts,
  renderPrivateReviewWorkbench,
  writePrivateDecisionArtifact,
  type PrivateReviewDecisionArtifact,
  type PrivateReviewQueueArtifact,
} from "../lib/ingestion/private-review-workbench.ts"

const servers: ReturnType<
  typeof createPrivateReviewWorkbenchServer
>["server"][] = []

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve())
        })
    )
  )
})

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function artifacts(
  rawText = 'Entry WORKBENCH_NONCE <img src=x onerror="alert(1)"> source text.'
) {
  const queue: PrivateReviewQueueArtifact = {
    schemaVersion: "1.0",
    mode: "private_review",
    runId: "m11-test-run",
    publicationReady: false,
    source: {
      id: "source-test",
      title: "Test source",
      fileName: "source.pdf",
      version: "test",
      sourceFileId: "source-file-test",
      sha256: "a".repeat(64),
      sourceUrl: "https://example.gov/source.pdf",
    },
    candidates: [
      {
        schemaVersion: "1.0",
        id: "candidate-test",
        extractionId: "extraction-test",
        sourceId: "source-test",
        sourceFileId: "source-file-test",
        pageNumber: 7,
        rawText,
        rawTextSha256: sha256(rawText),
        method: "source_text",
        confidence: 1,
        sensitivePatternFlags: [],
        readyForQuoteReview: true,
        isFixture: false,
      },
    ],
    report: {},
  }
  const decisions: PrivateReviewDecisionArtifact = {
    schemaVersion: "1.0",
    mode: "private_review_decisions",
    runId: queue.runId,
    instructions: ["Human review required."],
    decisions: [],
  }
  return { queue, decisions }
}

test("private workbench validates candidate integrity and escapes raw source text", () => {
  const { queue, decisions } = artifacts()
  const parsed = parsePrivateReviewArtifacts(queue, decisions)
  const html = renderPrivateReviewWorkbench({
    ...parsed,
    artifact: parsed.decisions,
    token: "test-token",
    nonce: "test-nonce",
    reviewer: "test reviewer",
  })

  assert.match(html, /PRIVATE REVIEW/)
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/)
  assert.doesNotMatch(html, /<img src=x/)
  assert.match(html, /Entry WORKBENCH_NONCE/)

  queue.candidates[0].rawText = "modified"
  assert.throws(
    () => parsePrivateReviewArtifacts(queue, decisions),
    /invalid or modified candidate/
  )
})

test("private workbench rejects stale writes and keeps decision files private", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "archive-review-"))
  const file = path.join(directory, "decisions.json")
  const { decisions } = artifacts()
  await writeFile(file, `${JSON.stringify(decisions, null, 2)}\n`, {
    mode: 0o600,
  })

  await assert.rejects(
    writePrivateDecisionArtifact(file, decisions, "0".repeat(64)),
    /changed after this page loaded/
  )
  await writePrivateDecisionArtifact(
    file,
    decisions,
    decisionRevision(decisions)
  )
  assert.equal((await stat(file)).mode & 0o777, 0o600)
})

test("localhost workbench requires its token and derives exact text server-side", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "archive-review-server-"))
  const queueFile = path.join(directory, "queue.json")
  const decisionsFile = path.join(directory, "decisions.json")
  const { queue, decisions } = artifacts(
    "First line. Verified diary sentence. Last line."
  )
  await writeFile(queueFile, `${JSON.stringify(queue, null, 2)}\n`, {
    mode: 0o400,
  })
  await writeFile(decisionsFile, `${JSON.stringify(decisions, null, 2)}\n`, {
    mode: 0o600,
  })
  await chmod(decisionsFile, 0o600)

  const workbench = createPrivateReviewWorkbenchServer({
    queueFile,
    decisionsFile,
    reviewer: "test reviewer",
    token: "known-test-token",
  })
  servers.push(workbench.server)
  await new Promise<void>((resolve) =>
    workbench.server.listen(0, "127.0.0.1", resolve)
  )
  const address = workbench.server.address()
  assert.ok(address && typeof address === "object")
  const origin = `http://127.0.0.1:${address.port}`

  const forbidden = await fetch(origin)
  assert.equal(forbidden.status, 403)
  const page = await fetch(`${origin}/?token=known-test-token`)
  assert.equal(page.status, 200)
  assert.equal(page.headers.get("cache-control"), "no-store")
  assert.match(
    page.headers.get("content-security-policy") ?? "",
    /frame-ancestors 'none'/
  )

  const quote = "Verified diary sentence."
  const quoteStart = queue.candidates[0].rawText.indexOf(quote)
  const form = new URLSearchParams({
    token: "known-test-token",
    revision: decisionRevision(decisions),
    action: "publish",
    candidateId: queue.candidates[0].id,
    quoteStart: String(quoteStart),
    quoteEnd: String(quoteStart + quote.length),
    exactText: "untrusted replacement",
    title: "Verified entry",
    context: "A neutral description of the source record.",
    date: "",
    datePrecision: "unknown",
    recordType: "diary_entry",
    evidenceKind: "diary_text",
    editorialPosture: "source_record",
    responseState: "not_applicable",
    privacyReview: "clear",
    privacyNote: "No personal identifiers appear in the selected range.",
    thirdPartyReview: "none",
    transcriptionVerified: "yes",
    sourceLinkVerified: "yes",
    note: "Checked against the rendered source page.",
  })
  const response = await fetch(`${origin}/decision`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: origin,
    },
    body: form,
    redirect: "manual",
  })
  assert.equal(response.status, 303)

  const saved = JSON.parse(
    await readFile(decisionsFile, "utf8")
  ) as PrivateReviewDecisionArtifact
  assert.equal(saved.decisions.length, 1)
  assert.equal(saved.decisions[0].disposition, "publish")
  if (saved.decisions[0].disposition === "publish") {
    assert.equal(saved.decisions[0].exactText, quote)
  }
  assert.equal((await stat(decisionsFile)).mode & 0o777, 0o600)

  const crossSite = await fetch(`${origin}/decision`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://attacker.invalid",
    },
    body: form,
    redirect: "manual",
  })
  assert.equal(crossSite.status, 403)

  const tooLarge = await fetch(`${origin}/decision`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: origin,
    },
    body: `token=known-test-token&padding=${"x".repeat(40_000)}`,
    redirect: "manual",
  })
  assert.equal(tooLarge.status, 413)
})
