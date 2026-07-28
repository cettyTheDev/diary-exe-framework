import path from "node:path"
import { fileURLToPath } from "node:url"

import { runFixtureIntakeDryRun } from "../lib/ingestion/fixture-dry-run.ts"

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const fixtureRoot = path.join(projectRoot, "tests", "fixtures", "intake")
const fixtureFile = path.join(fixtureRoot, "safe-intake-fixture.txt")
const result = await runFixtureIntakeDryRun(fixtureFile, fixtureRoot)

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
