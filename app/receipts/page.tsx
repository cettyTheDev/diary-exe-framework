import type { Metadata } from "next"

import { ArchivePage } from "@/components/archive/archive-page"

export const metadata: Metadata = {
  title: "Receipts",
  description: "Editorial discovery cards with source context attached.",
}

export default function ReceiptsPage() {
  return <ArchivePage view="receipts" />
}
