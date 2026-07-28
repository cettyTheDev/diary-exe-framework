import { createHash } from "node:crypto"

import type {
  CorpusIndexDocument,
  CorpusIndexPosting,
  CorpusSearchHit,
  CorpusSearchIndex,
  CorpusSearchSummary,
  EntityReviewReport,
  NormalizedEntryCandidate,
} from "../ingestion/contracts.ts"

export type IndexBuildAuthorization =
  { mode: "fixture" } | { mode: "production"; review: EntityReviewReport }

export interface CorpusSearchRepository {
  search(query: string, limit?: number): readonly CorpusSearchHit[]
  getDocument(id: string): CorpusIndexDocument | undefined
  getSummary(): CorpusSearchSummary
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function tokenize(value: string) {
  const normalized = value.normalize("NFKC").toLocaleLowerCase("en-US")
  const baseTokens = normalized.match(/[\p{L}\p{N}]+/gu) ?? []
  const tokens: string[] = []

  for (const token of baseTokens) {
    if (/^\p{Script=Han}+$/u.test(token)) {
      const characters = [...token]
      tokens.push(...characters)
      for (let index = 0; index < characters.length - 1; index += 1) {
        tokens.push(`${characters[index]}${characters[index + 1]}`)
      }
    } else {
      tokens.push(token)
    }
  }

  return tokens
}

function indexPayload(index: Omit<CorpusSearchIndex, "indexSha256">) {
  return JSON.stringify(index)
}

function assertAuthorization(
  entries: readonly NormalizedEntryCandidate[],
  authorization: IndexBuildAuthorization
) {
  if (authorization.mode === "fixture") {
    if (entries.some((entry) => !entry.isFixture)) {
      throw new Error("Fixture indexing refuses non-fixture entries.")
    }
    return
  }

  if (entries.some((entry) => entry.isFixture)) {
    throw new Error("Production indexing refuses fixture entries.")
  }
  if (!authorization.review.valid || !authorization.review.readyForPublicUse) {
    throw new Error(
      "Production indexing requires a public-ready review report."
    )
  }
}

export function buildCorpusSearchIndex(input: {
  runId: string
  entries: readonly NormalizedEntryCandidate[]
  authorization: IndexBuildAuthorization
}): CorpusSearchIndex {
  assertAuthorization(input.entries, input.authorization)

  const documents = [...input.entries]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((entry): CorpusIndexDocument => {
      if (sha256(entry.rawText) !== entry.rawTextSha256) {
        throw new Error(`Entry ${entry.id} raw-text checksum does not match.`)
      }
      if (sha256(entry.normalizedText) !== entry.normalizedTextSha256) {
        throw new Error(
          `Entry ${entry.id} normalized-text checksum does not match.`
        )
      }
      return {
        schemaVersion: "1.0",
        id: entry.id,
        title: entry.title,
        normalizedText: entry.normalizedText,
        date: entry.date,
        sourceId: entry.sourceId,
        sourceFileId: entry.sourceFileId,
        sourcePages: [...entry.sourcePages],
        tokenCount: tokenize(`${entry.title} ${entry.normalizedText}`).length,
        isFixture: entry.isFixture,
      }
    })

  const mutablePostings = new Map<string, CorpusIndexPosting[]>()
  for (const document of documents) {
    const frequencies = new Map<string, number>()
    for (const token of tokenize(
      `${document.title} ${document.normalizedText}`
    )) {
      frequencies.set(token, (frequencies.get(token) ?? 0) + 1)
    }
    for (const [token, frequency] of frequencies) {
      const posting = { documentId: document.id, frequency }
      mutablePostings.set(token, [
        ...(mutablePostings.get(token) ?? []),
        posting,
      ])
    }
  }

  const postings = Object.fromEntries(
    [...mutablePostings.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([token, records]) => [
        token,
        records.sort((left, right) =>
          left.documentId.localeCompare(right.documentId)
        ),
      ])
  )
  const withoutHash: Omit<CorpusSearchIndex, "indexSha256"> = {
    schemaVersion: "1.0",
    indexId: `index-${sha256(input.runId).slice(0, 16)}`,
    runId: input.runId,
    documents,
    postings,
    isFixture: input.authorization.mode === "fixture",
  }

  return {
    ...withoutHash,
    indexSha256: sha256(indexPayload(withoutHash)),
  }
}

export function verifyCorpusSearchIndex(index: CorpusSearchIndex) {
  const { indexSha256, ...withoutHash } = index
  return sha256(indexPayload(withoutHash)) === indexSha256
}

export function createCorpusSearchRepository(
  index: CorpusSearchIndex
): CorpusSearchRepository {
  if (!verifyCorpusSearchIndex(index)) {
    throw new Error("Corpus search index checksum does not match.")
  }

  const documentIndex = new Map(
    index.documents.map((document) => [document.id, document])
  )

  return {
    search(query, limit = 20) {
      if (!Number.isInteger(limit) || limit < 1) return []
      const terms = [...new Set(tokenize(query))]
      if (!terms.length) return []

      const scoreByDocument = new Map<string, number>()
      const termsByDocument = new Map<string, string[]>()
      for (const term of terms) {
        for (const posting of index.postings[term] ?? []) {
          scoreByDocument.set(
            posting.documentId,
            (scoreByDocument.get(posting.documentId) ?? 0) + posting.frequency
          )
          termsByDocument.set(posting.documentId, [
            ...(termsByDocument.get(posting.documentId) ?? []),
            term,
          ])
        }
      }

      return [...scoreByDocument.entries()]
        .filter(
          ([documentId]) =>
            termsByDocument.get(documentId)?.length === terms.length
        )
        .map(([documentId, score]): CorpusSearchHit => ({
          document: documentIndex.get(documentId)!,
          score,
          matchedTerms: termsByDocument.get(documentId) ?? [],
        }))
        .sort(
          (left, right) =>
            right.score - left.score ||
            left.document.id.localeCompare(right.document.id)
        )
        .slice(0, limit)
    },
    getDocument(id) {
      return documentIndex.get(id)
    },
    getSummary() {
      return {
        indexId: index.indexId,
        indexSha256: index.indexSha256,
        documents: index.documents.length,
        terms: Object.keys(index.postings).length,
        postings: Object.values(index.postings).reduce(
          (total, records) => total + records.length,
          0
        ),
        isFixture: index.isFixture,
      }
    },
  }
}
