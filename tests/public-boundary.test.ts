import assert from "node:assert/strict"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

import { exampleReleaseCandidate } from "../data/intake/source-candidates.ts"

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)

const privateDataDirectories = [
  "data/raw",
  "data/extracted",
  "data/normalized",
  "data/indexes",
  "data/editorial/review-queues",
] as const

test("public example candidate cannot identify or resolve a real source", () => {
  const urls = [
    exampleReleaseCandidate.releasePageUrl,
    exampleReleaseCandidate.assetUrl,
  ]

  assert.equal(exampleReleaseCandidate.isFixture, true)
  assert.equal(
    exampleReleaseCandidate.authorityAssessment.listing,
    "unresolved"
  )
  assert.equal(exampleReleaseCandidate.access.status, "unavailable")
  assert.equal(exampleReleaseCandidate.reportedPageCount.value, null)
  assert.equal(
    urls.every((value) => new URL(value).hostname.endsWith(".invalid")),
    true
  )
})

test("public data directories contain no production artifacts", async () => {
  for (const relativeDirectory of privateDataDirectories) {
    const entries = await readdir(path.join(repositoryRoot, relativeDirectory))
    assert.deepEqual(
      entries,
      [".gitkeep"],
      `${relativeDirectory} must stay empty`
    )
  }
})

test("public data files contain no non-placeholder network location", async () => {
  const pending = [path.join(repositoryRoot, "data")]
  const urls: string[] = []

  while (pending.length > 0) {
    const directory = pending.pop()
    assert.ok(directory)

    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        pending.push(absolutePath)
        continue
      }
      if (!/\.(?:ts|txt|json|md)$/u.test(entry.name)) continue

      const content = await readFile(absolutePath, "utf8")
      urls.push(...(content.match(/https?:\/\/[^\s"')]+/gu) ?? []))
    }
  }

  assert.equal(urls.length > 0, true, "the fixture should exercise URL fields")
  assert.equal(
    urls.every((value) => new URL(value).hostname.endsWith(".invalid")),
    true,
    `only reserved invalid domains are permitted in public data: ${urls.join(", ")}`
  )
})
