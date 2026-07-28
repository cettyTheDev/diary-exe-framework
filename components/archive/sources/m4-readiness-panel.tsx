import {
  ArchiveRestoreIcon,
  EyeIcon,
  FileInputIcon,
  QuoteIcon,
  ShieldAlertIcon,
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
import { m4ProductionReadiness } from "@/data/intake/m4-readiness"

const operationRows = [
  {
    label: "ACQUIRE / STORE",
    ready: m4ProductionReadiness.report.readyForAcquisition,
    note: "Requires verified authority/origin plus explicit storage approval.",
    icon: ArchiveRestoreIcon,
  },
  {
    label: "EXTRACT / OCR",
    ready: m4ProductionReadiness.report.readyForExtraction,
    note: "Also requires verified bytes, SHA-256, and a complete page inventory.",
    icon: FileInputIcon,
  },
  {
    label: "QUOTE TEXT",
    ready: m4ProductionReadiness.report.readyForQuotation,
    note: "Remains independent from storage and extraction permission.",
    icon: QuoteIcon,
  },
  {
    label: "DISPLAY PAGES",
    ready: m4ProductionReadiness.report.readyForPageDisplay,
    note: "Remains independent from quotation permission.",
    icon: EyeIcon,
  },
] as const

export function M4ReadinessPanel() {
  const readyOperations = operationRows.filter((item) => item.ready).length

  return (
    <Card className="m4-readiness-card" aria-labelledby="m4-readiness-title">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">M4 PREFLIGHT</Badge>
          <Badge variant="destructive">
            {readyOperations} / {operationRows.length} OPERATIONS READY
          </Badge>
        </div>
        <CardTitle id="m4-readiness-title">
          Operation-level authorization
        </CardTitle>
        <CardDescription>
          Read-only projection of what the current evidence and Owner decision
          permit. A later permission never unlocks an earlier missing gate.
        </CardDescription>
        <CardAction>
          <Badge variant="destructive">NO APPROVAL RECORD</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Alert variant="destructive">
          <ShieldAlertIcon />
          <AlertTitle>No real-source operation is authorized</AlertTitle>
          <AlertDescription>
            This panel cannot grant permission. It only reflects a committed,
            candidate-matched decision record; the current record is absent.
          </AlertDescription>
        </Alert>

        <dl className="m4-operation-grid" aria-label="M4 operation readiness">
          {operationRows.map((operation, index) => {
            const Icon = operation.icon
            return (
              <div key={operation.label}>
                <span className="m4-operation-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="m4-operation-index" aria-hidden="true">
                  {(index + 1).toString().padStart(2, "0")}
                </span>
                <div>
                  <dt>{operation.label}</dt>
                  <dd>{operation.note}</dd>
                </div>
                <Badge variant={operation.ready ? "default" : "destructive"}>
                  {operation.ready ? "READY" : "LOCKED"}
                </Badge>
              </div>
            )
          })}
        </dl>
      </CardContent>
      <CardFooter className="m4-readiness-footer">
        <span>
          CANDIDATE <code>{m4ProductionReadiness.report.candidateId}</code>
        </span>
        <span>
          APPROVAL <code>NONE</code>
        </span>
      </CardFooter>
    </Card>
  )
}
