export function singlePageTextPdf(text = "Hello pilot page") {
  const content = `BT /F1 12 Tf 72 100 Td (${text.replace(/[()\\]/g, "\\$&")}) Tj ET`
  const header = "%PDF-1.4\n"
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream\nendobj\n`,
  ]
  const offsets: number[] = []
  let body = header
  for (const object of objects) {
    offsets.push(Buffer.byteLength(body))
    body += object
  }
  const xrefOffset = Buffer.byteLength(body)
  const entries = offsets
    .map((offset) => `${offset.toString().padStart(10, "0")} 00000 n \n`)
    .join("")
  return `${body}xref\n0 6\n0000000000 65535 f \n${entries}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
}

export async function singlePageImagePdf(text: string) {
  const { createCanvas, loadImage, PDFDocument } =
    await import("@napi-rs/canvas")
  const canvas = createCanvas(900, 300)
  const context = canvas.getContext("2d")
  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, canvas.width, canvas.height)
  if (text) {
    context.fillStyle = "#000000"
    context.font = "bold 54px sans-serif"
    context.fillText(text, 44, 170)
  }
  const image = await loadImage(canvas.toBuffer("image/png"))
  const document = new PDFDocument({ title: "Synthetic image-only OCR test" })
  const page = document.beginPage(canvas.width, canvas.height)
  const imagePage = page as unknown as {
    drawImage(
      imageValue: typeof image,
      x: number,
      y: number,
      width: number,
      height: number
    ): void
  }
  imagePage.drawImage(image, 0, 0, canvas.width, canvas.height)
  document.endPage()
  return document.close()
}
