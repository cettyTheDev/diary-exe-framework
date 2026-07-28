import { Suspense } from "react"

import { ArchiveApp, type ArchiveView } from "@/components/archive/archive-app"
import { ArchiveLoading } from "@/components/archive/archive-loading"

export function ArchivePage({ view }: { view: ArchiveView }) {
  return (
    <Suspense fallback={<ArchiveLoading />}>
      <ArchiveApp view={view} />
    </Suspense>
  )
}
