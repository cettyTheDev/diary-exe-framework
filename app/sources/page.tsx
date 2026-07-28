import type { Metadata } from "next"

import { ArchivePage } from "@/components/archive/archive-page"

export const metadata: Metadata = {
  title: "Source Files",
  description: "Original documents, page text, checksums, and citation state.",
}

export default function SourcesPage() {
  return <ArchivePage view="sources" />
}
