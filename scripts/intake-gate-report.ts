import { exampleReleaseCandidate } from "../data/intake/source-candidates.ts"
import { evaluateProductionIntakeGate } from "../lib/ingestion/production-gate.ts"

const report = evaluateProductionIntakeGate({
  candidate: exampleReleaseCandidate,
  approval: null,
  files: [],
  pages: [],
})

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)

if (
  report.readyForAcquisition ||
  report.readyForExtraction ||
  report.readyForQuotation ||
  report.readyForPageDisplay
) {
  throw new Error(
    "Current unresolved source candidate must not pass any production operation gate."
  )
}
