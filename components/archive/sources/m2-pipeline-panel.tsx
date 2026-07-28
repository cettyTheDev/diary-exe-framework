import {
  DatabaseIcon,
  FileStackIcon,
  ListChecksIcon,
  ShieldCheckIcon,
  ScanTextIcon,
  SearchCheckIcon,
  ShieldAlertIcon,
  WorkflowIcon,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { m2FixtureObservability } from "@/data/intake/m2-observability"

const stageRows = [
  { ...m2FixtureObservability.stages.vault, icon: DatabaseIcon },
  { ...m2FixtureObservability.stages.extraction, icon: ScanTextIcon },
  { ...m2FixtureObservability.stages.normalization, icon: FileStackIcon },
  { ...m2FixtureObservability.stages.review, icon: ListChecksIcon },
  { ...m2FixtureObservability.stages.index, icon: SearchCheckIcon },
  { ...m2FixtureObservability.stages.quality, icon: ShieldCheckIcon },
  { ...m2FixtureObservability.stages.ledger, icon: WorkflowIcon },
] as const

const metrics = [
  {
    label: "PAGES",
    value: m2FixtureObservability.metrics.extractedPages,
    note: "3 / 3 extracted",
  },
  {
    label: "ENTRIES",
    value: m2FixtureObservability.metrics.normalizedEntries,
    note: "raw preserved",
  },
  {
    label: "REVIEW",
    value: m2FixtureObservability.metrics.pendingReviews,
    note: "fixture pending",
  },
  {
    label: "INDEX",
    value: m2FixtureObservability.metrics.indexTerms,
    note: "37 postings",
  },
] as const

export function M2PipelinePanel() {
  return (
    <Card aria-labelledby="m2-pipeline-title">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">FIXTURE REHEARSAL</Badge>
          <Badge>6 VERIFIED / 1 PENDING</Badge>
        </div>
        <CardTitle id="m2-pipeline-title">M2 pipeline control plane</CardTitle>
        <CardDescription>
          A pinned observability snapshot from the safe synthetic end-to-end
          run. It reports platform behavior, never diary content.
        </CardDescription>
        <CardAction>
          <Badge variant="outline">READ ONLY</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Alert variant="destructive">
          <ShieldAlertIcon />
          <AlertTitle>Production intake remains locked</AlertTitle>
          <AlertDescription>
            No real source registry is included. Authority, file identity, use
            boundary, checksum, and page inventory must be supplied privately
            before extraction can start.
          </AlertDescription>
        </Alert>

        <dl className="pipeline-metrics" aria-label="M2 fixture run metrics">
          {metrics.map((metric) => (
            <div key={metric.label}>
              <dt>{metric.label}</dt>
              <dd>{metric.value.toString().padStart(2, "0")}</dd>
              <small>{metric.note}</small>
            </div>
          ))}
        </dl>

        <ol className="pipeline-stages" aria-label="M2 fixture pipeline stages">
          {stageRows.map((stage, index) => {
            const Icon = stage.icon
            return (
              <li key={stage.label}>
                <span className="pipeline-stage-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="pipeline-stage-index">
                  {(index + 1).toString().padStart(2, "0")}
                </span>
                <div>
                  <strong>{stage.label}</strong>
                  <small>{stage.detail}</small>
                </div>
                <Badge
                  variant={
                    stage.state === "PENDING" ? "destructive" : "outline"
                  }
                >
                  {stage.state}
                </Badge>
              </li>
            )
          })}
        </ol>
      </CardContent>
      <CardFooter className="pipeline-run-footer">
        <span>
          RUN <code>{m2FixtureObservability.runId}</code>
        </span>
        <span>
          INDEX SHA{" "}
          <code>{m2FixtureObservability.indexSha256.slice(0, 12)}…</code>
        </span>
      </CardFooter>
    </Card>
  )
}
