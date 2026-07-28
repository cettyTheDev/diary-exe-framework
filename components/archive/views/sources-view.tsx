"use client"

import {
  ArrowRightIcon,
  BoxIcon,
  FileSearchIcon,
  FolderOpenIcon,
  ShieldAlertIcon,
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
import { sourceReadiness } from "@/components/archive/archive-config"
import { M2PipelinePanel } from "@/components/archive/sources/m2-pipeline-panel"
import { M4ReadinessPanel } from "@/components/archive/sources/m4-readiness-panel"
import { DemoFlag, EvidenceBadge } from "@/components/archive/shared/archive-ui"
import { useArchiveQuery } from "@/components/archive/shared/use-archive-query"
import { archiveRepository } from "@/data/archive-repository"
import { readPositiveIntParam } from "@/lib/archive/url-state"

export function SourcesView({
  onOpenTrace,
}: {
  onOpenTrace: (id: string) => void
}) {
  const { searchParams, updateParams } = useArchiveQuery()
  const source = archiveRepository.listSources()[0]
  const pages = archiveRepository.listPages(source.id)
  const pageNumbers = pages.map((item) => item.pageNumber)
  const pageNumber = readPositiveIntParam(searchParams, "page", pageNumbers, 1)
  const page = archiveRepository.getPage(source.id, pageNumber)
  const entry = archiveRepository.getEntriesForPage(source.id, pageNumber)[0]

  return (
    <section className="source-browser" aria-label="Source file browser">
      <aside className="source-sidebar">
        <div className="source-folder-title">
          <FolderOpenIcon aria-hidden="true" />
          <div>
            <span>MANIFEST / 01 FILE</span>
            <strong>LOCAL SOURCE VAULT</strong>
          </div>
        </div>
        <button type="button" className="source-file is-selected">
          <FileSearchIcon aria-hidden="true" />
          <span>
            <strong>{source.fileName}</strong>
            <small>
              {source.status.toUpperCase()} / {source.version}
            </small>
          </span>
        </button>
        <div className="source-pages">
          <span>DEMO PAGE INDEX</span>
          <div className="flex flex-wrap gap-2">
            {pages.map((item) => (
              <Button
                key={item.id}
                variant={item.pageNumber === pageNumber ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  updateParams({
                    page: item.pageNumber === 1 ? null : item.pageNumber,
                  })
                }
              >
                {item.pageNumber.toString().padStart(3, "0")}
              </Button>
            ))}
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-col gap-5">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <DemoFlag />
              <Badge variant="destructive">CHECKSUM NOT AVAILABLE</Badge>
            </div>
            <CardTitle>{source.title}</CardTitle>
            <CardDescription>
              File: {source.fileName} · Version: {source.version} · Status:{" "}
              {source.status}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <ShieldAlertIcon />
              <AlertTitle>No original document is present</AlertTitle>
              <AlertDescription>
                This manifest proves the UI path, not provenance. “View source
                page” remains unavailable until intake inventory records a real
                file and checksum.
              </AlertDescription>
            </Alert>
            <div className="ingestion-readiness">
              <div className="ingestion-readiness-header">
                <div>
                  <span className="trace-label">M2 / INTAKE GATE</span>
                  <strong>Source readiness</strong>
                </div>
                <Badge variant="destructive">1 / 4 READY</Badge>
              </div>
              <ol aria-label="M2 source readiness checks">
                {sourceReadiness.map((item, index) => (
                  <li key={item.label}>
                    <span className="readiness-index">
                      {(index + 1).toString().padStart(2, "0")}
                    </span>
                    <div>
                      <strong>{item.label}</strong>
                      <small>{item.note}</small>
                    </div>
                    <Badge
                      variant={
                        item.state === "READY" ? "default" : "destructive"
                      }
                    >
                      {item.state}
                    </Badge>
                  </li>
                ))}
              </ol>
            </div>
          </CardContent>
        </Card>
        <M4ReadinessPanel />
        <M2PipelinePanel />
        <div className="source-page-layout">
          <div className="paper-preview">
            <div className="paper-header">
              <span>DEMO PAGE {pageNumber.toString().padStart(3, "0")}</span>
              <span>NOT AN ORIGINAL</span>
            </div>
            <div className="paper-content">
              <BoxIcon aria-hidden="true" />
              <strong>SOURCE PAGE PLACEHOLDER</strong>
              <p>No page image has been imported.</p>
              <span>AUTHORITATIVE FILE REQUIRED</span>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Extracted text / page {pageNumber}</CardTitle>
              <CardDescription>
                Extraction kind: {page?.extractionKind ?? "none"} · Confidence:
                not measured
              </CardDescription>
              <CardAction>
                <EvidenceBadge kind="unresolved" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="extracted-text">{page?.extractedText}</div>
              <dl className="source-metadata">
                <div>
                  <dt>Source ID</dt>
                  <dd>{source.id}</dd>
                </div>
                <div>
                  <dt>Page record</dt>
                  <dd>{page?.id}</dd>
                </div>
                <div>
                  <dt>Checksum</dt>
                  <dd>NOT COMPUTED</dd>
                </div>
                <div>
                  <dt>Citation state</dt>
                  <dd>DEMO / UNRESOLVED</dd>
                </div>
              </dl>
            </CardContent>
            <CardFooter className="flex-wrap justify-between gap-3">
              <Button variant="outline" size="sm" disabled>
                VIEW SOURCE PAGE — UNAVAILABLE
              </Button>
              {entry && (
                <Button size="sm" onClick={() => onOpenTrace(entry.id)}>
                  OPEN LINKED TRACE
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  )
}
