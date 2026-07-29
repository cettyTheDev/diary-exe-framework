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
        position: "relative",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#171714",
        color: "#231b25",
        padding: "64px 72px",
        fontFamily: "monospace",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "28px 34px",
          display: "flex",
          background: "#f6eadf",
          border: "3px solid #d12676",
          boxShadow: "12px 12px 0 #4f2769",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 28,
          bottom: 28,
          left: 98,
          width: 3,
          display: "flex",
          background: "#d12676",
          opacity: 0.45,
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          fontSize: 22,
        }}
      >
        <span style={{ color: "#d12676" }}>SYSTEM: FIXTURE SAFE</span>
        <span>EVIDENCE-FIRST ARCHIVE</span>
      </div>
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <span
          style={{
            color: "#4f2769",
            fontFamily: "serif",
            fontSize: 118,
            fontWeight: 800,
            letterSpacing: -8,
          }}
        >
          DIARY.EXE
        </span>
        <span style={{ color: "#d12676", fontSize: 34, letterSpacing: 8 }}>
          EVIDENCE ARCHIVE FRAMEWORK
        </span>
      </div>
      <div
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          borderTop: "2px solid #4f2769",
          paddingTop: 24,
          fontSize: 20,
        }}
      >
        <span>RECEIPTS / TIMELINE / THE BOARD / SOURCE FILES</span>
        <span style={{ color: "#d12676" }}>FIXTURE DATA ONLY</span>
      </div>
    </div>,
    size
  )
}
