import {
  getShareReceiptFileName,
  type ShareReceiptModel,
} from "./share-receipt"

const RECEIPT_WIDTH = 1080
const RECEIPT_HEIGHT = 1350

type TextStyle = {
  color: string
  font: string
  lineHeight: number
  maxLines: number
}

function fitText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
) {
  const words = text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((word) => {
      if (context.measureText(word).width <= maxWidth) return [word]

      const chunks: string[] = []
      let chunk = ""
      for (const character of word) {
        const candidate = `${chunk}${character}`
        if (chunk && context.measureText(candidate).width > maxWidth) {
          chunks.push(chunk)
          chunk = character
        } else {
          chunk = candidate
        }
      }
      if (chunk) chunks.push(chunk)
      return chunks
    })
  const lines: string[] = []

  for (const word of words) {
    const current = lines.at(-1)
    const candidate = current ? `${current} ${word}` : word

    if (context.measureText(candidate).width <= maxWidth) {
      if (current) lines[lines.length - 1] = candidate
      else lines.push(candidate)
      continue
    }

    if (lines.length === maxLines) break
    lines.push(word)
  }

  if (lines.length > maxLines) lines.length = maxLines
  const consumed = lines.join(" ").length
  if (consumed < text.trim().length && lines.length > 0) {
    let lastLine = lines[lines.length - 1]
    while (
      lastLine.length > 1 &&
      context.measureText(`${lastLine}…`).width > maxWidth
    ) {
      lastLine = lastLine.slice(0, -1)
    }
    lines[lines.length - 1] = `${lastLine.trimEnd()}…`
  }

  return lines
}

function drawTextBlock(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  style: TextStyle
) {
  context.fillStyle = style.color
  context.font = style.font
  const lines = fitText(context, text, maxWidth, style.maxLines)
  lines.forEach((line, index) => {
    context.fillText(line, x, y + index * style.lineHeight)
  })
  return y + lines.length * style.lineHeight
}

function drawRule(
  context: CanvasRenderingContext2D,
  y: number,
  color = "#4d4a3c"
) {
  context.fillStyle = color
  context.fillRect(72, y, RECEIPT_WIDTH - 144, 2)
}

function drawLabel(
  context: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  color = "#4d4a3c"
) {
  context.fillStyle = color
  context.font = "700 20px 'Courier New', monospace"
  context.fillText(label.toUpperCase(), x, y)
}

function joinedOrFallback(values: readonly string[]) {
  return values.length > 0 ? values.join(" / ") : "NONE ASSIGNED"
}

