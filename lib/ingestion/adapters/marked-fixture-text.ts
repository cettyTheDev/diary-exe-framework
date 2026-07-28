import type { PageExtractionAdapter, PageWorkItem } from "../extraction.ts"

const PAGE_MARKER =
  /^=== FIXTURE PAGE (\d+) (SOURCE_TEXT|OCR) CONFIDENCE (0(?:\.\d+)?|1(?:\.0+)?) ===$/gm

export const markedFixtureTextAdapter: PageExtractionAdapter = {
  id: "marked-fixture-text",
  version: "1.0.0",
  prepare(contents) {
    const text = Buffer.from(contents).toString("utf8")
    const matches = [...text.matchAll(PAGE_MARKER)]

    return matches.map((match, index): PageWorkItem => {
      const pageNumber = Number(match[1])
      const start = (match.index ?? 0) + match[0].length
      const end = matches[index + 1]?.index ?? text.length
      return {
        pageNumber,
        payload: text.slice(start, end).trim(),
        method: match[2] === "OCR" ? "ocr" : "source_text",
        confidence: Number(match[3]),
      }
    })
  },
  async extractPage(page) {
    return page.payload
  },
}
