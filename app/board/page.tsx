import type { Metadata } from "next"

import { ArchivePage } from "@/components/archive/archive-page"

export const metadata: Metadata = {
  title: "The Board",
  description: "A curated explorer for typed, cited relationships.",
}

export default function BoardPage() {
  return <ArchivePage view="board" />
}
