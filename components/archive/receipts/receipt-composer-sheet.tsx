"use client"

import { useState } from "react"
import {
  CheckIcon,
  DownloadIcon,
  LinkIcon,
  ShieldAlertIcon,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  getShareReceiptFileName,
  type ShareReceiptModel,
} from "@/lib/archive/share-receipt"

type ComposerStatus =
  { kind: "idle"; message: "" } | { kind: "success" | "error"; message: string }

export function ReceiptComposerSheet({
  model,
  onClose,
}: {
  model?: ShareReceiptModel
  onClose: () => void
}) {
  const [status, setStatus] = useState<ComposerStatus>({
    kind: "idle",
    message: "",
  })
  const [isExporting, setIsExporting] = useState(false)

  async function copyPermalink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setStatus({ kind: "success", message: "Permalink copied." })
    } catch {
      setStatus({
        kind: "error",
        message: "Clipboard access was unavailable. Copy the browser URL.",
      })
    }
  }

  async function downloadPng() {
    if (!model) return
    setIsExporting(true)
    setStatus({ kind: "idle", message: "" })

    try {
      const { downloadShareReceiptPng } =
        await import("@/lib/archive/share-receipt-renderer")
      await downloadShareReceiptPng(model)
      setStatus({
        kind: "success",
        message: `${getShareReceiptFileName(model)} downloaded locally.`,
      })
    } catch (error) {
      setStatus({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "The PNG export could not be created.",
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Sheet open={Boolean(model)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="receipt-composer-sheet w-full overflow-y-auto data-[side=right]:w-full sm:max-w-2xl">
        {model && (
          <>
            <SheetHeader>
              <div className="flex flex-wrap items-center gap-2 pr-10">
                <Badge variant={model.isFixture ? "destructive" : "default"}>
                  {model.watermark}
                </Badge>
                <Badge variant="outline">LOCAL PNG</Badge>
              </div>
              <SheetTitle>MAKE RECEIPT</SheetTitle>
              <SheetDescription>
                Evidence-locked preview for {model.entryId}. The export is
                rendered in this browser and is never uploaded.
              </SheetDescription>
            </SheetHeader>

            <div className="receipt-composer-content">
              <Alert variant={model.isFixture ? "destructive" : "default"}>
                <ShieldAlertIcon />
                <AlertTitle>
                  {model.isFixture
                    ? "Fixture watermark is permanent"
                    : "Source-linked receipt"}
                </AlertTitle>
                <AlertDescription>
                  {model.isFixture
                    ? "This visual contains demonstration text only. It is not diary evidence and cannot be exported without the fixture label."
                    : "Source, page, checksum, and citation state are embedded in the exported image."}
                </AlertDescription>
              </Alert>

              <ReceiptPreview model={model} />

              <div className="receipt-composer-actions">
                <Button variant="outline" onClick={copyPermalink}>
                  <LinkIcon data-icon="inline-start" />
                  COPY PERMALINK
                </Button>
                <Button onClick={downloadPng} disabled={isExporting}>
                  <DownloadIcon data-icon="inline-start" />
                  {isExporting ? "RENDERING…" : "DOWNLOAD PNG"}
                </Button>
              </div>
              <p
                className={`receipt-composer-status ${status.kind === "error" ? "is-error" : ""}`}
                role="status"
                aria-live="polite"
              >
                {status.kind === "success" && <CheckIcon aria-hidden="true" />}
                {status.message || "No external request will be made."}
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function ReceiptPreview({ model }: { model: ShareReceiptModel }) {
  return (
    <figure className="share-receipt-frame">
      <div
        className={`share-receipt-preview ${model.isFixture ? "is-fixture" : "is-source-linked"}`}
        data-testid="share-receipt-preview"
      >
        <div className="share-receipt-header">
          <div>
            <strong>DIARY.EXE</strong>
            <span>MAKE RECEIPT / LOCAL EXPORT</span>
          </div>
          <div>
            <b>{model.watermark}</b>
            <span>SCHEMA {model.schemaVersion}</span>
          </div>
        </div>

        <div className="share-receipt-intro">
          <span>{model.dateLabel}</span>
          <span>{model.evidenceLabel}</span>
          <h3>{model.title}</h3>
        </div>

        <div className="share-receipt-copy">
          <span>ARCHIVE EXCERPT</span>
          <blockquote>“{model.excerpt}”</blockquote>
          <span>CONTEXT</span>
          <p>{model.context}</p>
        </div>

        <dl className="share-receipt-metadata">
          <div>
            <dt>Source document</dt>
            <dd>{model.source.title}</dd>
          </div>
          <div>
            <dt>Page / citation state</dt>
            <dd>
              {model.source.pageLabel} / {model.source.citationStateLabel}
            </dd>
          </div>
          <div>
            <dt>File / version</dt>
            <dd>
              {model.source.fileName} / {model.source.version}
            </dd>
          </div>
          <div>
            <dt>Checksum</dt>
            <dd>{model.source.checksumLabel}</dd>
          </div>
          <div>
            <dt>Story arc</dt>
            <dd>{model.storyArc}</dd>
          </div>
          <div>
            <dt>Entities / topics</dt>
            <dd>
              {[...model.entities, ...model.topics].join(" / ") ||
                "NONE ASSIGNED"}
            </dd>
          </div>
        </dl>

        <div className="share-receipt-footer">
          <strong>{model.watermark}</strong>
          <span>ENTRY {model.entryId}</span>
          <span>GENERATED LOCALLY — NO UPLOAD</span>
        </div>
      </div>
      <figcaption>
        Export preview · 1080 × 1350 PNG · source metadata embedded
      </figcaption>
    </figure>
  )
}
