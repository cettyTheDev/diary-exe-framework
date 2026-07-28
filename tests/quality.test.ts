import assert from "node:assert/strict"
import test from "node:test"

import { archiveFixtures } from "../data/editorial/demo-fixtures.ts"
import { generateArchiveQualityReport } from "../lib/archive/quality.ts"

test("fixture quality report has full page and citation coverage", () => {
  const report = generateArchiveQualityReport(archiveFixtures, "fixture")

  assert.equal(report.valid, true)
  assert.equal(report.errors.length, 0)
  assert.equal(report.metrics.brokenReferences, 0)
  assert.equal(report.metrics.orphanPages, 0)
  assert.equal(report.metrics.listedPageCoverage, 1)
  assert.equal(report.metrics.entryCitationCoverage, 1)
  assert.equal(report.metrics.relationshipCitationCoverage, 1)
  assert.equal(report.metrics.unlabeledOcrPages, 0)
  assert.equal(report.metrics.fixtureLeakage, 0)
})

test("production quality report rejects fixtures and missing checksums", () => {
  const report = generateArchiveQualityReport(archiveFixtures, "production")
  const codes = new Set(report.errors.map((issue) => issue.code))

  assert.equal(report.valid, false)
  assert.equal(report.metrics.fixtureLeakage, 22)
  assert.equal(codes.has("FIXTURE_LEAKAGE"), true)
  assert.equal(codes.has("PRODUCTION_CHECKSUM_REQUIRED"), true)
})

test("quality report exposes broken pages, citations, and OCR confidence", () => {
  const corrupted = structuredClone(archiveFixtures)
  corrupted.sources[0]!.pageIds = ["page-demo-1", "page-demo-2"]
  corrupted.entries[0]!.citationIds = []
  corrupted.entries[0]!.sourcePages = [99]
  corrupted.relationships[0]!.citationIds = []
  corrupted.pages[1]!.extractionKind = "ocr"
  corrupted.pages[1]!.confidence = null

  const report = generateArchiveQualityReport(corrupted, "fixture")
  const messages = report.errors.map((issue) => issue.message).join("\n")

  assert.equal(report.valid, false)
  assert.equal(report.metrics.orphanPages, 1)
  assert.equal(report.metrics.entryCitationCoverage, 0.75)
  assert.equal(report.metrics.relationshipCitationCoverage, 2 / 3)
  assert.equal(report.metrics.unlabeledOcrPages, 1)
  assert.match(messages, /does not list page id page-demo-3/)
  assert.match(messages, /missing source page 99/)
  assert.match(messages, /has no citations/)
  assert.match(messages, /OCR page page-demo-2 has no confidence/)
})