export function renderShareReceiptToCanvas(
  model: ShareReceiptModel,
  canvas: HTMLCanvasElement
) {
  canvas.width = RECEIPT_WIDTH
  canvas.height = RECEIPT_HEIGHT
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas rendering is unavailable.")

  context.textBaseline = "alphabetic"
  context.fillStyle = "#1d1c18"
  context.fillRect(0, 0, RECEIPT_WIDTH, RECEIPT_HEIGHT)

  context.fillStyle = "#f6eadf"
  context.fillRect(40, 40, RECEIPT_WIDTH - 80, RECEIPT_HEIGHT - 80)

  context.fillStyle = "rgba(29, 28, 24, 0.035)"
  for (let y = 58; y < RECEIPT_HEIGHT - 40; y += 28) {
    context.fillRect(40, y, RECEIPT_WIDTH - 80, 1)
  }

  context.fillStyle = model.isFixture ? "#a83b2f" : "#d12676"
  context.fillRect(40, 40, 18, RECEIPT_HEIGHT - 80)

  context.fillStyle = "#4f2769"
  context.font = "900 68px Georgia, serif"
  context.fillText("DIARY.EXE", 78, 130)
  context.fillStyle = "#8a2f93"
  context.font = "700 20px 'Courier New', monospace"
  context.fillText("EVIDENCE MAGAZINE / LOCAL EXPORT", 82, 168)

  context.textAlign = "right"
  context.fillStyle = model.isFixture ? "#a83b2f" : "#8a2f93"
  context.font = "800 19px 'Courier New', monospace"
  context.fillText(model.watermark, RECEIPT_WIDTH - 76, 111)
  context.fillStyle = "#4d4a3c"
  context.fillText(`SCHEMA ${model.schemaVersion}`, RECEIPT_WIDTH - 76, 145)
  context.textAlign = "left"

  drawRule(context, 196)
  context.fillStyle = "#8a2f93"
  context.font = "800 18px 'Courier New', monospace"
  context.fillText("THE PRIVATE RECORD / THE PUBLIC TRACE", 78, 224)
  context.textAlign = "right"
  context.strokeStyle = "#d12676"
  context.lineWidth = 3
  context.strokeRect(708, 202, 294, 34)
  context.fillStyle = "#d12676"
  context.font = "800 14px 'Courier New', monospace"
  context.fillText("DO NOT OPEN WITHOUT THE TRACE", 992, 224)
  context.textAlign = "left"
  drawLabel(context, model.dateLabel, 78, 270)
  drawLabel(context, model.evidenceLabel, 78, 305, "#a83b2f")

  const titleEnd = drawTextBlock(context, model.title, 78, 372, 924, {
    color: "#22211d",
    font: "800 62px Georgia, serif",
    lineHeight: 66,
    maxLines: 2,
  })

  const excerptRule = Math.max(titleEnd + 18, 430)
  context.fillStyle = "#d12676"
  context.fillRect(78, excerptRule, 924, 8)

  drawLabel(context, "ARCHIVE EXCERPT", 86, excerptRule + 48, "#8a2f93")
  drawTextBlock(context, `“${model.excerpt}”`, 86, excerptRule + 88, 900, {
    color: "#22211d",
    font: "700 34px Georgia, serif",
    lineHeight: 44,
    maxLines: 2,
  })

  drawLabel(context, "CONTEXT", 86, 742)
  drawTextBlock(context, model.context, 86, 780, 900, {
    color: "#4d4a3c",
    font: "24px Arial, sans-serif",
    lineHeight: 33,
    maxLines: 2,
  })

  const metadataTop = 830
  drawRule(context, metadataTop)

  const leftX = 78
  const rightX = 570
  const valueWidth = 424
  const firstRow = metadataTop + 42
  drawLabel(context, "SOURCE DOCUMENT", leftX, firstRow)
  drawLabel(context, "PAGE / CITATION STATE", rightX, firstRow)
  drawTextBlock(context, model.source.title, leftX, firstRow + 34, valueWidth, {
    color: "#22211d",
    font: "700 24px Arial, sans-serif",
    lineHeight: 30,
    maxLines: 2,
  })
  drawTextBlock(
    context,
    `${model.source.pageLabel} / ${model.source.citationStateLabel}`,
    rightX,
    firstRow + 34,
    valueWidth,
    {
      color: "#22211d",
      font: "700 22px 'Courier New', monospace",
      lineHeight: 28,
      maxLines: 2,
    }
  )

  const secondRow = firstRow + 118
  drawLabel(context, "FILE / VERSION", leftX, secondRow)
  drawLabel(context, "CHECKSUM", rightX, secondRow)
  drawTextBlock(
    context,
    `${model.source.fileName} / ${model.source.version}`,
    leftX,
    secondRow + 34,
    valueWidth,
    {
      color: "#22211d",
      font: "22px 'Courier New', monospace",
      lineHeight: 28,
      maxLines: 2,
    }
  )
  drawTextBlock(
    context,
    model.source.checksumLabel,
    rightX,
    secondRow + 34,
    valueWidth,
    {
      color: "#22211d",
      font: "22px 'Courier New', monospace",
      lineHeight: 28,
      maxLines: 2,
    }
  )

  const thirdRow = secondRow + 116
  drawLabel(context, "STORY ARC", leftX, thirdRow)
  drawLabel(context, "ENTITIES / TOPICS", rightX, thirdRow)
  drawTextBlock(context, model.storyArc, leftX, thirdRow + 34, valueWidth, {
    color: "#22211d",
    font: "700 23px Arial, sans-serif",
    lineHeight: 29,
    maxLines: 2,
  })
  drawTextBlock(
    context,
    `${joinedOrFallback(model.entities)} / ${joinedOrFallback(model.topics)}`,
    rightX,
    thirdRow + 34,
    valueWidth,
    {
      color: "#22211d",
      font: "700 21px Arial, sans-serif",
      lineHeight: 27,
      maxLines: 2,
    }
  )

  drawRule(context, 1197)
  context.fillStyle = model.isFixture ? "#a83b2f" : "#8a2f93"
  context.font = "800 22px 'Courier New', monospace"
  context.fillText(model.watermark, 78, 1242)
  context.fillStyle = "#4d4a3c"
  context.font = "18px 'Courier New', monospace"
  context.fillText(`ENTRY ${model.entryId}`, 78, 1278)
  context.textAlign = "right"
  context.fillText("GENERATED LOCALLY — NO UPLOAD", 1000, 1278)
  context.textAlign = "left"

  return canvas
}

export function downloadShareReceiptPng(model: ShareReceiptModel) {
  const canvas = document.createElement("canvas")
  renderShareReceiptToCanvas(model, canvas)

  return new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("The browser could not create a PNG export."))
        return
      }

      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = getShareReceiptFileName(model)
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
      resolve()
    }, "image/png")
  })
}
