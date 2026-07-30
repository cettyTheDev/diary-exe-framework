"use client"

import Link from "next/link"
import {
  ArrowRightIcon,
  FileSearchIcon,
  ReceiptTextIcon,
  RouteIcon,
  ShieldAlertIcon,
  SparklesIcon,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  EvidenceBadge,
  formatDate,
} from "@/components/archive/shared/archive-ui"
import { SourcePageLink } from "@/components/archive/shared/source-page-link"
import { archiveRepository } from "@/data/archive-repository"
import { type ArchiveEntry } from "@/lib/archive/repository"
import { evidenceLabels, type EvidenceKind } from "@/lib/archive/types"
import { EvidenceMagazineCover } from "@/components/archive/receipts/evidence-magazine-cover"

export function ReceiptsView({
  onOpenTrace,
  onMakeReceipt,
}: {
  onOpenTrace: (id: string) => void
  onMakeReceipt: (id: string) => void
}) {
  const featuredEntries = archiveRepository.listEntries({ featured: true })
  const storyArcs = archiveRepository.listStoryArcs()
  const summary = archiveRepository.getSummary()

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <section
        id="receipt-feed"
        className="flex min-w-0 flex-col gap-5"
        aria-label="Receipt feed"
      >
        <EvidenceMagazineCover
          summary={summary}
          citationCount={archiveRepository.listCitations().length}
        />
        <div className="feed-utility">
          <span>
            {featuredEntries.length.toString().padStart(2, "0")} EDITORIAL CARDS
          </span>
          <Button variant="outline" size="sm" disabled>
            <SparklesIcon data-icon="inline-start" />
            RANDOM.EXE — SOURCE REQUIRED
          </Button>
        </div>
        {featuredEntries.map((entry, index) => (
          <ReceiptCard
            key={entry.id}
            entry={entry}
            index={index + 1}
            onOpenTrace={onOpenTrace}
            onMakeReceipt={onMakeReceipt}
          />
        ))}
      </section>
      <aside
        className="archive-status-sidebar flex flex-col gap-5"
        aria-label="Archive status"
      >
        <Card>
          <CardHeader>
            <CardTitle>Archive pulse</CardTitle>
            <CardDescription>Current local index state.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="metric-list">
              <div>
                <dt>Verified pages</dt>
                <dd>{summary.verifiedPages}</dd>
              </div>
              <div>
                <dt>Demo records</dt>
                <dd>{summary.demoRecords}</dd>
              </div>
              <div>
                <dt>Cited edges</dt>
                <dd>{summary.citedEdges}</dd>
              </div>
              <div>
                <dt>Broken refs</dt>
                <dd>{summary.brokenRefs}</dd>
              </div>
            </dl>
          </CardContent>
          <CardFooter>
            <span className="source-status">
              <span />
              SOURCE INPUT: UNRESOLVED
            </span>
          </CardFooter>
        </Card>
        <Alert>
          <ShieldAlertIcon />
          <AlertTitle>Evidence boundary</AlertTitle>
          <AlertDescription>
            Dates and pages here exercise navigation only. No statement is
            attributed to any real person or organization.
          </AlertDescription>
        </Alert>
        <Card size="sm">
          <CardHeader>
            <CardTitle>Curated story arcs</CardTitle>
            <CardDescription>
              Editorial overlays; never causal claims.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="receipt-arc-list">
              {storyArcs.map((arc) => {
                const entryCount = archiveRepository.listEntries({
                  storyArcId: arc.id,
                }).length

                return (
                  <div key={arc.id}>
                    <RouteIcon aria-hidden="true" />
                    <div>
                      <strong>{arc.label}</strong>
                      <span>{entryCount} fixture records</span>
                    </div>
                    <Button
                      render={<Link href={`/timeline?arc=${arc.id}`} />}
                      nativeButton={false}
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Open ${arc.label} in timeline`}
                    >
                      <ArrowRightIcon />
                      <span className="sr-only">
                        Open {arc.label} in timeline
                      </span>
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle>Evidence legend</CardTitle>
            <CardDescription>
              Labels remain attached in every view.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(evidenceLabels) as EvidenceKind[]).map((kind) => (
                <EvidenceBadge key={kind} kind={kind} />
              ))}
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}

function ReceiptCard({
  entry,
  index,
  onOpenTrace,
  onMakeReceipt,
}: {
  entry: ArchiveEntry
  index: number
  onOpenTrace: (id: string) => void
  onMakeReceipt: (id: string) => void
}) {
  const entities = archiveRepository.getEntities(entry.entityIds)
  const arc = archiveRepository.getStoryArcs(entry.storyArcIds)[0]

  return (
    <Card className="receipt-card">
      <CardHeader>
        <div className="receipt-sequence" aria-hidden="true">
          R-{index.toString().padStart(3, "0")}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="receipt-date">{formatDate(entry)}</span>
          <EvidenceBadge kind={entry.evidenceKind} />
        </div>
        <CardTitle>{entry.title}</CardTitle>
        <CardDescription>
          {entities.length > 0
            ? entities.map((entity) => entity.label).join(" / ")
            : "No entity assigned"}
        </CardDescription>
        <CardAction>
          <span className="demo-stamp">DEMO</span>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="receipt-body">
          <p className="receipt-copy">{entry.exactText}</p>
          <p>{entry.context}</p>
        </div>
        <div className="receipt-meta">
          <span>STORY: {arc?.label ?? "UNASSIGNED"}</span>
          <span>SOURCE PAGE: DEMO {entry.sourcePages.join(", ")}</span>
        </div>
      </CardContent>
      <CardFooter className="flex-wrap justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {entry.topicIds.map((id) => (
            <Badge key={id} variant="secondary">
              {archiveRepository.getTopic(id)?.label}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <SourcePageLink
            pageNumber={entry.sourcePages[0]}
            isFixture={entry.isFixture}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenTrace(entry.id)}
          >
            <FileSearchIcon data-icon="inline-start" />
            OPEN TRACE
          </Button>
          <Button size="sm" onClick={() => onMakeReceipt(entry.id)}>
            <ReceiptTextIcon data-icon="inline-start" />
            MAKE RECEIPT
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
