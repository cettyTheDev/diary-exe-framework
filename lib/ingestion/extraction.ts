import { createHash } from "node:crypto"

import type {
  PageExtractionArtifact,
  PageExtractionRunResult,
  ProductionIntakeGateReport,
  VaultReceipt,
} from "./contracts.ts"

export type PageWorkItem = {
  pageNumber: number
  payload: string
  method: "source_text" | "ocr"
  confidence: number
}

export type PageExtractionAdapter = {
  id: string
  version: string
  prepare(contents: Uint8Array): readonly PageWorkItem[]
  extractPage(page: PageWorkItem): Promise<string>
}

export type ExtractionAuthorization =
  { mode: "fixture" } | { mode: "production"; gate: ProductionIntakeGateReport }

function sha256(contents: string | Uint8Array) {
  return createHash("sha256").update(contents).digest("hex")
}

function validateAuthorization(
  receipt: VaultReceipt,
  authorization: ExtractionAuthorization
) {
  if (authorization.mode === "fixture") {
    if (!receipt.isFixture) {
      throw new Error(
        "Fixture extraction authorization requires a fixture receipt."
      )
    }
    return
  }

  if (
    receipt.isFixture ||
    !authorization.gate.readyForExtraction ||
    authorization.gate.candidateId.length === 0
  ) {
    throw new Error("Production extraction requires a ready production gate.")
  }
}

function validateWorkItems(items: readonly PageWorkItem[]) {
  if (
    items.length === 0 ||
    items.some(
      (item, index) =>
        item.pageNumber !== index + 1 ||
        item.payload.trim().length === 0 ||
        item.confidence < 0 ||
        item.confidence > 1
    )
  ) {
    throw new Error(
      "Extraction adapter must emit non-empty sequential pages with confidence in range."
    )
  }
}

export async function runPageExtraction({
  runId,
  receipt,
  contents,
  adapter,
  authorization,
  resumePages = [],
}: {
  runId: string
  receipt: VaultReceipt
  contents: Uint8Array
  adapter: PageExtractionAdapter
  authorization: ExtractionAuthorization
  resumePages?: readonly PageExtractionArtifact[]
}): Promise<PageExtractionRunResult> {
  validateAuthorization(receipt, authorization)
  if (sha256(contents) !== receipt.file.sha256) {
    throw new Error(
      "Extraction input does not match the vault receipt checksum."
    )
  }

  const workItems = adapter.prepare(contents)
  validateWorkItems(workItems)
  const pages: PageExtractionArtifact[] = []
  let reusedPages = 0

  for (const item of workItems) {
    const inputPageSha256 = sha256(item.payload)
    const resumable = resumePages.find(
      (page) =>
        page.sourceFileId === receipt.file.id &&
        page.pageNumber === item.pageNumber &&
        page.inputPageSha256 === inputPageSha256 &&
        page.extractor.id === adapter.id &&
        page.extractor.version === adapter.version
    )
    if (resumable) {
      pages.push(resumable)
      reusedPages += 1
      continue
    }

    try {
      const rawText = await adapter.extractPage(item)
      if (rawText.trim().length === 0) {
        throw new Error("Extractor returned empty page text.")
      }
      pages.push({
        schemaVersion: "1.0",
        id: `extract-${receipt.file.sha256.slice(0, 12)}-${item.pageNumber
          .toString()
          .padStart(4, "0")}`,
        sourceId: receipt.sourceId,
        sourceFileId: receipt.file.id,
        pageNumber: item.pageNumber,
        method: item.method,
        rawText,
        inputPageSha256,
        rawTextSha256: sha256(rawText),
        confidence: item.confidence,
        verificationState: "unverified",
        extractor: { id: adapter.id, version: adapter.version },
        isFixture: receipt.isFixture,
      })
    } catch (error) {
      return {
        schemaVersion: "1.0",
        runId,
        status: "failed",
        pages,
        totalPages: workItems.length,
        reusedPages,
        failedPage: item.pageNumber,
        errors: [
          error instanceof Error
            ? error.message
            : "Unknown extraction failure.",
        ],
      }
    }
  }

  return {
    schemaVersion: "1.0",
    runId,
    status: "complete",
    pages,
    totalPages: workItems.length,
    reusedPages,
    failedPage: null,
    errors: [],
  }
}
