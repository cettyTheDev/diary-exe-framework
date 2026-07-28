import type {
  EntityCandidateRecord,
  EntityReviewDecision,
  EntityReviewReport,
} from "./contracts.ts"

export function evaluateEntityReviewQueue(input: {
  candidates: readonly EntityCandidateRecord[]
  decisions: readonly EntityReviewDecision[]
}): EntityReviewReport {
  const candidateIds = new Set(
    input.candidates.map((candidate) => candidate.id)
  )
  const decidedCandidateIds = new Set<string>()
  const errors: string[] = []
  let accepted = 0
  let rejected = 0

  for (const decision of input.decisions) {
    if (!candidateIds.has(decision.candidateId)) {
      errors.push(
        `Decision ${decision.decisionId} references an unknown candidate.`
      )
      continue
    }
    if (decidedCandidateIds.has(decision.candidateId)) {
      errors.push(`Candidate ${decision.candidateId} has duplicate decisions.`)
      continue
    }
    if (!decision.reviewer.trim() || !decision.note.trim()) {
      errors.push(
        `Decision ${decision.decisionId} requires an accountable reviewer and note.`
      )
      continue
    }
    decidedCandidateIds.add(decision.candidateId)
    if (decision.decision === "accept") accepted += 1
    else rejected += 1
  }

  const pending = input.candidates.length - decidedCandidateIds.size
  const valid = errors.length === 0
  return {
    valid,
    readyForPublicUse:
      valid &&
      input.candidates.length > 0 &&
      pending === 0 &&
      input.candidates.every((candidate) => !candidate.isFixture) &&
      input.decisions.every((decision) => !decision.isFixture),
    metrics: {
      candidates: input.candidates.length,
      accepted,
      rejected,
      pending,
    },
    errors,
  }
}
