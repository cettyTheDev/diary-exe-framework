import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import test from "node:test"

import { generateArchiveQualityReport } from "../lib/archive/quality.ts"
import type { ArchiveData } from "../lib/archive/types.ts"
import {
  createCompactApprovedRuntimePackage,
  expandCompactApprovedRuntimePackage,
} from "../lib/ingestion/approved-runtime-compact.ts"

const withheldPageText =
  "[FULL PAGE TEXT WITHHELD — APPROVED QUOTATIONS ONLY]"

function buildExampleArtifact() {
  const data: ArchiveData = {
    sources: [
      {
        id: "source-example",
        title: "Example reviewed source",
        fileName: "example-source.pdf",
        version: "example-v1",
        checksum: "a".repeat(64),
        sourceUrl: "https://source.example.invalid/example-source.pdf",
        status: "verified",
        pageIds: ["page-example-1"],
        isFixture: false,
      },
    ],
    pages: [
      {
        id: "page-example-1",
        sourceId: "source-example",
        pageNumber: 1,
        extractedText: withheldPageText,
        extractionKind: "source_text",
        confidence: 1,
        isFixture: false,
      },
    ],
    entries: [
      {
        id: "entry-example-1",
        date: "2026-01-01",
        datePrecision: "day",
        title: "Reviewed example entry",
        exactText: "A source-verified example entry.",
        normalizedText: "A source-verified example entry.",
        context: "Synthetic test data for the runtime package contract.",
        evidenceKind: "diary_text",
        sourceId: "source-example",
        sourcePages: [1],
        citationIds: ["citation-example-1"],
        entityIds: [],
        topicIds: [],
        storyArcIds: [],
        featured: false,
        editorialPosture: "source_record",
        responseState: "not_applicable",
        isFixture: false,
      },
    ],
    citations: [
      {
        id: "citation-example-1",
        sourceId: "source-example",
        pageNumbers: [1],
        label: "Example source page 1",
        state: "verified",
        note: "Synthetic citation used only to test the framework contract.",
        isFixture: false,
      },
    ],
    entities: [],
    relationships: [],
    topics: [],
    storyArcs: [],
  }
  const payload = {
    schemaVersion: "1.0" as const,
    mode: "approved_archive_slice" as const,
    sourceRunId: "run-public-framework-example",
    publicationReady: true as const,
    review: {
      valid: true,
      readyForPublication: true,
    },
    quality: generateArchiveQualityReport(data, "production"),
    data,
  }
  return {
    ...payload,
    artifactSha256: createHash("sha256")
      .update(JSON.stringify(payload))
      .digest("hex"),
  }
}

test("compact runtime package reconstructs the exact approved artifact", () => {
  const artifact = buildExampleArtifact()
  const compact = createCompactApprovedRuntimePackage(artifact)

  assert.deepEqual(expandCompactApprovedRuntimePackage(compact), artifact)
  assert.equal("pageIds" in compact.data.source, false)
  assert.equal("normalizedText" in compact.data.entries[0], false)
})

test("compact runtime package fails closed after payload tampering", () => {
  const compact = createCompactApprovedRuntimePackage(buildExampleArtifact())
  const tampered = {
    ...compact,
    data: {
      ...compact.data,
      entries: [
        { ...compact.data.entries[0], exactText: "Tampered text." },
      ],
    },
  }

  assert.throws(
    () => expandCompactApprovedRuntimePackage(tampered),
    /checksum does not match/
  )
})
