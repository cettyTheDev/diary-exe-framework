import type { Metadata } from "next"

import { ArchivePage } from "@/components/archive/archive-page"

export const metadata: Metadata = {
  title: "Timeline",
  description: "Search and filter the complete chronological archive spine.",
}

export default function TimelinePage() {
  return <ArchivePage view="timeline" />
}
