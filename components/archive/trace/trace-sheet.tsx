"use client"

import Link from "next/link"
import { CalendarDaysIcon, FolderOpenIcon, NetworkIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  DemoFlag,
  EvidenceBadge,
  formatDate,
} from "@/components/archive/shared/archive-ui"
import { archiveRepository } from "@/data/archive-repository"
import { type ArchiveEntry } from "@/lib/archive/repository"
import { evidenceLabels } from "@/lib/archive/types"

export function TraceSheet({
  entry,
  onClose,
}: {
  entry?: ArchiveEntry
  onClose: () => void
}) {
  const source = entry ? archiveRepository.getSource(entry.sourceId) : undefined
  const entities = entry ? archiveRepository.getEntities(entry.entityIds) : []
  const citations = entry
    ? archiveRepository.getCitations(entry.citationIds)
    : []

  return (
    <Sheet open={Boolean(entry)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {entry && (
          <>
            <SheetHeader>
              <div className="flex flex-wrap items-center gap-2 pr-10">
                <EvidenceBadge kind={entry.evidenceKind} />
                <DemoFlag />
              </div>
              <SheetTitle>{entry.title}</SheetTitle>
              <SheetDescription>
                {formatDate(entry)} · Precision {entry.datePrecision} ·{" "}
                {entry.id}
              </SheetDescription>
            </SheetHeader>
            <div className="trace-content">
              <section>
                <span className="trace-label">
                  {evidenceLabels[entry.evidenceKind]}
                </span>
                <blockquote>{entry.exactText}</blockquote>
                <p>{entry.context}</p>
              </section>
              <Separator />
              <section>
                <span className="trace-label">
                  SOURCE DOCUMENT / EXACT PAGE
                </span>
                <dl className="trace-grid">
                  <div>
                    <dt>Document</dt>
                    <dd>{source?.title}</dd>
                  </div>
                  <div>
                    <dt>Page</dt>
                    <dd>DEMO {entry.sourcePages.join(", ")}</dd>
                  </div>
                  <div>
                    <dt>Version</dt>
                    <dd>{source?.version}</dd>
                  </div>
                  <div>
                    <dt>Checksum</dt>
                    <dd>NOT COMPUTED</dd>
                  </div>
                </dl>
                <Button
                  render={<Link href={`/sources?trace=${entry.id}`} />}
                  nativeButton={false}
                  variant="outline"
                >
                  <FolderOpenIcon data-icon="inline-start" />
                  OPEN SOURCE FILES
                </Button>
              </section>
              <Separator />
              <section>
                <span className="trace-label">
                  PEOPLE / ORGANIZATIONS / TOPICS
                </span>
                <div className="flex flex-wrap gap-2">
                  {entities.length > 0 ? (
                    entities.map((entity) => (
                      <Badge key={entity.id} variant="secondary">
                        {entity.label}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline">NO ENTITY ASSIGNED</Badge>
                  )}
                  {entry.topicIds.map((id) => (
                    <Badge key={id} variant="outline">
                      {archiveRepository.getTopic(id)?.label}
                    </Badge>
                  ))}
                </div>
              </section>
              <Separator />
              <section>
                <span className="trace-label">CITATIONS</span>
                <div className="flex flex-col gap-3">
                  {citations.map((citation) => (
                    <div key={citation.id} className="trace-citation">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong>{citation.label}</strong>
                        <Badge variant="destructive">
                          {citation.state.toUpperCase()}
                        </Badge>
                      </div>
                      <p>{citation.note}</p>
                    </div>
                  ))}
                </div>
              </section>
              <Separator />
              <section>
                <span className="trace-label">SURROUNDING CONTEXT</span>
                <p>
                  Adjacent fixture records remain visible in the timeline. No
                  surrounding diary text exists until a source is imported.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    render={<Link href={`/timeline?trace=${entry.id}`} />}
                    nativeButton={false}
                  >
                    <CalendarDaysIcon data-icon="inline-start" />
                    OPEN IN TIMELINE
                  </Button>
                  <Button
                    render={<Link href={`/board?trace=${entry.id}`} />}
                    nativeButton={false}
                    variant="outline"
                  >
                    <NetworkIcon data-icon="inline-start" />
                    OPEN ON BOARD
                  </Button>
                </div>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
