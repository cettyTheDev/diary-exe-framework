import { mkdtemp, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import {
  appendLedgerEvent,
  readAndVerifyLedger,
} from "../lib/ingestion/ledger.ts"
import { storeVaultObject } from "../lib/ingestion/vault.ts"

const projectRoot = process.cwd()
const fixtureRoot = path.join(projectRoot, "tests", "fixtures", "intake")
const fixtureFile = path.join(fixtureRoot, "safe-intake-fixture.txt")
const workspace = await mkdtemp(path.join(os.tmpdir(), "diary-exe-vault-"))

try {
  const receipt = await storeVaultObject({
    inputFile: fixtureFile,
    allowedInputRoot: fixtureRoot,
    vaultRoot: path.join(workspace, "vault"),
    sourceId: "source-fixture-vault-demo",
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
      eventId: "fixture-vault-created",
      occurredAt: "2026-07-28T00:00:00Z",
      runId: "run-fixture-vault-demo",
      stage: "vault",
      status: "completed",
      detail: `Stored ${receipt.objectId} as an immutable fixture object.`,
    },
  })
  const ledger = await readAndVerifyLedger(ledgerFile)

  process.stdout.write(`${JSON.stringify({ receipt, ledger }, null, 2)}\n`)
} finally {
  await rm(workspace, { recursive: true, force: true })
}
