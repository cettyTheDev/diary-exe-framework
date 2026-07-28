import type { Metadata, Viewport } from "next"

import "./globals.css"

const vercelHost =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL

export const metadata: Metadata = {
  metadataBase: new URL(
    vercelHost ? `https://${vercelHost}` : "http://localhost:3000"
  ),
  title: {
    default: "DIARY.EXE — Evidence Archive Framework",
    template: "%s / DIARY.EXE",
  },
  description:
    "An evidence-first archive framework with synthetic fixtures and fail-closed source authorization.",
  applicationName: "DIARY.EXE",
  openGraph: {
    type: "website",
    siteName: "DIARY.EXE",
    title: "DIARY.EXE — Evidence Archive Framework",
    description:
      "Receipts, timeline, cited relationships, and source files—without separating claims from their evidence trail.",
  },
  twitter: {
    card: "summary_large_image",
    title: "DIARY.EXE — Evidence Archive Framework",
    description:
      "An evidence-first archive browser. M4 preflight and fixture data only.",
  },
}

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#171714",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  )
}
