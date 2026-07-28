import { exampleReleaseCandidate } from "./source-candidates.ts"
import { evaluateProductionIntakeGate } from "../../lib/ingestion/production-gate.ts"

export const m4ProductionReadiness = {
  candidate: exampleReleaseCandidate,
  report: evaluateProductionIntakeGate({
    candidate: exampleReleaseCandidate,
    approval: null,
    files: [],
    pages: [],
  }),
} as const
