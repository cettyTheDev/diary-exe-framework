import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { createCanvas } from "@napi-rs/canvas"
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"

import type { PageExtractionAdapter, PageWorkItem } from "../extraction.ts"

const standardFontDataUrl = `${path.dirname(
  fileURLToPath(import.meta.resolve("pdfjs-dist/standard_fonts/LICENSE_FOXIT"))
)}${path.sep}`
const MAX_PROCESS_OUTPUT_BYTES = 16 * 1024 * 1024
const OCR_TIMEOUT_MS = 90_000

type PreparedPage = {
  schemaVersion: "1.0"
  fileSha256: string
  pageNumber: number
  method: "source_text" | "ocr"
  text: string
  confidence: number
}

type OcrResult = {
  text: string
  confidence: number
}

function sha256(value: Uint8Array) {
  return createHash("sha256").update(value).digest("hex")
}

function extractedText(items: readonly unknown[]) {
  let result = ""
  for (const item of items) {
    if (typeof item !== "object" || item === null || !("str" in item)) continue
    const textItem = item as { str?: unknown; hasEOL?: unknown }
    if (typeof textItem.str !== "string") continue
    result += textItem.str
    result += textItem.hasEOL === true ? "\n" : " "
  }
  return result
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
}

function boundedProcess(
  binary: string,
  args: readonly string[],
  input?: Uint8Array
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, [...args], {
      stdio: [input ? "pipe" : "ignore", "pipe", "pipe"],
    })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    let outputBytes = 0
    let settled = false
    const finish = (
      error?: Error,
      result?: { stdout: string; stderr: string }
    ) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (error) reject(error)
      else resolve(result!)
    }
    const append = (target: Buffer[], chunk: Buffer) => {
      outputBytes += chunk.length
      if (outputBytes > MAX_PROCESS_OUTPUT_BYTES) {
        child.kill("SIGKILL")
        finish(
          new Error("Local OCR process exceeded its bounded output limit.")
        )
        return
      }
      target.push(chunk)
    }
    child.stdout!.on("data", (chunk: Buffer) => append(stdout, chunk))
    child.stderr!.on("data", (chunk: Buffer) => append(stderr, chunk))
    child.on("error", () =>
      finish(new Error("Local Tesseract executable is unavailable."))
    )
    child.on("close", (code) => {
      if (settled) return
      const stderrText = Buffer.concat(stderr).toString("utf8")
      if (code !== 0) {
        finish(
          new Error(
            `Local Tesseract failed with exit code ${code ?? "unknown"}: ${stderrText.slice(0, 300)}`
          )
        )
        return
      }
      finish(undefined, {
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: stderrText,
      })
    })
    const timer = setTimeout(() => {
      child.kill("SIGKILL")
      finish(new Error("Local OCR page exceeded its 90-second timeout."))
    }, OCR_TIMEOUT_MS)
    if (input) child.stdin!.end(input)
  })
}

function parseTsv(tsv: string): OcrResult {
  const lines = new Map<string, string[]>()
  const confidences: { confidence: number; weight: number }[] = []
  for (const row of tsv.split(/\r?\n/).slice(1)) {
    const fields = row.split("\t")
    if (fields.length < 12) continue
    const text = fields.slice(11).join("\t").trim()
    const confidence = Number(fields[10])
    if (!text || !Number.isFinite(confidence) || confidence < 0) continue
    const lineKey = fields.slice(1, 5).join(":")
    const words = lines.get(lineKey) ?? []
    words.push(text)
    lines.set(lineKey, words)
    confidences.push({ confidence, weight: Math.max(1, text.length) })
  }
  const text = [...lines.values()]
    .map((words) => words.join(" "))
    .join("\n")
    .trim()
  const totalWeight = confidences.reduce((sum, item) => sum + item.weight, 0)
  const confidence = totalWeight
    ? confidences.reduce(
        (sum, item) => sum + item.confidence * item.weight,
        0
      ) /
      totalWeight /
      100
    : 0
  return { text, confidence: Math.max(0, Math.min(1, confidence)) }
}

