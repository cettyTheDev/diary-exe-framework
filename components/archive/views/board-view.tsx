"use client"

import {
  type CSSProperties,
  type PointerEvent,
  type WheelEvent,
  useRef,
  useState,
} from "react"
import {
  Layers3Icon,
  LocateFixedIcon,
  MinusIcon,
  MoveIcon,
  NetworkIcon,
  PlusIcon,
} from "lucide-react"

import { type OpenTrace } from "@/components/archive/archive-config"
import { useArchiveQuery } from "@/components/archive/shared/use-archive-query"
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { BOARD_VIEWBOX, createBoardLayout } from "@/lib/archive/board-layout"
import { relationshipLabels } from "@/lib/archive/types"
import { readEnumParam } from "@/lib/archive/url-state"
import { archiveRepository } from "@/data/archive-repository"
import { cn } from "@/lib/utils"

const MIN_BOARD_ZOOM = 0.7
const MAX_BOARD_ZOOM = 2.4
const BOARD_ZOOM_STEP = 0.2

function clampBoardZoom(value: number) {
  return Math.min(MAX_BOARD_ZOOM, Math.max(MIN_BOARD_ZOOM, value))
}

export function BoardView({
  focusId,
  onOpenTrace,
}: {
  focusId: string | null
  onOpenTrace: OpenTrace
}) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [lensEntityId, setLensEntityId] = useState<string | null>(null)
  const dragState = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)
  const repository = archiveRepository
  const { searchParams, updateParams } = useArchiveQuery()
  const storyArcs = repository.listStoryArcs()
  const arcValues = ["all", ...storyArcs.map((arc) => arc.id)]
  const isFixture = true
  const selectedArcId = readEnumParam(searchParams, "arc", arcValues, "all")
  const allEntries = repository.listEntries()
  const scopedEntries = repository.listEntries({
    storyArcId: selectedArcId === "all" ? undefined : selectedArcId,
  })
  const entities = repository.listEntities()
  const relationships = repository.listRelationships()
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
    selectedArcId === "all" ? undefined : repository.getStoryArc(selectedArcId)
  const boardLayout = createBoardLayout(entities, relationships)
  const hubDegree = Math.max(
    0,
    ...boardLayout.nodes.map((node) => node.degree)
  )
  const lensEntity = lensEntityId
    ? repository.getEntity(lensEntityId)
    : undefined
  const lensDegree = lensEntityId
    ? (boardLayout.nodes.find((node) => node.id === lensEntityId)?.degree ?? 0)
    : 0
  const relationshipIndex = new Map(
    relationships.map((relationship, index) => [relationship.id, index + 1])
  )
  const lensRelationshipIds = new Set(
    lensEntityId
      ? relationships
          .filter(
            (relationship) =>
              relationship.sourceEntityId === lensEntityId ||
              relationship.targetEntityId === lensEntityId
          )
          .map((relationship) => relationship.id)
      : []
  )
  const lensEntityIds = new Set(
    lensEntityId
      ? [
          lensEntityId,
          ...relationships.flatMap((relationship) =>
            lensRelationshipIds.has(relationship.id)
              ? [relationship.sourceEntityId, relationship.targetEntityId]
              : []
          ),
        ]
      : []
  )

  function resetViewport() {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  function changeZoom(delta: number) {
    setZoom((current) => clampBoardZoom(current + delta))
  }

  function handleBoardWheel(event: WheelEvent<HTMLDivElement>) {
    if (!window.matchMedia("(min-width: 72rem)").matches) return
    event.preventDefault()
    changeZoom(event.deltaY > 0 ? -BOARD_ZOOM_STEP : BOARD_ZOOM_STEP)
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!window.matchMedia("(min-width: 72rem)").matches) return
    if ((event.target as HTMLElement).closest("button")) return
    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsDragging(true)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragState.current
    if (!drag || drag.pointerId !== event.pointerId) return
    setPan({
      x: drag.originX + event.clientX - drag.startX,
      y: drag.originY + event.clientY - drag.startY,
    })
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (dragState.current?.pointerId !== event.pointerId) return
    dragState.current = null
    setIsDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

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
      <Alert className="board-evidence-note">
        <NetworkIcon />
        <AlertTitle>Curated relationship board</AlertTitle>
        <AlertDescription>
          Every line is tied to an individually reviewed page citation. A line
          records the stated interaction; it does not claim influence or
          causality.{" "}
          {isFixture
            ? "All visible nodes and edges are synthetic interface fixtures."
            : "Only citation-backed relationships appear here."}
        </AlertDescription>
      </Alert>

      <div className="board-arc-toolbar" aria-label="Curated story arc scope">
        <div className="board-arc-summary">
          <Layers3Icon aria-hidden="true" />
          <div>
            <span>BOARD SCOPE</span>
            <strong>
              {selectedArc?.label ??
                (isFixture
                  ? "All evidence-safe fixtures"
                  : "All reviewed relationships")}
            </strong>
          </div>
          <Badge variant={isFixture ? "destructive" : "default"}>
            {scopedRelationships.length} EDGES / {scopedEntityIds.size} NODES
          </Badge>
        </div>
        <ToggleGroup
          className="board-arc-options"
          value={[selectedArcId]}
          onValueChange={(value) => {
            const nextArc = value[0] ?? "all"
            updateParams({
              arc: nextArc === "all" ? null : nextArc,
              focus: null,
            })
          }}
          aria-label="Filter relationship board by story arc"
        >
          <ToggleGroupItem value="all" aria-label="Show all reviewed records">
            <strong>{isFixture ? "All fixtures" : "All reviewed"}</strong>
            <span>
              {relationships.length} cited links · {entities.length} people
              &amp; groups
            </span>
          </ToggleGroupItem>
          {storyArcs.map((arc) => {
            const entries = repository.listEntries({ storyArcId: arc.id })
            const citations = new Set(
              entries.flatMap((entry) => entry.citationIds)
            )
            const edgeCount = relationships.filter((relationship) =>
              relationship.citationIds.some((id) => citations.has(id))
            ).length
            return (
              <ToggleGroupItem
                key={arc.id}
                value={arc.id}
                aria-label={`Show ${arc.label}`}
              >
                <strong>{arc.label}</strong>
                <span>
                  {edgeCount} cited links · {entries.length} entries
                </span>
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>
      </div>

      {!isFixture && relationships.length === 0 && (
        <Alert>
          <NetworkIcon />
          <AlertTitle>
            Relationship review has not published a graph yet
          </AlertTitle>
          <AlertDescription>
            {allEntries.length} approved quotations are available in Receipts
            and Timeline. This canvas stays hidden until a separate citation
            review approves at least one typed relationship.
          </AlertDescription>
        </Alert>
      )}

      {relationships.length > 0 && (
        <div className="board-canvas-shell">
          <div className="board-canvas-heading">
            <div>
              <span>RELATIONSHIP MAP</span>
              <strong>{entities.length} reviewed entities</strong>
            </div>
            <p>
              {lensEntity ? (
                <>
                  RELATIONSHIP LENS · {lensEntity.label} · {lensDegree} cited{" "}
                  {lensDegree === 1 ? "link" : "links"}
                </>
              ) : (
                <>
                  Drag to pan. Scroll to zoom. Hover a marker to isolate its
                  cited connections.
                </>
              )}
            </p>
            <div className="board-view-tools" aria-label="Map view controls">
              <MoveIcon aria-hidden="true" />
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Zoom out"
                disabled={zoom <= MIN_BOARD_ZOOM}
                onClick={() => changeZoom(-BOARD_ZOOM_STEP)}
              >
                <MinusIcon data-icon="inline-start" />
              </Button>
              <output aria-live="polite" className="board-zoom-readout">
                {Math.round(zoom * 100)}%
              </output>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Zoom in"
                disabled={zoom >= MAX_BOARD_ZOOM}
                onClick={() => changeZoom(BOARD_ZOOM_STEP)}
              >
                <PlusIcon data-icon="inline-start" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetViewport}
                disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
              >
                <LocateFixedIcon data-icon="inline-start" />
                RESET VIEW
              </Button>
            </div>
          </div>
          <div
            className={cn(
              "evidence-board",
              entities.length >= 16 && "is-dense",
              isDragging && "is-dragging"
            )}
            role="application"
            aria-label="Interactive cited relationship map"
            tabIndex={0}
            onWheel={handleBoardWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onKeyDown={(event) => {
              if (!window.matchMedia("(min-width: 72rem)").matches) return
              if (event.key === "+" || event.key === "=") {
                event.preventDefault()
                changeZoom(BOARD_ZOOM_STEP)
              } else if (event.key === "-") {
                event.preventDefault()
                changeZoom(-BOARD_ZOOM_STEP)
              } else if (event.key === "0") {
                event.preventDefault()
                resetViewport()
              } else if (event.key.startsWith("Arrow")) {
                event.preventDefault()
                const amount = 28
                setPan((current) => ({
                  x:
                    current.x +
                    (event.key === "ArrowLeft"
                      ? amount
                      : event.key === "ArrowRight"
                        ? -amount
                        : 0),
                  y:
                    current.y +
                    (event.key === "ArrowUp"
                      ? amount
                      : event.key === "ArrowDown"
                        ? -amount
                        : 0),
                }))
              }
            }}
          >
            <div
              className="board-stage"
              style={
                {
                  "--board-pan-x": `${pan.x}px`,
                  "--board-pan-y": `${pan.y}px`,
                  "--board-zoom": zoom,
                } as CSSProperties
              }
            >
              <div className="board-grid" aria-hidden="true" />
              <svg
                className="board-lines"
                viewBox={`0 0 ${BOARD_VIEWBOX.width} ${BOARD_VIEWBOX.height}`}
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {boardLayout.edges.map((edge) => {
                  const isInScope = scopedRelationships.some(
                    (relationship) => relationship.id === edge.id
                  )
                  return (
                    <path
                      key={edge.id}
                      d={edge.path}
                      className={cn(
                        selectedArcId !== "all" && !isInScope && "is-muted",
                        lensEntityId &&
                          !lensRelationshipIds.has(edge.id) &&
                          "is-deemphasized"
                      )}
                    />
                  )
                })}
              </svg>
              {boardLayout.nodes.map((node) => {
                const entity = repository.getEntity(node.id)
                if (!entity) return null
                return (
                  <button
                    key={entity.id}
                    type="button"
                    className={cn(
                      "board-node",
                      `is-kind-${entity.kind}`,
                      node.degree === hubDegree &&
                        node.degree > 1 &&
                        "is-hub",
                      focusId === entity.id && "is-focused",
                      selectedArcId !== "all" &&
                        !scopedEntityIds.has(entity.id) &&
                        "is-muted",
                      lensEntityId &&
                        !lensEntityIds.has(entity.id) &&
                        "is-deemphasized"
                    )}
                    style={
                      {
                        "--board-x": `${(node.x / BOARD_VIEWBOX.width) * 100}%`,
                        "--board-y": `${(node.y / BOARD_VIEWBOX.height) * 100}%`,
                        "--board-rotation": `${node.rotation}deg`,
                      } as CSSProperties
                    }
                    aria-pressed={focusId === entity.id}
                    onPointerEnter={() => setLensEntityId(entity.id)}
                    onPointerLeave={() => setLensEntityId(null)}
                    onFocus={() => setLensEntityId(entity.id)}
                    onBlur={() => setLensEntityId(null)}
                    onClick={() => {
                      const entry = entryForEntity(entity.id)
                      if (entry) onOpenTrace(entry.id, { focus: entity.id })
                    }}
                  >
                    <span className="board-pin" aria-hidden="true" />
                    <span className="board-node-kind">
                      {entity.kind.toUpperCase()}
                    </span>
                    <span className="board-node-degree" aria-hidden="true">
                      {String(node.degree).padStart(2, "0")}
                    </span>
                    <strong>{entity.label}</strong>
                    <small>{entity.description}</small>
                    <Badge variant="destructive">DEMO NODE</Badge>
                  </button>
                )
              })}
              {boardLayout.edges.map((edge) => {
                const relationship = relationships.find(
                  (item) => item.id === edge.id
                )
                if (!relationship) return null
                const isInScope = scopedRelationships.includes(relationship)
                return (
                  <button
                    key={relationship.id}
                    type="button"
                    className={cn(
                      "thread-label",
                      focusId === relationship.id && "is-focused",
                      selectedArcId !== "all" && !isInScope && "is-muted",
                      lensEntityId &&
                        !lensRelationshipIds.has(relationship.id) &&
                        "is-deemphasized"
                    )}
                    style={
                      {
                        "--thread-x": `${(edge.labelX / BOARD_VIEWBOX.width) * 100}%`,
                        "--thread-y": `${(edge.labelY / BOARD_VIEWBOX.height) * 100}%`,
                      } as CSSProperties
                    }
                    aria-label={`${relationshipLabels[relationship.type]} edge ${relationshipIndex.get(relationship.id)}`}
                    aria-pressed={focusId === relationship.id}
                    onClick={() => {
                      const entry = entryForCitation(
                        relationship.citationIds[0]
                      )
                      if (entry)
                        onOpenTrace(entry.id, { focus: relationship.id })
                    }}
                  >
                    {String(relationshipIndex.get(relationship.id)).padStart(
                      2,
                      "0"
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {relationships.length > 0 && (
        <section
          className="board-ledger"
          aria-label="Relationship evidence ledger"
        >
          <div className="board-ledger-heading">
            <div>
              <span>EVIDENCE LEDGER</span>
              <strong>
                {scopedRelationships.length} relationships in scope
              </strong>
            </div>
            <p>Each card resolves to its cited page and approved excerpt.</p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {scopedRelationships.map((relationship) => {
              const from = repository.getEntity(relationship.sourceEntityId)
              const to = repository.getEntity(relationship.targetEntityId)
              const citation = repository.getCitations(
                relationship.citationIds
              )[0]

              return (
                <Card
                  key={relationship.id}
                  size="sm"
                  className={cn(
                    "relationship-card",
                    focusId === relationship.id && "is-focused"
                  )}
                >
                  <CardHeader>
                    <CardTitle>
                      {String(relationshipIndex.get(relationship.id)).padStart(
                        2,
                        "0"
                      )}{" "}
                      · {relationshipLabels[relationship.type].toUpperCase()}
                    </CardTitle>
                    <CardDescription>
                      {from?.label} → {to?.label}
                    </CardDescription>
                    <CardAction>
                      <Badge variant="destructive">DEMO EDGE</Badge>
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    <p>{relationship.note}</p>
                    <p className="citation-line">
                      {citation?.label} / {isFixture ? "DEMO " : ""}PAGE{" "}
                      {citation?.pageNumbers.join(", ")} /{" "}
                      {citation?.state.toUpperCase()}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const entry = entryForCitation(
                          relationship.citationIds[0]
                        )
                        if (entry)
                          onOpenTrace(entry.id, { focus: relationship.id })
                      }}
                    >
                      OPEN CITATION
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        </section>
      )}
    </section>
  )
}
