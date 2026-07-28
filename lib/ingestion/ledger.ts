import { createHash } from "node:crypto"
import { appendFile, mkdir, readFile } from "node:fs/promises"
import path from "node:path"

import type {
  IngestionLedgerEvent,
  IngestionLedgerRecord,
  IngestionLedgerReport,
} from "./contracts.ts"

function recordHash(
  sequence: number,
  previousHash: string | null,
  event: IngestionLedgerEvent
) {
  return createHash("sha256")
    .update(JSON.stringify({ sequence, previousHash, event }))
    .digest("hex")
}

function ledgerPathInsideRoot(ledgerFile: string, ledgerRoot: string) {
  const resolvedRoot = path.resolve(ledgerRoot)
  const resolvedFile = path.resolve(ledgerFile)
  const relative = path.relative(resolvedRoot, resolvedFile)

  if (
    relative === "" ||
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`Ledger refused path outside ledger root: ${resolvedFile}`)
  }

  return { resolvedFile, resolvedRoot }
}

export async function readAndVerifyLedger(
  ledgerFile: string
): Promise<IngestionLedgerReport> {
  let contents = ""
  try {
    contents = await readFile(ledgerFile, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { valid: true, records: [], errors: [], headHash: null }
    }
    throw error
  }

  const errors: string[] = []
  const records: IngestionLedgerRecord[] = []
  const lines = contents.split("\n").filter((line) => line.trim().length > 0)

  for (const [index, line] of lines.entries()) {
    let record: IngestionLedgerRecord
    try {
      record = JSON.parse(line) as IngestionLedgerRecord
    } catch {
      errors.push(`Ledger line ${index + 1} is not valid JSON.`)
      continue
    }

    const expectedSequence = index + 1
    const expectedPreviousHash = records.at(-1)?.recordHash ?? null
    const expectedHash = recordHash(
      record.sequence,
      record.previousHash,
      record.event
    )
    if (record.sequence !== expectedSequence) {
      errors.push(`Ledger line ${index + 1} has invalid sequence.`)
    }
    if (record.previousHash !== expectedPreviousHash) {
      errors.push(`Ledger line ${index + 1} breaks the hash chain.`)
    }
    if (record.recordHash !== expectedHash) {
      errors.push(`Ledger line ${index + 1} has an invalid record hash.`)
    }
    records.push(record)
  }

  return {
    valid: errors.length === 0,
    records,
    errors,
    headHash: records.at(-1)?.recordHash ?? null,
  }
}

export async function appendLedgerEvent({
  ledgerFile,
  ledgerRoot,
  event,
}: {
  ledgerFile: string
  ledgerRoot: string
  event: IngestionLedgerEvent
}): Promise<IngestionLedgerRecord> {
  const { resolvedFile, resolvedRoot } = ledgerPathInsideRoot(
    ledgerFile,
    ledgerRoot
  )
  await mkdir(resolvedRoot, { recursive: true })
  const report = await readAndVerifyLedger(resolvedFile)
  if (!report.valid) {
    throw new Error(`Ledger integrity check failed: ${report.errors.join(" ")}`)
  }
  if (report.records.some((record) => record.event.eventId === event.eventId)) {
    throw new Error(`Ledger event id already exists: ${event.eventId}`)
  }

  const sequence = report.records.length + 1
  const previousHash = report.headHash
  const record: IngestionLedgerRecord = {
    schemaVersion: "1.0",
    sequence,
    previousHash,
    event,
    recordHash: recordHash(sequence, previousHash, event),
  }
  await appendFile(resolvedFile, `${JSON.stringify(record)}\n`, {
    encoding: "utf8",
    mode: 0o644,
  })

  return record
}
