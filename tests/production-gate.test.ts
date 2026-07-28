import assert from "node:assert/strict"
import test from "node:test"

import { exampleReleaseCandidate } from "../data/intake/source-candidates.ts"
import type {
  FileInventory,
  ProductionIntakeApproval,
  SourceCandidate,
  SourcePageInventory,
} from "../lib/ingestion/contracts.ts"
import { evaluateProductionIntakeGate } from "../lib/ingestion/production-gate.ts"

test("unconfigured example remains blocked before source and use approval", () => {
  const report = evaluateProductionIntakeGate({
    candidate: exampleReleaseCandidate,
    approval: null,
    files: [],
    pages: [],
  })

  assert.equal(report.readyForExtraction, false)
  assert.equal(report.readyForAcquisition, false)
  assert.equal(report.readyForQuotation, false)
  assert.equal(report.readyForPageDisplay, false)
  assert.equal(report.approvalId, null)
  assert.deepEqual(
    report.permissions.map((permission) => [permission.id, permission.status]),
    [
      ["store", "blocked"],
      ["extract", "blocked"],
      ["quote", "blocked"],
      ["display_pages", "blocked"],
    ]
  )
  assert.deepEqual(
    report.checks.map((check) => [check.id, check.status]),
    [
      ["official_listing", "blocked"],
      ["source_file_identity", "blocked"],
      ["use_boundary", "blocked"],
      ["page_inventory", "blocked"],
    ]
  )
})

test("production gate requires a complete sequential page inventory", () => {
  const candidate: SourceCandidate = {
    ...exampleReleaseCandidate,
    authorityAssessment: {
      ...exampleReleaseCandidate.authorityAssessment,
      listing: "official_publisher",
      documentBytes: "verified",
    },
    access: {
      ...exampleReleaseCandidate.access,
      status: "available",
    },
    reportedPageCount: {
      value: 2,
      state: "verified_from_file",
      note: "Test-only approved input.",
    },
  }
  const file: FileInventory = {
    id: "file-approved",
    relativePath: "approved.pdf",
    fileName: "approved.pdf",
    mimeType: "application/pdf",
    byteLength: 42,
    checksumAlgorithm: "sha256",
    sha256: "a".repeat(64),
  }
  const approval: ProductionIntakeApproval = {
    schemaVersion: "1.0",
    approvalId: "approval-test",
    candidateId: candidate.id,
    approvedBy: "owner-test",
    approvedAt: "2026-07-28T00:00:00Z",
    note: "Test-only approval fixture.",
    permissions: {
      canStore: true,
      canExtract: true,
      canDisplayPages: false,
      canQuote: false,
    },
  }
  const pages: SourcePageInventory[] = [1, 2].map((pageNumber) => ({
    id: `page-${pageNumber}`,
    sourceFileId: file.id,
    pageNumber,
    state: "pending_extraction",
  }))

  const ready = evaluateProductionIntakeGate({
    candidate,
    approval,
    files: [file],
    pages,
  })
  const incomplete = evaluateProductionIntakeGate({
    candidate,
    approval,
    files: [file],
    pages: pages.slice(0, 1),
  })

  assert.equal(ready.readyForExtraction, true)
  assert.equal(ready.readyForAcquisition, true)
  assert.equal(ready.readyForQuotation, false)
  assert.equal(ready.readyForPageDisplay, false)
  assert.equal(ready.approvalId, approval.approvalId)
  assert.equal(incomplete.readyForExtraction, false)
  assert.equal(incomplete.checks.at(-1)?.status, "blocked")
})

test("quotation and page display stay independently locked", () => {
  const candidate: SourceCandidate = {
    ...exampleReleaseCandidate,
    authorityAssessment: {
      ...exampleReleaseCandidate.authorityAssessment,
      listing: "official_publisher",
      documentBytes: "verified",
    },
    access: {
      ...exampleReleaseCandidate.access,
      status: "available",
    },
    reportedPageCount: {
      value: 1,
      state: "verified_from_file",
      note: "Test-only approved input.",
    },
  }
  const file: FileInventory = {
    id: "file-approved-all-operations",
    relativePath: "approved.pdf",
    fileName: "approved.pdf",
    mimeType: "application/pdf",
    byteLength: 42,
    checksumAlgorithm: "sha256",
    sha256: "b".repeat(64),
  }
  const page: SourcePageInventory = {
    id: "page-approved-1",
    sourceFileId: file.id,
    pageNumber: 1,
    state: "pending_extraction",
  }
  const approval: ProductionIntakeApproval = {
    schemaVersion: "1.0",
    approvalId: "approval-all-operations",
    candidateId: candidate.id,
    approvedBy: "owner-test",
    approvedAt: "2026-07-28T00:00:00Z",
    note: "Test-only approval fixture.",
    permissions: {
      canStore: true,
      canExtract: true,
      canDisplayPages: true,
      canQuote: true,
    },
  }

  const ready = evaluateProductionIntakeGate({
    candidate,
    approval,
    files: [file],
    pages: [page],
  })
  const invalidApproval = evaluateProductionIntakeGate({
    candidate,
    approval: { ...approval, approvedAt: "not-a-date" },
    files: [file],
    pages: [page],
  })

  assert.equal(ready.readyForQuotation, true)
  assert.equal(ready.readyForPageDisplay, true)
  assert.equal(
    ready.permissions.every((permission) => permission.status === "ready"),
    true
  )
  assert.equal(invalidApproval.readyForAcquisition, false)
  assert.equal(invalidApproval.readyForExtraction, false)
  assert.equal(invalidApproval.approvalId, null)
})