async function runTesseract(
  input: Uint8Array,
  binary: string,
  language: string
) {
  const result = await boundedProcess(
    binary,
    ["stdin", "stdout", "-l", language, "--psm", "6", "tsv"],
    input
  )
  return parseTsv(result.stdout)
}

export async function createPdfJsTesseractOcrAdapter({
  maxPages,
  language = "eng",
  scale = 2,
  tesseractBinary = "tesseract",
}: {
  maxPages: number
  language?: string
  scale?: number
  tesseractBinary?: string
}): Promise<PageExtractionAdapter> {
  if (!Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > 100) {
    throw new Error("OCR pilot page limit must be an integer from 1 to 100.")
  }
  if (!/^[a-z0-9][a-z0-9_+.-]{0,79}$/i.test(language)) {
    throw new Error("OCR language contains unsupported characters.")
  }
  if (!Number.isFinite(scale) || scale < 1 || scale > 4) {
    throw new Error("OCR render scale must be from 1 to 4.")
  }
  const versionResult = await boundedProcess(tesseractBinary, ["--version"])
  const version = versionResult.stdout.split(/\r?\n/, 1)[0]?.trim()
  if (!version?.startsWith("tesseract ")) {
    throw new Error("Local Tesseract version could not be identified.")
  }

  return {
    id: "pdfjs-tesseract-ocr",
    version: `1.0.0-pdfjs-6.1.200-${version.replace(/\s+/g, "-")}`,
    async prepare(contents) {
      const fileSha256 = sha256(contents)
      const loadingTask = getDocument({
        data: new Uint8Array(contents),
        standardFontDataUrl,
        useWorkerFetch: false,
      })
      const document = await loadingTask.promise
      try {
        const pageLimit = Math.min(maxPages, document.numPages)
        const items: PageWorkItem[] = []
        for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
          const page = await document.getPage(pageNumber)
          const content = await page.getTextContent()
          const sourceText = extractedText(content.items)
          let prepared: PreparedPage
          if (sourceText) {
            prepared = {
              schemaVersion: "1.0",
              fileSha256,
              pageNumber,
              method: "source_text",
              text: sourceText,
              confidence: 1,
            }
          } else {
            const viewport = page.getViewport({ scale })
            const canvas = createCanvas(
              Math.ceil(viewport.width),
              Math.ceil(viewport.height)
            )
            const renderContext = {
              canvas,
              canvasContext: canvas.getContext("2d"),
              viewport,
            } as unknown as Parameters<typeof page.render>[0]
            await page.render(renderContext).promise
            const ocr = await runTesseract(
              canvas.toBuffer("image/png"),
              tesseractBinary,
              language
            )
            prepared = {
              schemaVersion: "1.0",
              fileSha256,
              pageNumber,
              method: "ocr",
              text:
                ocr.text ||
                `[OCR REQUIRED — NO TEXT RECOGNIZED ON PAGE ${pageNumber}]`,
              confidence: ocr.confidence,
            }
          }
          items.push({
            pageNumber,
            payload: JSON.stringify(prepared),
            method: prepared.method,
            confidence: prepared.confidence,
          })
          page.cleanup()
        }
        return items
      } finally {
        await loadingTask.destroy()
      }
    },
    async extractPage(page) {
      const parsed = JSON.parse(page.payload) as Partial<PreparedPage>
      if (
        parsed.schemaVersion !== "1.0" ||
        parsed.pageNumber !== page.pageNumber ||
        parsed.method !== page.method ||
        parsed.confidence !== page.confidence ||
        typeof parsed.text !== "string" ||
        !/^[a-f0-9]{64}$/.test(parsed.fileSha256 ?? "")
      ) {
        throw new Error(
          `Invalid prepared OCR payload for page ${page.pageNumber}.`
        )
      }
      return parsed.text
    },
  }
}
