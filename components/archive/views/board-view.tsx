"use client"

import { Layers3Icon, NetworkIcon } from "lucide-react"
import type { CSSProperties } from "react"

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
import { type OpenTrace } from "@/components/archive/archive-config"
import { useArchiveQuery } from "@/components/archive/shared/use-archive-query"
import { archiveRepository } from "@/data/archive-repository"
import { BOARD_VIEWBOX, createBoardLayout } from "@/lib/archive/board-layout"
import { relationshipLabels } from "@/lib/archive/types"
import { readEnumParam } from "@/lib/archive/url-state"
import { cn } from "@/lib/utils"

const arcValues = [
  "all",
  ...archiveRepository.listStoryArcs().map((arc) => arc.id),
]

export function BoardView({
  focusId,
  onOpenTrace,
}: {
  focusId: string | null
  onOpenTrace: OpenTrace
}) {
  const { searchParams, updateParams } = useArchiveQuery()
  const selectedArcId = readEnumParam(searchParams, "arc", arcValues, "all")
  const allEntries = archiveRepository.listEntries()
  const scopedEntries = archiveRepository.listEntries({
    storyArcId: selectedArcId === "all" ? undefined : selectedArcId,
  })
  const entities = archiveRepository.listEntities()
  const relationships = archiveRepository.listRelationships()
  const storyArcs = archiveRepository.listStoryArcs()
  const boardLayout = createBoardLayout(entities, relationships)
  const scopedCitationIds = new Set(
    scopedEntries.flatMap((entry) => entry.citationIds)
  )
  const scopedRelationships = relationships.filter(
    (relationship) =>
      selectedArcId === "all" ||
      relationship.citationIds.some((id) => scopedCitationIds.has(id))
  )
  const scopedEntityIds = new Set([
    ...scopedEntries.flatMap((entry) => entry.entityIds),
    ...scopedRelationships.flatMap((relationship) => [
      relationship.sourceEntityId,
      relationship.targetEntityId,
    ]),
  ])
  const selectedArc =
    selectedArcId === "all"
      ? undefined
      : archiveRepository.getStoryArc(selectedArcId)

  function entryForEntity(entityId: string) {
    return (
      scopedEntries.find((entry) => entry.entityIds.includes(entityId)) ??
      allEntries.find((entry) => entry.entityIds.includes(entityId)) ??
      allEntries[0]
    )
  }

  function entryForCitation(citationId: string) {
    return (
      scopedEntries.find((entry) => entry.citationIds.includes(citationId)) ??
      allEntries.find((entry) => entry.citationIds.includes(citationId)) ??
      allEntries[0]
    )
  }

  return (
    <section className="flex flex-col gap-6" aria-label="Relationship board">
      <Alert>
        <NetworkIcon />
        <AlertTitle>Curated relationship board</AlertTitle>
        <AlertDescription>
          Evidence-safe means every line has an individually reviewed page
          citation. A line records the stated interaction; it never claims
          influence or causality. All visible nodes and edges are synthetic
          interface fixtures.
        </AlertDescription>
      </Alert>
      <div className="board-arc-toolbar" aria-label="Curated story arc scope">
        <div className="board-arc-summary">
          <Layers3Icon aria-hidden="true" />
          <div>
            <span>BOARD SCOPE</span>
            <strong>
              {selectedArc?.label ?? "All evidence-safe fixtures"}
            </strong>
          </div>
          <Badge variant="destructive">
            {scopedEntries.length} DEMO RECORDS
          </Badge>
        </div>
        <div className="board-arc-options">
          <button
            type="button"
            className={cn(selectedArcId === "all" && "is-active")}
            aria-pressed={selectedArcId === "all"}
            onClick={() => updateParams({ arc: null, focus: null })}
          >
            <strong>All fixtures</strong>
            <span>{allEntries.length} records / complete demo graph</span>
          </button>
          {storyArcs.map((arc) => {
            const entries = archiveRepository.listEntries({
              storyArcId: arc.id,
            })
            return (
              <button
                key={arc.id}
                type="button"
                className={cn(selectedArcId === arc.id && "is-active")}
                aria-pressed={selectedArcId === arc.id}
                onClick={() => updateParams({ arc: arc.id, focus: null })}
              >
                <strong>{arc.label}</strong>
                <span>{entries.length} records / editorial overlay</span>
              </button>
            )
          })}
        </div>
      </div>
      <div
        className={cn(
          "evidence-board",
          entities.length >= 16 && "is-dense"
        )}
      >
        <div className="board-grid" aria-hidden="true" />
        <svg
          className="board-lines"
          viewBox={`0 0 ${BOARD_VIEWBOX.width} ${BOARD_VIEWBOX.height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {boardLayout.edges.map((edge) => (
            <path
              key={edge.id}
              d={edge.path}
              className={
                selectedArcId !== "all" &&
                !scopedRelationships.some(
                  (relationship) => relationship.id === edge.id
                )
                  ? "is-muted"
                  : undefined
              }
            />
          ))}
        </svg>
        {boardLayout.nodes.map((node) => {
          const entity = archiveRepository.getEntity(node.id)
          if (!entity) return null
          return (
            <button
              key={entity.id}
              type="button"
              className={cn(
                "board-node",
                focusId === entity.id && "is-focused",
                selectedArcId !== "all" &&
                  !scopedEntityIds.has(entity.id) &&
                  "is-muted"
              )}
              style={
                {
                  "--board-x": `${(node.x / BOARD_VIEWBOX.width) * 100}%`,
                  "--board-y": `${(node.y / BOARD_VIEWBOX.height) * 100}%`,
                  "--board-rotation": `${node.rotation}deg`,
                } as CSSProperties
              }
              aria-pressed={focusId === entity.id}
              onClick={() =>
                onOpenTrace(entryForEntity(entity.id).id, { focus: entity.id })
              }
            >
              <span className="board-pin" aria-hidden="true" />
              <span className="board-node-kind">
                {entity.kind.toUpperCase()} · {node.degree} LINKS
              </span>
              <strong>{entity.label}</strong>
              <small>{entity.description}</small>
              <Badge variant="destructive">DEMO NODE</Badge>
            </button>
          )
        })}
        {boardLayout.edges.map((edge, index) => {
          const relationship = relationships.find((item) => item.id === edge.id)
          if (!relationship) return null
          return (
            <button
              key={relationship.id}
              type="button"
              className={cn(
                "thread-label",
                focusId === relationship.id && "is-focused",
                selectedArcId !== "all" &&
                  !scopedRelationships.includes(relationship) &&
                  "is-muted"
              )}
              style={
                {
                  "--thread-x": `${(edge.labelX / BOARD_VIEWBOX.width) * 100}%`,
                  "--thread-y": `${(edge.labelY / BOARD_VIEWBOX.height) * 100}%`,
                } as CSSProperties
              }
              aria-label={`${relationshipLabels[relationship.type]} edge ${index + 1}`}
              aria-pressed={focusId === relationship.id}
              onClick={() =>
                onOpenTrace(entryForCitation(relationship.citationIds[0]).id, {
                  focus: relationship.id,
                })
              }
            >
              {String(index + 1).padStart(2, "0")}
            </button>
          )
        })}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {relationships.map((relationship) => {
          const from = archiveRepository.getEntity(relationship.sourceEntityId)
          const to = archiveRepository.getEntity(relationship.targetEntityId)
          const citation = archiveRepository.getCitations(
            relationship.citationIds
          )[0]
          const isInScope =
            selectedArcId === "all" ||
            scopedRelationships.includes(relationship)

          return (
            <Card
              key={relationship.id}
              size="sm"
              className={cn(
                "relationship-card",
                focusId === relationship.id && "is-focused",
                !isInScope && "is-muted"
              )}
            >
              <CardHeader>
                <CardTitle>
                  {relationshipLabels[relationship.type].toUpperCase()}
                </CardTitle>
                <CardDescription>
                  {from?.label} → {to?.label}
                </CardDescription>
                <CardAction>
                  <Badge
                    variant={relationship.isEditorial ? "outline" : "secondary"}
                  >
                    {relationship.isEditorial ? "EDITORIAL" : "TYPED EDGE"}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent>
                <p>{relationship.note}</p>
                <p className="citation-line">
                  {citation?.label} / DEMO PAGE{" "}
                  {citation?.pageNumbers.join(", ")}
                  {" / "}
                  {citation?.state.toUpperCase()}
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onOpenTrace(
                      entryForCitation(relationship.citationIds[0]).id,
                      { focus: relationship.id }
                    )
                  }
                >
                  OPEN CITATION
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
