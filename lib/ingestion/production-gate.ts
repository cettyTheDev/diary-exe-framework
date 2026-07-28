import type {
  FileInventory,
  ProductionIntakeApproval,
  ProductionIntakeGateReport,
  SourceCandidate,
  SourcePageInventory,
} from "./contracts.ts"

export type ProductionIntakeGateInput = {
  candidate: SourceCandidate
  approval: ProductionIntakeApproval | null
  files: readonly FileInventory[]
  pages: readonly SourcePageInventory[]
}

function hasSequentialPages(pages: readonly SourcePageInventory[]) {
  const pageNumbers = pages.map((page) => page.pageNumber)
  return (
    pageNumbers.length > 0 &&
    new Set(pageNumbers).size === pageNumbers.length &&
    pageNumbers.every((page, index) => page === index + 1)
  )
}

function hasValidApprovalIdentity(
  approval: ProductionIntakeApproval | null,
  candidateId: string
) {
  if (!approval) return false
  const approvedAt = Date.parse(approval.approvedAt)
  return (
    approval.candidateId === candidateId &&
    approval.approvalId.trim().length > 0 &&
    approval.approvedBy.trim().length > 0 &&
    approval.note.trim().length > 0 &&
    Number.isFinite(approvedAt)
  )
}

export function evaluateProductionIntakeGate({
  candidate,
  approval,
  files,
  pages,
}: ProductionIntakeGateInput): ProductionIntakeGateReport {
  const officialListing =
    candidate.authorityAssessment.listing === "official_publisher"
  const sourceFileIdentity =
    candidate.authorityAssessment.documentBytes === "verified" &&
    files.length > 0 &&
    files.every((file) => /^[a-f0-9]{64}$/.test(file.sha256))
  const validApproval = hasValidApprovalIdentity(approval, candidate.id)
  const canStore = validApproval && Boolean(approval?.permissions.canStore)
  const canExtract = validApproval && Boolean(approval?.permissions.canExtract)
  const canQuote = validApproval && Boolean(approval?.permissions.canQuote)
  const canDisplayPages =
    validApproval && Boolean(approval?.permissions.canDisplayPages)
  const useBoundary = canStore && canExtract
  const expectedPages = candidate.reportedPageCount.value
  const pageInventory =
    sourceFileIdentity &&
    hasSequentialPages(pages) &&
    pages.every((page) =>
      files.some((file) => file.id === page.sourceFileId)
    ) &&
    (expectedPages === null || pages.length === expectedPages)

  const checks: ProductionIntakeGateReport["checks"] = [
    {
      id: "official_listing",
      status: officialListing ? "ready" : "blocked",
      note: officialListing
        ? "Primary publisher listing recorded."
        : "A primary publisher listing has not been established.",
    },
    {
      id: "source_file_identity",
      status: sourceFileIdentity ? "ready" : "blocked",
      note: sourceFileIdentity
        ? "Immutable local file identity and SHA-256 are recorded."
        : "No authenticated immutable local file and checksum are recorded.",
    },
    {
      id: "use_boundary",
      status: useBoundary ? "ready" : "blocked",
      note: useBoundary
        ? "Owner approval permits storage and extraction."
        : "Explicit Owner storage and extraction approval is absent.",
    },
    {
      id: "page_inventory",
      status: pageInventory ? "ready" : "blocked",
      note: pageInventory
        ? "Page inventory is sequential, file-bound, and complete."
        : "Page inventory cannot be trusted until file identity is fixed and expected pages are reconciled.",
    },
  ]

  const permissions: ProductionIntakeGateReport["permissions"] = [
    {
      id: "store",
      status: canStore ? "ready" : "blocked",
      note: canStore
        ? "The recorded Owner decision permits local immutable storage."
        : "No valid Owner decision permits local storage.",
    },
    {
      id: "extract",
      status: canExtract ? "ready" : "blocked",
      note: canExtract
        ? "The recorded Owner decision permits text extraction or OCR."
        : "No valid Owner decision permits extraction or OCR.",
    },
    {
      id: "quote",
      status: canQuote ? "ready" : "blocked",
      note: canQuote
        ? "The recorded Owner decision permits quoted source text."
        : "No valid Owner decision permits quotation.",
    },
    {
      id: "display_pages",
      status: canDisplayPages ? "ready" : "blocked",
      note: canDisplayPages
        ? "The recorded Owner decision permits source-page display."
        : "No valid Owner decision permits source-page display.",
    },
  ]

  const readyForAcquisition =
    officialListing && candidate.access.status !== "unavailable" && canStore
  const readyForExtraction = checks.every((check) => check.status === "ready")

  return {
    schemaVersion: "1.0",
    candidateId: candidate.id,
    approvalId: validApproval ? (approval?.approvalId ?? null) : null,
    readyForAcquisition,
    readyForExtraction,
    readyForQuotation: readyForExtraction && canQuote,
    readyForPageDisplay: readyForExtraction && canDisplayPages,
    checks,
    permissions,
  }
}
