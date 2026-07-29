import assert from "node:assert/strict"
import test from "node:test"

import { createPdfJsTesseractOcrAdapter } from "../lib/ingestion/adapters/pdfjs-tesseract-ocr.ts"
import { singlePageImagePdf, singlePageTextPdf } from "./helpers/pdf.ts"

test("local OCR preserves embedded PDF text without relabeling it", async () => {
  const adapter = await createPdfJsTesseractOcrAdapter({ maxPages: 1 })
  const pages = await adapter.prepare(
    Buffer.from(singlePageTextPdf("Embedded source text"))
  )

  assert.equal(pages.length, 1)
  assert.equal(pages[0]?.method, "source_text")
  assert.equal(pages[0]?.confidence, 1)
  assert.match(await adapter.extractPage(pages[0]!), /Embedded source text/)
})

test("local OCR recognizes a synthetic image-only PDF and remains unverified", async () => {
  const adapter = await createPdfJsTesseractOcrAdapter({ maxPages: 1 })
  const pages = await adapter.prepare(
    await singlePageImagePdf("OCR TEST PAGE 42")
  )

  assert.equal(pages.length, 1)
  assert.equal(pages[0]?.method, "ocr")
  assert.ok((pages[0]?.confidence ?? 0) > 0.5)
  assert.match(await adapter.extractPage(pages[0]!), /OCR TEST PAGE 42/i)
})

test("local OCR does not fabricate text for a blank scan", async () => {
  const adapter = await createPdfJsTesseractOcrAdapter({ maxPages: 1 })
  const pages = await adapter.prepare(await singlePageImagePdf(""))

  assert.equal(pages[0]?.method, "ocr")
  assert.equal(pages[0]?.confidence, 0)
  assert.match(
    await adapter.extractPage(pages[0]!),
    /OCR REQUIRED — NO TEXT RECOGNIZED/
  )
})

test("local OCR validates bounds and fails clearly without Tesseract", async () => {
  await assert.rejects(
    createPdfJsTesseractOcrAdapter({ maxPages: 0 }),
    /integer from 1 to 100/
  )
  await assert.rejects(
    createPdfJsTesseractOcrAdapter({
      maxPages: 1,
      tesseractBinary: "definitely-not-a-tesseract-binary",
    }),
    /unavailable/
  )
})
