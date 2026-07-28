import { ImageResponse } from "next/og"

export const alt = "DIARY.EXE — Evidence Archive Framework"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#171714",
        color: "#f2ecd9",
        padding: "64px 72px",
        fontFamily: "monospace",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 22,
        }}
      >
        <span style={{ color: "#91dc52" }}>SYSTEM: M4 PREFLIGHT</span>
        <span>EVIDENCE-FIRST ARCHIVE</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 118, fontWeight: 800, letterSpacing: -8 }}>
          DIARY.EXE
        </span>
        <span style={{ color: "#f2e660", fontSize: 34, letterSpacing: 8 }}>
          EVIDENCE ARCHIVE FRAMEWORK
        </span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 20,
        }}
      >
        <span>RECEIPTS / TIMELINE / THE BOARD / SOURCE FILES</span>
        <span style={{ color: "#df6659" }}>FIXTURE DATA ONLY</span>
      </div>
    </div>,
    size
  )
}
