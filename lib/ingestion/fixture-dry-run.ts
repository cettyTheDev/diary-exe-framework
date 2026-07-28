import { createHash } from "node:crypto"
import { readFile, realpath, stat } from "node:fs/promises"
import path from "node:path"

import type {
  FileInventory,
  FixtureDryRunResult,
  SourceManifest,
  SourcePageInventory,
  ValidationIssue,
  ValidationReport,
} from "./contracts.ts"

const FIXTURE_PAGE_MARKER = /^=== FIXTURE PAGE (\d+) ===$/gm

function isInsideDirectory(filePath: string, directoryPath: string) {
  const relative = path.relative(directoryPath, filePath)
  return (
    relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
  )
}

function mimeTypeFor(fileName: string) {
  switch (path.extname(fileName).toLowerCase()) {
    case ".json":
      return "application/json"
    case ".txt":
      return "text/plain"
    default:
      return "application/octet-stream"
  }
}

function pageNumbersFromFixture(contents: string) {
  return [...contents.matchAll(FIXTURE_PAGE_MARKER)].map((match) =>
    Number(match[1])
  )
}

function validateFixtureManifest(
  manifest: SourceManifest,
  extractions: FixtureDryRunResult["extractions"]
): ValidationReport {
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = [
    {
      code: "FIXTURE_ONLY",
      severity: "warning",
      message:
        "This dry run inventories a synthetic fixture and cannot authorize corpus publication.",
      recordId: manifest.sourceId,
    },
  ]

  if (!manifest.isFixture || manifest.authority.kind !== "fixture") {
    errors.push({
      code: "FIXTURE_IDENTITY_REQUIRED",
      severity: "error",
      message:
        "Safe dry-run manifests must remain explicitly marked as fixtures.",
      recordId: manifest.sourceId,
    })
  }

  if (manifest.useBoundary.status !== "fixture_only") {
    errors.push({
      code: "FIXTURE_BOUNDARY_REQUIRED",
      severity: "error",
      message: "Safe dry-run use boundary must be fixture_only.",
      recordId: manifest.sourceId,
    })
  }

  for (const file of manifest.files) {
    if (!/^[a-f0-9]{64}$/.test(file.sha256)) {
      errors.push({
        code: "INVALID_SHA256",
        severity: "error",
        message: `File ${file.id} does not have a valid SHA-256 checksum.`,
        recordId: file.id,
      })
    }
  }

  const pageNumbers = manifest.pages.map((page) => page.pageNumber)
  const uniquePages = new Set(pageNumbers)
  if (
    pageNumbers.length === 0 ||
    uniquePages.size !== pageNumbers.length ||
    pageNumbers.some((page, index) => page !== index + 1)
  ) {
    errors.push({
      code: "INVALID_FIXTURE_PAGE_SEQUENCE",
      severity: "error",
      message:
        "Fixture page markers must form a unique sequence beginning at 1.",
      recordId: manifest.sourceId,
    })
  }

  if (extractions.length > 0 || manifest.useBoundary.canExtract) {
    errors.push({
      code: "DRY_RUN_EXTRACTION_FORBIDDEN",
      severity: "error",
      message: "Safe fixture dry runs stop before extraction.",
      recordId: manifest.sourceId,
    })
  }

  return {
    schemaVersion: "1.0",
    reportId: `validation-${manifest.files[0]?.sha256.slice(0, 16) ?? "missing"}`,
    sourceId: manifest.sourceId,
    valid: errors.length === 0,
    errors,
    warnings,
    metrics: {
      files: manifest.files.length,
      pages: manifest.pages.length,
      extractions: extractions.length,
    },
  }
}

export async function runFixtureIntakeDryRun(
  fixtureFile: string,
  fixtureRoot: string
): Promise<FixtureDryRunResult> {
  const [realFixtureFile, realFixtureRoot] = await Promise.all([
    realpath(fixtureFile),
    realpath(fixtureRoot),
  ])

  if (!isInsideDirectory(realFixtureFile, realFixtureRoot)) {
    throw new Error(
      `Fixture dry run refused path outside fixture root: ${realFixtureFile}`
    )
  }

  const [contentsBuffer, fileStats] = await Promise.all([
    readFile(realFixtureFile),
    stat(realFixtureFile),
  ])
  if (!fileStats.isFile()) {
    throw new Error(
      `Fixture dry run requires a regular file: ${realFixtureFile}`
    )
  }

  const contents = contentsBuffer.toString("utf8")
  const sha256 = createHash("sha256").update(contentsBuffer).digest("hex")
  const sourceId = `source-fixture-${sha256.slice(0, 12)}`
  const fileId = `file-fixture-${sha256.slice(0, 12)}`
  const relativePath = path
    .relative(realFixtureRoot, realFixtureFile)
    .split(path.sep)
    .join("/")
  const file: FileInventory = {
    id: fileId,
    relativePath,
    fileName: path.basename(realFixtureFile),
    mimeType: mimeTypeFor(realFixtureFile),
    byteLength: contentsBuffer.byteLength,
    checksumAlgorithm: "sha256",
    sha256,
  }
  const pages: SourcePageInventory[] = pageNumbersFromFixture(contents).map(
    (pageNumber) => ({
      id: `${sourceId}-page-${pageNumber.toString().padStart(4, "0")}`,
      sourceFileId: fileId,
      pageNumber,
      state: "fixture",
    })
  )
  const manifest: SourceManifest = {
    schemaVersion: "1.0",
    sourceId,
    title: "SAFE INTAKE FIXTURE — NOT SOURCE EVIDENCE",
    authority: {
      kind: "fixture",
      origin: "tests/fixtures/intake",
      note: "Synthetic local file used only to verify deterministic inventory.",
    },
    useBoundary: {
      status: "fixture_only",
      note: "No diary material is present and no publication right is implied.",
      canStore: true,
      canExtract: false,
      canDisplayPages: false,
      canQuote: false,
    },
    files: [file],
    pages,
    isFixture: true,
  }
  const extractions: FixtureDryRunResult["extractions"] = []
  const validation = validateFixtureManifest(manifest, extractions)

  return {
    manifest,
    run: {
      schemaVersion: "1.0",
      runId: `dry-run-${sha256.slice(0, 16)}`,
      mode: "fixture_dry_run",
      sourceId,
      inputChecksums: [sha256],
      stages: [
        {
          stage: "inventory",
          status: "complete",
          recordCount: 1,
          note: "Recorded fixture identity, size, MIME type, and SHA-256.",
        },
        {
          stage: "page_inventory",
          status: "complete",
          recordCount: pages.length,
          note: "Recorded explicitly marked synthetic page boundaries.",
        },
        {
          stage: "extraction",
          status: "blocked",
          recordCount: 0,
          note: "Fixture dry run intentionally stops before extraction or OCR.",
        },
      ],
      deterministic: true,
    },
    extractions,
    validation,
  }
}
