import assert from "node:assert/strict"
import path from "node:path"
import test from "node:test"

import { runFixtureIntakeDryRun } from "../lib/ingestion/fixture-dry-run.ts"

const projectRoot = process.cwd()
const fixtureRoot = path.join(projectRoot, "tests", "fixtures", "intake")
const fixtureFile = path.join(fixtureRoot, "safe-intake-fixture.txt")

test("fixture intake dry run is deterministic and stops before extraction", async () => {
  const first = await runFixtureIntakeDryRun(fixtureFile, fixtureRoot)
  const second = await runFixtureIntakeDryRun(fixtureFile, fixtureRoot)

  assert.deepEqual(first, second)
  assert.equal(first.validation.valid, true)
  assert.equal(first.manifest.isFixture, true)
  assert.equal(first.manifest.authority.kind, "fixture")
  assert.equal(first.manifest.useBoundary.status, "fixture_only")
  assert.equal(
    first.manifest.files[0]?.sha256,
    "61bbfd3674bc9229fde5e65eb24892d9c95035b94571d747904f24a0076ac741"
  )
  assert.deepEqual(
    first.manifest.pages.map((page) => page.pageNumber),
    [1, 2]
  )
  assert.equal(first.extractions.length, 0)
  assert.equal(first.run.stages.at(-1)?.status, "blocked")
})

test("fixture intake dry run refuses files outside the fixture root", async () => {
  await assert.rejects(
    runFixtureIntakeDryRun(path.join(projectRoot, "README.md"), fixtureRoot),
    /refused path outside fixture root/
  )
})
