"use client"

import { type CSSProperties, useEffect } from "react"
import {
  ArrowRightIcon,
  BoxIcon,
  FileSearchIcon,
  FolderOpenIcon,
  ScanLineIcon,
  ShieldAlertIcon,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

  useEffect(() => {
    if (window.location.hash !== "#page-review") return

    const frame = window.requestAnimationFrame(() => {
      document.getElementById("page-review")?.scrollIntoView({ block: "start" })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [pageNumber])

  function selectPage(nextPage: number) {
    updateParams({ page: nextPage === 1 ? null : nextPage })
  }

  return (
    <section className="source-browser" aria-label="Source file browser">
      <header className="source-dossier">
        <div className="source-dossier-spine" aria-hidden="true">
          <FolderOpenIcon />
          <span>FILE 01</span>
        </div>
        <div className="source-dossier-copy">
          <div className="source-dossier-badges">
            <DemoFlag />
            <Badge variant="destructive">IDENTITY PENDING</Badge>
          </div>
          <span className="source-dossier-kicker">LOCAL SOURCE VAULT</span>
          <h2>{source.title}</h2>
          <p>
            <FileSearchIcon aria-hidden="true" />
            {source.fileName} · {source.version}
          </p>
        </div>
        <dl className="source-dossier-metrics">
          <div>
            <dt>Indexed</dt>
            <dd>{pages.length}</dd>
            <span>PAGES</span>
          </div>
          <div>
            <dt>Demo</dt>
            <dd>{pages.length}</dd>
            <span>PAGES</span>
          </div>
          <div>
            <dt>Selected</dt>
            <dd>{pageNumber.toString().padStart(3, "0")}</dd>
            <span>PAGE</span>
          </div>
        </dl>
      </header>

      <nav
        id="source-map"
        className="source-contact-map"
        aria-label="Demo source pages"
      >
        <div className="source-contact-heading">
          <div>
            <span className="trace-label">DEMO PAGES WITH FIXTURE LINKS</span>
            <strong>{pages.length} synthetic pages demonstrate the path</strong>
          </div>
          <span>DEMO INTERACTION / NO SOURCE CLAIM</span>
        </div>
        <p className="source-contact-explainer">
          Each bar is a synthetic page position. It demonstrates navigation only
          and makes no source claim.
        </p>
        <div className="source-volume-strip">
          {pages.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={
                item.pageNumber === pageNumber ? "is-active" : undefined
              }
              onClick={() => selectPage(item.pageNumber)}
              aria-label={`Demo page ${item.pageNumber}`}
              aria-current={
                item.pageNumber === pageNumber ? "location" : undefined
              }
              title={`Synthetic page position ${item.pageNumber}; no source claim`}
              style={{ "--source-density": "72%" } as CSSProperties}
            >
              <i aria-hidden="true" />
              <b>{String(index + 1).padStart(2, "0")}</b>
              <span>DEMO</span>
            </button>
          ))}
        </div>
        <div className="source-volume-legend" aria-hidden="true">
          <span>DEMO 001</span>
          <i />
          <span>DEMO {pages.length.toString().padStart(3, "0")}</span>
        </div>
        <div className="source-frame-heading">
          <span>{pages.length} DEMO PAGES</span>
        </div>
        <div className="source-frame-strip">
          {pages.map((item) => (
            <Button
              key={item.id}
              variant="outline"
              className={item.pageNumber === pageNumber ? "is-active" : ""}
              onClick={() => selectPage(item.pageNumber)}
              aria-current={item.pageNumber === pageNumber ? "page" : undefined}
            >
              <span>DEMO PAGE</span>
              <strong>{item.pageNumber.toString().padStart(3, "0")}</strong>
              <small>SOURCE REQUIRED</small>
            </Button>
          ))}
        </div>
      </nav>

      <div
        id="page-review"
        className="source-reading-path"
        aria-label="Demo evidence reading path"
        tabIndex={-1}
      >
        <span>FOUND IN THE ARCHIVE</span>
        <i aria-hidden="true" />
        <strong>DEMO PAGE</strong>
        <i aria-hidden="true" />
        <span>SOURCE REQUIRED</span>
      </div>

      <div className="source-review-workbench">
        <article className="source-page-sheet">
          <div className="source-page-folio" aria-hidden="true">
            <span>DEMO</span>
            <strong>{pageNumber.toString().padStart(3, "0")}</strong>
            <i />
          </div>
          <div className="source-page-sheet-header">
            <span>NON-AUTHORITATIVE PLACEHOLDER</span>
            <span>NO ORIGINAL IMPORTED</span>
          </div>
          <div className="source-page-empty">
            <BoxIcon aria-hidden="true" />
            <strong>SOURCE PAGE PLACEHOLDER</strong>
            <p>No page image has been imported.</p>
            <span>AUTHORITATIVE FILE REQUIRED</span>
          </div>
          <footer className="source-page-sheet-footer">
            <span>{source.fileName}</span>
            <span>DEMO / {source.version}</span>
          </footer>
        </article>

        <aside
          className="source-inspector"
          aria-label="Selected demo page details"
        >
          <div className="source-inspector-heading">
            <ScanLineIcon aria-hidden="true" />
            <div>
              <span className="trace-label">CURRENT DEMO PAGE</span>
              <strong>{pageNumber.toString().padStart(3, "0")}</strong>
            </div>
            <EvidenceBadge kind="unresolved" />
          </div>
          <Alert>
            <ShieldAlertIcon />
            <AlertTitle>No original document is present</AlertTitle>
            <AlertDescription>
              This manifest proves the interface path, not provenance. Source
              viewing remains unavailable until a real file and checksum pass
              intake.
            </AlertDescription>
          </Alert>
          <div className="extracted-text">
            <span>DEMO EXTRACTION</span>
            {page?.extractedText}
          </div>
          <details className="source-technical-details">
            <summary>TECHNICAL SOURCE DETAILS</summary>
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
          </details>
          <div className="source-inspector-actions">
            <Button variant="outline" disabled>
              OFFICIAL SOURCE UNAVAILABLE
            </Button>
            {entry && (
              <Button onClick={() => onOpenTrace(entry.id)}>
                OPEN LINKED TRACE
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            )}
          </div>
        </aside>
      </div>

      <div className="source-intake-stack">
        <M4ReadinessPanel />
        <M2PipelinePanel />
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
                  variant={item.state === "READY" ? "default" : "destructive"}
                >
                  {item.state}
                </Badge>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
