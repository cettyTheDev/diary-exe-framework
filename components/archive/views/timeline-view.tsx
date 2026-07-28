"use client"

import { ArrowRightIcon, SearchIcon, SearchXIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  ArchiveSelect,
  arcFilterItems,
  DemoFlag,
  entityFilterItems,
  EvidenceBadge,
  evidenceFilterItems,
  formatDate,
  topicFilterItems,
} from "@/components/archive/shared/archive-ui"
import { useArchiveQuery } from "@/components/archive/shared/use-archive-query"
import { archiveRepository } from "@/data/archive-repository"
import { type EvidenceKind } from "@/lib/archive/types"
import { readEnumParam } from "@/lib/archive/url-state"
import { cn } from "@/lib/utils"

const evidenceValues = evidenceFilterItems.map((item) => item.value)
const entityValues = entityFilterItems.map((item) => item.value)
const topicValues = topicFilterItems.map((item) => item.value)
const arcValues = arcFilterItems.map((item) => item.value)
const densityValues = ["readable", "dense"] as const

export function TimelineView({
  onOpenTrace,
}: {
  onOpenTrace: (id: string) => void
}) {
  const { searchParams, updateParams } = useArchiveQuery()
  const query = searchParams.get("q") ?? ""
  const evidence = readEnumParam(
    searchParams,
    "evidence",
    evidenceValues,
    "all"
  )
  const entity = readEnumParam(searchParams, "entity", entityValues, "all")
  const topic = readEnumParam(searchParams, "topic", topicValues, "all")
  const arc = readEnumParam(searchParams, "arc", arcValues, "all")
  const density = readEnumParam(
    searchParams,
    "density",
    densityValues,
    "readable"
  )
  const summary = archiveRepository.getSummary()

  const filtered = archiveRepository.listEntries({
    text: query,
    evidenceKind: evidence === "all" ? undefined : (evidence as EvidenceKind),
    entityId: entity === "all" ? undefined : entity,
    topicId: topic === "all" ? undefined : topic,
    storyArcId: arc === "all" ? undefined : arc,
  })

  function clearFilters() {
    updateParams({
      arc: null,
      entity: null,
      evidence: null,
      q: null,
      topic: null,
    })
  }

  return (
    <section className="flex flex-col gap-5" aria-label="Timeline records">
      <Card>
        <CardHeader>
          <CardTitle>Query the local index</CardTitle>
          <CardDescription>
            Fixture-only search. Future full-text search remains server-side.
          </CardDescription>
          <CardAction>
            <DemoFlag />
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="timeline-filters">
            <label className="search-control">
              <span className="sr-only">Search title, text, and context</span>
              <SearchIcon aria-hidden="true" />
              <Input
                value={query}
                onChange={(event) =>
                  updateParams({ q: event.target.value || null }, "replace")
                }
                placeholder="Search title, text, context…"
              />
            </label>
            <ArchiveSelect
              label="Evidence label"
              items={evidenceFilterItems}
              value={evidence}
              onChange={(value) =>
                updateParams({ evidence: value === "all" ? null : value })
              }
            />
            <ArchiveSelect
              label="Person or organization"
              items={entityFilterItems}
              value={entity}
              onChange={(value) =>
                updateParams({ entity: value === "all" ? null : value })
              }
            />
            <ArchiveSelect
              label="Topic"
              items={topicFilterItems}
              value={topic}
              onChange={(value) =>
                updateParams({ topic: value === "all" ? null : value })
              }
            />
            <ArchiveSelect
              label="Story arc"
              items={arcFilterItems}
              value={arc}
              onChange={(value) =>
                updateParams({ arc: value === "all" ? null : value })
              }
            />
          </div>
        </CardContent>
        <CardFooter className="flex-wrap justify-between gap-3">
          <span aria-live="polite">
            {filtered.length} OF {summary.entryCount} DEMO RECORDS
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <ToggleGroup
              variant="outline"
              size="sm"
              value={[density]}
              onValueChange={(value) =>
                value[0] &&
                updateParams({
                  density: value[0] === "readable" ? null : value[0],
                })
              }
              aria-label="Timeline density"
            >
              <ToggleGroupItem value="readable">READABLE</ToggleGroupItem>
              <ToggleGroupItem value="dense">DENSE</ToggleGroupItem>
            </ToggleGroup>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              CLEAR FILTERS
            </Button>
          </div>
        </CardFooter>
      </Card>

      {filtered.length === 0 ? (
        <Alert>
          <SearchXIcon />
          <AlertTitle>NO RECEIPTS FOUND</AlertTitle>
          <AlertDescription>
            No fixture matches this query. Clear the filters to restore the demo
            index.
          </AlertDescription>
        </Alert>
      ) : (
        <div className={cn("timeline-list", density === "dense" && "is-dense")}>
          {filtered.map((entry, index) => (
            <article key={entry.id} className="timeline-row">
              <div className="timeline-rail" aria-hidden="true">
                <span>{(index + 1).toString().padStart(2, "0")}</span>
              </div>
              <div className="timeline-date-block">
                <strong>{formatDate(entry)}</strong>
                <span>PRECISION: {entry.datePrecision.toUpperCase()}</span>
              </div>
              <div className="timeline-entry-copy">
                <div className="flex flex-wrap items-center gap-2">
                  <EvidenceBadge kind={entry.evidenceKind} />
                  <DemoFlag />
                </div>
                <h2>{entry.title}</h2>
                <p>
                  {density === "dense"
                    ? entry.context
                    : `${entry.exactText} ${entry.context}`}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenTrace(entry.id)}
              >
                OPEN TRACE
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </article>
          ))}
        </div>
      )}

      <div className="pagination-note">
        <span>PAGE 01 / 01</span>
        <span>Pagination boundary ready for server-backed corpus queries.</span>
      </div>
    </section>
  )
}
