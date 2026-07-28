import assert from "node:assert/strict"
import {
  access,
  chmod,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import {
  appendLedgerEvent,
  readAndVerifyLedger,
} from "../lib/ingestion/ledger.ts"
import { storeVaultObject } from "../lib/ingestion/vault.ts"

const projectRoot = process.cwd()
const fixtureRoot = path.join(projectRoot, "tests", "fixtures", "intake")
const fixtureFile = path.join(fixtureRoot, "safe-intake-fixture.txt")

test("vault stores a content-addressed read-only object without overwriting", async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "diary-vault-test-"))
  try {
    const vaultRoot = path.join(workspace, "vault")
    const input = {
      inputFile: fixtureFile,
      allowedInputRoot: fixtureRoot,
      vaultRoot,
      sourceId: "source-fixture-test",
      recordedAt: "2026-07-28T00:00:00Z",
      isFixture: true,
    }
    const created = await storeVaultObject(input)
    const reused = await storeVaultObject(input)
    const storedFile = path.join(vaultRoot, created.storedRelativePath)
    const storedStats = await stat(storedFile)

    assert.equal(created.action, "created")
    assert.equal(reused.action, "reused")
    assert.equal(created.objectId, reused.objectId)
    assert.equal(storedStats.mode & 0o777, 0o444)
    assert.deepEqual(await readFile(storedFile), await readFile(fixtureFile))
    await access(storedFile)
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})

test("vault refuses an input outside the allowed root", async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "diary-vault-test-"))
  try {
    await assert.rejects(
      storeVaultObject({
        inputFile: path.join(projectRoot, "README.md"),
        allowedInputRoot: fixtureRoot,
        vaultRoot: path.join(workspace, "vault"),
        sourceId: "source-fixture-test",
        recordedAt: "2026-07-28T00:00:00Z",
        isFixture: true,
      }),
      /refused input outside allowed root/
    )
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})

test("ledger is hash chained and refuses appends after tampering", async () => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "diary-ledger-test-"))
  try {
    const ledgerRoot = path.join(workspace, "ledger")
    const ledgerFile = path.join(ledgerRoot, "events.jsonl")
    const baseEvent = {
      schemaVersion: "1.0" as const,
      occurredAt: "2026-07-28T00:00:00Z",
      runId: "run-fixture-test",
      stage: "vault",
      detail: "Fixture ledger test.",
    }
    await appendLedgerEvent({
      ledgerFile,
      ledgerRoot,
      event: { ...baseEvent, eventId: "event-1", status: "started" },
    })
    await appendLedgerEvent({
      ledgerFile,
      ledgerRoot,
      event: { ...baseEvent, eventId: "event-2", status: "completed" },
    })
    const valid = await readAndVerifyLedger(ledgerFile)
    assert.equal(valid.valid, true)
    assert.equal(valid.records.length, 2)
    assert.equal(valid.records[1]?.previousHash, valid.records[0]?.recordHash)

    const tampered = (await readFile(ledgerFile, "utf8")).replace(
      "Fixture ledger test.",
      "Tampered ledger test."
    )
    await chmod(ledgerFile, 0o644)
    await writeFile(ledgerFile, tampered)
    const invalid = await readAndVerifyLedger(ledgerFile)
    assert.equal(invalid.valid, false)
    assert.match(invalid.errors.join(" "), /invalid record hash/)
    await assert.rejects(
      appendLedgerEvent({
        ledgerFile,
        ledgerRoot,
        event: { ...baseEvent, eventId: "event-3", status: "completed" },
      }),
      /integrity check failed/
    )
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})
