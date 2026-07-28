"use client"

import dynamic from "next/dynamic"
import { usePathname, useSearchParams } from "next/navigation"

import {
  type OpenTrace,
  type ArchiveView,
} from "@/components/archive/archive-config"
import { ArchiveShell } from "@/components/archive/archive-shell"
import { TraceSheet } from "@/components/archive/trace/trace-sheet"
import { BoardView } from "@/components/archive/views/board-view"
import { ReceiptsView } from "@/components/archive/views/receipts-view"
import { SourcesView } from "@/components/archive/views/sources-view"
import { TimelineView } from "@/components/archive/views/timeline-view"
import { archiveRepository } from "@/data/archive-repository"
import { createShareReceiptModel } from "@/lib/archive/share-receipt"
import { withArchiveParams } from "@/lib/archive/url-state"

export type { ArchiveView } from "@/components/archive/archive-config"

const ReceiptComposerSheet = dynamic(
  () =>
    import("@/components/archive/receipts/receipt-composer-sheet").then(
      (module) => module.ReceiptComposerSheet
    ),
  { ssr: false }
)

export function ArchiveApp({ view }: { view: ArchiveView }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const traceId = searchParams.get("trace")
  const receiptId = searchParams.get("receipt")
  const selectedEntry = traceId
    ? archiveRepository.getEntry(traceId)
    : undefined
  const receiptEntry = receiptId
    ? archiveRepository.getEntry(receiptId)
    : undefined
  const receiptSource = receiptEntry
    ? archiveRepository.getSource(receiptEntry.sourceId)
    : undefined
  const receiptModel =
    receiptEntry && receiptSource
      ? createShareReceiptModel({
          entry: receiptEntry,
          source: receiptSource,
          citations: archiveRepository.getCitations(receiptEntry.citationIds),
          entities: archiveRepository.getEntities(receiptEntry.entityIds),
          topics: archiveRepository.getTopics(receiptEntry.topicIds),
          storyArc: archiveRepository.getStoryArcs(receiptEntry.storyArcIds)[0],
        })
      : undefined

  const openTrace: OpenTrace = (id, updates = {}) => {
    window.history.pushState(
      null,
      "",
      withArchiveParams(pathname, searchParams, {
        receipt: null,
        trace: id,
        ...updates,
      })
    )
  }

  function closeTrace() {
    window.history.pushState(
      null,
      "",
      withArchiveParams(pathname, searchParams, { trace: null })
    )
  }

  function openReceipt(id: string) {
    window.history.pushState(
      null,
      "",
      withArchiveParams(pathname, searchParams, {
        receipt: id,
        trace: null,
      })
    )
  }

  function closeReceipt() {
    window.history.pushState(
      null,
      "",
      withArchiveParams(pathname, searchParams, { receipt: null })
    )
  }

  return (
    <>
      <ArchiveShell view={view}>
        {view === "receipts" && (
          <ReceiptsView onOpenTrace={openTrace} onMakeReceipt={openReceipt} />
        )}
        {view === "timeline" && <TimelineView onOpenTrace={openTrace} />}
        {view === "board" && (
          <BoardView
            focusId={searchParams.get("focus")}
            onOpenTrace={openTrace}
          />
        )}
        {view === "sources" && <SourcesView onOpenTrace={openTrace} />}
      </ArchiveShell>
      <TraceSheet entry={selectedEntry} onClose={closeTrace} />
      {receiptModel && (
        <ReceiptComposerSheet
          key={receiptModel.id}
          model={receiptModel}
          onClose={closeReceipt}
        />
      )}
    </>
  )
}
