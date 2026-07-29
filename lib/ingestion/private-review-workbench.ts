import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto"
import { chmod, readFile, rename, unlink, writeFile } from "node:fs/promises"
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http"
import path from "node:path"

import type {
  PublicationPublishDecision,
  PublicationRejectDecision,
  PublicationReviewCandidate,
  PublicationReviewDecision,
} from "./contracts.ts"
import { evaluatePublicationReviewQueue } from "./publication-review.ts"

export type PrivateReviewQueueArtifact = {
  schemaVersion: "1.0"
  mode: "private_review"
  runId: string
  publicationReady: false
  source: {
    id: string
    title: string
    fileName: string
    version: string
    sourceFileId: string
    sha256: string
    sourceUrl: string
  }
  candidates: PublicationReviewCandidate[]
  report: unknown
}

export type PrivateReviewDecisionArtifact = {
  schemaVersion: "1.0"
  mode: "private_review_decisions"
  runId: string
  instructions: string[]
  decisions: PublicationReviewDecision[]
}

type WorkbenchAction =
  | { kind: "delete"; decisionId: string }
  | {
      kind: "reject"
      candidateId: string
      note: string
      reason: PublicationRejectDecision["reason"]
    }
  | {
      kind: "publish"
      candidateId: string
      quoteStart: number
      quoteEnd: number
      title: string
      context: string
      date: string | null
      datePrecision: PublicationPublishDecision["datePrecision"]
      recordType: PublicationPublishDecision["recordType"]
      evidenceKind: PublicationPublishDecision["evidenceKind"]
      editorialPosture: PublicationPublishDecision["editorialPosture"]
      responseState: PublicationPublishDecision["responseState"]
      privacyReview: PublicationPublishDecision["privacyReview"]
      privacyNote: string
      thirdPartyReview: PublicationPublishDecision["thirdPartyReview"]
      transcriptionVerified: true
      sourceLinkVerified: true
      note: string
    }

const MAX_REQUEST_BYTES = 32 * 1024

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === "string"
}

function oneOf<T extends string>(
  value: unknown,
  options: readonly T[]
): value is T {
  return typeof value === "string" && options.includes(value as T)
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function escapeHtml(value: unknown) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function secureEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  )
}

function validDecisionBase(value: Record<string, unknown>) {
  return (
    value.schemaVersion === "1.0" &&
    isString(value.decisionId) &&
    isString(value.candidateId) &&
    isString(value.reviewer) &&
    isString(value.reviewedAt) &&
    isString(value.note) &&
    value.isFixture === false
  )
}

function assertDecisionShape(
  value: unknown
): asserts value is PublicationReviewDecision {
  if (!isRecord(value) || !validDecisionBase(value)) {
    throw new Error("Private review decisions contain an invalid decision.")
  }
  if (value.disposition === "reject") {
    if (
      !oneOf(value.reason, [
        "not_an_entry",
        "privacy",
        "third_party_material",
        "insufficient_context",
        "extraction_quality",
        "duplicate",
        "other",
      ] as const)
    ) {
      throw new Error("Private review decisions contain an invalid rejection.")
    }
    return
  }
  if (
    value.disposition !== "publish" ||
    !Number.isSafeInteger(value.quoteStart) ||
    !Number.isSafeInteger(value.quoteEnd) ||
    !isString(value.exactText) ||
    !isString(value.title) ||
    !isString(value.context) ||
    !(value.date === null || isString(value.date)) ||
    !oneOf(value.datePrecision, [
      "day",
      "month",
      "range",
      "unknown",
    ] as const) ||
    !oneOf(value.recordType, [
      "diary_entry",
      "email",
      "transcript",
      "publisher_annotation",
      "unknown",
    ] as const) ||
    !oneOf(value.evidenceKind, ["diary_text", "unresolved"] as const) ||
    !oneOf(value.editorialPosture, [
      "source_record",
      "publisher_claim",
      "editorial_comparison",
    ] as const) ||
    !oneOf(value.responseState, [
      "not_applicable",
      "pending",
      "included",
    ] as const) ||
    !oneOf(value.privacyReview, ["clear", "redacted"] as const) ||
    !isString(value.privacyNote) ||
    !oneOf(value.thirdPartyReview, ["none", "excluded"] as const) ||
    value.transcriptionVerified !== true ||
    value.sourceLinkVerified !== true
  ) {
    throw new Error(
      "Private review decisions contain an invalid publication decision."
    )
  }
}

export function parsePrivateReviewArtifacts(
  queueValue: unknown,
  decisionsValue: unknown
) {
  if (
    !isRecord(queueValue) ||
    queueValue.schemaVersion !== "1.0" ||
    queueValue.mode !== "private_review" ||
    !isString(queueValue.runId) ||
    queueValue.publicationReady !== false ||
    !isRecord(queueValue.source) ||
    !isString(queueValue.source.id) ||
    !isString(queueValue.source.title) ||
    !isString(queueValue.source.fileName) ||
    !isString(queueValue.source.version) ||
    !isString(queueValue.source.sourceFileId) ||
    !isString(queueValue.source.sha256) ||
    !/^[a-f0-9]{64}$/.test(queueValue.source.sha256) ||
    !isString(queueValue.source.sourceUrl) ||
    !Array.isArray(queueValue.candidates) ||
    queueValue.candidates.length === 0
  ) {
    throw new Error(
      "Private review queue header or source metadata is invalid."
    )
  }

  for (const candidate of queueValue.candidates) {
    if (
      !isRecord(candidate) ||
      candidate.schemaVersion !== "1.0" ||
      !isString(candidate.id) ||
      !isString(candidate.extractionId) ||
      !isString(candidate.sourceId) ||
      !isString(candidate.sourceFileId) ||
      !Number.isSafeInteger(candidate.pageNumber) ||
      !isString(candidate.rawText) ||
      !isString(candidate.rawTextSha256) ||
      sha256(candidate.rawText) !== candidate.rawTextSha256 ||
      !oneOf(candidate.method, ["source_text", "ocr"] as const) ||
      typeof candidate.confidence !== "number" ||
      !Array.isArray(candidate.sensitivePatternFlags) ||
      candidate.sensitivePatternFlags.some(
        (flag) =>
          !oneOf(flag, [
            "email_address",
            "phone_number",
            "ssn_pattern",
            "ocr_required",
          ] as const)
      ) ||
      typeof candidate.readyForQuoteReview !== "boolean" ||
      candidate.isFixture !== false
    ) {
      throw new Error(
        "Private review queue contains an invalid or modified candidate."
      )
    }
  }

  if (
    !isRecord(decisionsValue) ||
    decisionsValue.schemaVersion !== "1.0" ||
    decisionsValue.mode !== "private_review_decisions" ||
    decisionsValue.runId !== queueValue.runId ||
    !Array.isArray(decisionsValue.instructions) ||
    !Array.isArray(decisionsValue.decisions)
  ) {
    throw new Error("Private review decisions do not match the queue run.")
  }

  for (const decision of decisionsValue.decisions) assertDecisionShape(decision)

  const decisions = decisionsValue.decisions as PublicationReviewDecision[]
  const report = evaluatePublicationReviewQueue({
    candidates: queueValue.candidates as PublicationReviewCandidate[],
    decisions,
  })
  const structuralErrors = report.errors.filter((error) =>
    /unknown candidate|duplicated|requires a decision ID|cannot be a fixture/i.test(
      error
    )
  )
  if (structuralErrors.length > 0) {
    throw new Error(
      `Private review decisions are structurally invalid: ${structuralErrors[0]}`
    )
  }

  return {
    queue: queueValue as PrivateReviewQueueArtifact,
    decisions: decisionsValue as PrivateReviewDecisionArtifact,
  }
}

export function decisionRevision(artifact: PrivateReviewDecisionArtifact) {
  return sha256(`${JSON.stringify(artifact)}\n`)
}

function required(form: URLSearchParams, name: string) {
  const value = form.get(name)?.trim()
  if (!value) throw new Error(`${name} is required.`)
  return value
}

function parseAction(form: URLSearchParams): WorkbenchAction {
  const action = required(form, "action")
  if (action === "delete")
    return { kind: "delete", decisionId: required(form, "decisionId") }
  const candidateId = required(form, "candidateId")
  const note = required(form, "note")
  if (action === "reject") {
    const reason = required(form, "reason")
    if (
      !oneOf(reason, [
        "not_an_entry",
        "privacy",
        "third_party_material",
        "insufficient_context",
        "extraction_quality",
        "duplicate",
        "other",
      ] as const)
    ) {
      throw new Error("Rejection reason is invalid.")
    }
    return { kind: "reject", candidateId, note, reason }
  }
  if (action !== "publish") throw new Error("Workbench action is invalid.")

  const quoteStart = Number(required(form, "quoteStart"))
  const quoteEnd = Number(required(form, "quoteEnd"))
  const dateValue = form.get("date")?.trim() ?? ""
  const datePrecision = required(form, "datePrecision")
  const recordType = required(form, "recordType")
  const evidenceKind = required(form, "evidenceKind")
  const editorialPosture = required(form, "editorialPosture")
  const responseState = required(form, "responseState")
  const privacyReview = required(form, "privacyReview")
  const thirdPartyReview = required(form, "thirdPartyReview")
  if (
    !Number.isSafeInteger(quoteStart) ||
    !Number.isSafeInteger(quoteEnd) ||
    !oneOf(datePrecision, ["day", "month", "range", "unknown"] as const) ||
    !oneOf(recordType, [
      "diary_entry",
      "email",
      "transcript",
      "publisher_annotation",
      "unknown",
    ] as const) ||
    !oneOf(evidenceKind, ["diary_text", "unresolved"] as const) ||
    !oneOf(editorialPosture, [
      "source_record",
      "publisher_claim",
      "editorial_comparison",
    ] as const) ||
    !oneOf(responseState, ["not_applicable", "pending", "included"] as const) ||
    !oneOf(privacyReview, ["clear", "redacted"] as const) ||
    !oneOf(thirdPartyReview, ["none", "excluded"] as const)
  ) {
    throw new Error("Publication review fields are invalid.")
  }
  if (
    form.get("transcriptionVerified") !== "yes" ||
    form.get("sourceLinkVerified") !== "yes"
  ) {
    throw new Error(
      "Transcription and source-link verification must both be confirmed."
    )
  }
  return {
    kind: "publish",
    candidateId,
    quoteStart,
    quoteEnd,
    title: required(form, "title"),
    context: required(form, "context"),
    date: dateValue || null,
    datePrecision,
    recordType,
    evidenceKind,
    editorialPosture,
    responseState,
    privacyReview,
    privacyNote: required(form, "privacyNote"),
    thirdPartyReview,
    transcriptionVerified: true,
    sourceLinkVerified: true,
    note,
  }
}

export function applyWorkbenchAction(input: {
  queue: PrivateReviewQueueArtifact
  artifact: PrivateReviewDecisionArtifact
  reviewer: string
  action: WorkbenchAction
}) {
  const { queue, artifact, reviewer, action } = input
  let nextDecisions = [...artifact.decisions]
  if (action.kind === "delete") {
    const filtered = nextDecisions.filter(
      (decision) => decision.decisionId !== action.decisionId
    )
    if (filtered.length === nextDecisions.length)
      throw new Error("Decision does not exist.")
    nextDecisions = filtered
  } else {
    const candidate = queue.candidates.find(
      (item) => item.id === action.candidateId
    )
    if (!candidate) throw new Error("Candidate does not exist.")
    const base = {
      schemaVersion: "1.0" as const,
      decisionId: `decision-${randomUUID()}`,
      candidateId: candidate.id,
      reviewer,
      reviewedAt: new Date().toISOString(),
      note: action.note,
      isFixture: false as const,
    }
    const decision: PublicationReviewDecision =
      action.kind === "reject"
        ? { ...base, disposition: "reject", reason: action.reason }
        : {
            ...base,
            disposition: "publish",
            quoteStart: action.quoteStart,
            quoteEnd: action.quoteEnd,
            exactText: candidate.rawText.slice(
              action.quoteStart,
              action.quoteEnd
            ),
            title: action.title,
            context: action.context,
            date: action.date,
            datePrecision: action.datePrecision,
            recordType: action.recordType,
            evidenceKind: action.evidenceKind,
            editorialPosture: action.editorialPosture,
            responseState: action.responseState,
            privacyReview: action.privacyReview,
            privacyNote: action.privacyNote,
            thirdPartyReview: action.thirdPartyReview,
            transcriptionVerified: true,
            sourceLinkVerified: true,
          }
    const candidateReport = evaluatePublicationReviewQueue({
      candidates: [candidate],
      decisions: [
        ...nextDecisions.filter((item) => item.candidateId === candidate.id),
        decision,
      ],
    })
    if (candidateReport.errors.length > 0)
      throw new Error(candidateReport.errors[0])
    nextDecisions.push(decision)
  }
  return { ...artifact, decisions: nextDecisions }
}

export async function writePrivateDecisionArtifact(
  filePath: string,
  artifact: PrivateReviewDecisionArtifact,
  expectedRevision: string
) {
  const current = await readFile(filePath, "utf8")
  const currentValue = JSON.parse(current) as unknown
  if (sha256(`${JSON.stringify(currentValue)}\n`) !== expectedRevision) {
    throw new Error(
      "Decision file changed after this page loaded; reload before saving."
    )
  }
  const serialized = `${JSON.stringify(artifact, null, 2)}\n`
  const temporary = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${randomUUID()}.tmp`
  )
  try {
    await writeFile(temporary, serialized, { flag: "wx", mode: 0o600 })
    await rename(temporary, filePath)
    await chmod(filePath, 0o600)
  } catch (error) {
    await unlink(temporary).catch(() => undefined)
    throw error
  }
}

function option(value: string, label: string, selected = false) {
  return `<option value="${escapeHtml(value)}"${selected ? " selected" : ""}>${escapeHtml(label)}</option>`
}

export function renderPrivateReviewWorkbench(input: {
  queue: PrivateReviewQueueArtifact
  artifact: PrivateReviewDecisionArtifact
  token: string
  nonce: string
  reviewer: string
  candidateId?: string
  notice?: string
  error?: string
}) {
  const { queue, artifact, token, reviewer } = input
  const report = evaluatePublicationReviewQueue({
    candidates: queue.candidates,
    decisions: artifact.decisions,
  })
  const selected =
    queue.candidates.find((candidate) => candidate.id === input.candidateId) ??
    queue.candidates[0]
  const selectedIndex = queue.candidates.indexOf(selected)
  const selectedDecisions = artifact.decisions.filter(
    (decision) => decision.candidateId === selected.id
  )
  const query = (candidateId: string) =>
    `/?token=${encodeURIComponent(token)}&candidate=${encodeURIComponent(candidateId)}`
  const nav = queue.candidates
    .map((candidate, index) => {
      const decisions = artifact.decisions.filter(
        (decision) => decision.candidateId === candidate.id
      )
      const state =
        decisions.length === 0
          ? "pending"
          : decisions.some((decision) => decision.disposition === "publish")
            ? "publish"
            : "reject"
      return `<a class="candidate ${candidate.id === selected.id ? "active" : ""}" href="${query(candidate.id)}"><span>${String(index + 1).padStart(3, "0")}</span><strong>PAGE ${candidate.pageNumber}</strong><em class="${state}">${state}</em></a>`
    })
    .join("")
  const hidden = `<input type="hidden" name="token" value="${escapeHtml(token)}"><input type="hidden" name="revision" value="${decisionRevision(artifact)}"><input type="hidden" name="candidateId" value="${escapeHtml(selected.id)}">`
  const decisionList = selectedDecisions.length
    ? selectedDecisions
        .map(
          (decision) =>
            `<article class="saved"><div><strong>${escapeHtml(decision.disposition.toUpperCase())}</strong><span>${escapeHtml(decision.decisionId)}</span></div><p>${escapeHtml(decision.note)}</p><form method="post" action="/decision">${hidden}<input type="hidden" name="action" value="delete"><input type="hidden" name="decisionId" value="${escapeHtml(decision.decisionId)}"><button class="danger" type="submit">REMOVE DECISION</button></form></article>`
        )
        .join("")
    : `<p class="empty">No decision recorded for this candidate.</p>`
  const flags = selected.sensitivePatternFlags.length
    ? selected.sensitivePatternFlags
        .map((flag) => `<span class="flag">${escapeHtml(flag)}</span>`)
        .join("")
    : `<span class="flag clear">no pattern flags</span>`
  const message = input.error
    ? `<div class="message error" role="alert">${escapeHtml(input.error)}</div>`
    : input.notice
      ? `<div class="message success" role="status">${escapeHtml(input.notice)}</div>`
      : ""

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DIARY.EXE — Private Review</title>
<style>
:root{color-scheme:dark;--bg:#0a0b0a;--panel:#111311;--line:#30362f;--muted:#9ba39a;--ink:#eef2e9;--acid:#c8ff47;--warn:#ffb84d;--bad:#ff6961}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:14px}a{color:inherit}.top{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:14px 20px;border-bottom:1px solid var(--line);background:#0a0b0af2}.brand{font-weight:900;letter-spacing:.08em}.local{color:var(--acid);font-size:12px}.metrics{display:flex;gap:8px;flex-wrap:wrap}.metric{border:1px solid var(--line);padding:6px 9px;color:var(--muted)}.metric b{color:var(--ink)}.layout{display:grid;grid-template-columns:220px minmax(0,1fr);min-height:calc(100vh - 62px)}aside{border-right:1px solid var(--line);padding:14px;overflow:auto}.source{color:var(--muted);font-size:11px;line-height:1.5;margin-bottom:14px}.candidate{display:grid;grid-template-columns:34px 1fr auto;gap:8px;text-decoration:none;padding:10px 8px;border:1px solid transparent}.candidate:hover,.candidate.active{border-color:var(--line);background:var(--panel)}.candidate span{color:var(--muted)}.candidate em{font-style:normal;font-size:10px}.candidate em.publish{color:var(--acid)}.candidate em.reject{color:var(--bad)}.candidate em.pending{color:var(--warn)}main{min-width:0;padding:24px;max-width:1180px;width:100%;margin:auto}.kicker{color:var(--acid);letter-spacing:.12em;font-size:12px}h1{font-size:clamp(24px,4vw,44px);margin:8px 0 12px;line-height:1}.meta,.flags{display:flex;gap:8px;flex-wrap:wrap;color:var(--muted)}.flag{border:1px solid var(--warn);color:var(--warn);padding:3px 6px;font-size:11px}.flag.clear{border-color:var(--line);color:var(--muted)}.message{margin:16px 0;padding:12px;border-left:3px solid}.message.error{border-color:var(--bad);background:#2a1111}.message.success{border-color:var(--acid);background:#15200d}.section{margin-top:22px;border:1px solid var(--line);background:var(--panel)}.section>header{padding:12px 14px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:8px}.body{padding:14px}.raw{width:100%;min-height:280px;resize:vertical;border:1px solid var(--line);background:#080908;color:var(--ink);padding:16px;font:15px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace}.selection{display:grid;grid-template-columns:140px 140px 1fr;gap:10px;margin-top:10px}.preview{color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.wide{grid-column:1/-1}label{display:grid;gap:6px;color:var(--muted);font-size:12px}input,select,textarea{width:100%;border:1px solid var(--line);background:#090a09;color:var(--ink);padding:10px;font:inherit}textarea{min-height:90px}button{border:1px solid var(--acid);background:var(--acid);color:#111;padding:10px 14px;font:700 12px ui-monospace,monospace;cursor:pointer}button.secondary{background:transparent;color:var(--ink);border-color:var(--line)}button.danger{background:transparent;color:var(--bad);border-color:var(--bad);padding:7px 9px}.checks{display:flex;gap:18px;flex-wrap:wrap;margin:14px 0}.checks label{display:flex;align-items:center;gap:8px;color:var(--ink)}.checks input{width:auto}.saved{padding:12px;border:1px solid var(--line);margin-bottom:10px}.saved>div{display:flex;justify-content:space-between;gap:12px}.saved span{color:var(--muted);font-size:10px}.saved form{margin-top:10px}.empty{color:var(--muted)}.split{display:grid;grid-template-columns:1fr 1fr;gap:18px}.pager{display:flex;justify-content:space-between;margin-top:22px}.pager a{padding:8px;border:1px solid var(--line);text-decoration:none}.pager .disabled{opacity:.3;pointer-events:none}@media(max-width:780px){.top{position:static;align-items:flex-start;flex-direction:column}.layout{display:block}aside{border-right:0;border-bottom:1px solid var(--line);display:flex;gap:4px}.source{min-width:180px}.candidate{min-width:130px}.split,.grid,.selection{grid-template-columns:1fr}main{padding:16px}.preview{white-space:normal}.saved>div{display:block}.saved span{display:block;margin-top:5px;overflow-wrap:anywhere}}
</style></head><body>
<header class="top"><div><div class="brand">DIARY.EXE / PRIVATE REVIEW</div><div class="local">● LOCALHOST ONLY · RAW TEXT NEVER PUBLIC</div></div><div class="metrics"><span class="metric"><b>${report.metrics.candidates}</b> candidates</span><span class="metric"><b>${report.metrics.publish}</b> publish</span><span class="metric"><b>${report.metrics.reject}</b> reject</span><span class="metric"><b>${report.metrics.pending}</b> pending</span><span class="metric"><b>${report.metrics.blocked}</b> blocked</span></div></header>
<div class="layout"><aside><div class="source">RUN ${escapeHtml(queue.runId)}<br>${escapeHtml(queue.source.title)}<br>REVIEWER ${escapeHtml(reviewer)}</div>${nav}</aside><main>${message}<div class="kicker">CANDIDATE ${selectedIndex + 1} / ${queue.candidates.length}</div><h1>PAGE ${selected.pageNumber}</h1><div class="meta"><span>${escapeHtml(selected.method)}</span><span>${Math.round(selected.confidence * 100)}% confidence</span><span>${selected.rawText.length} chars</span></div><div class="flags">${flags}</div>
<section class="section"><header><strong>01 / SOURCE TRANSCRIPTION</strong><span>Select exact text below</span></header><div class="body"><textarea class="raw" id="raw-text" readonly>${escapeHtml(selected.rawText)}</textarea><div class="selection"><label>START<input id="quote-start" form="publish-form" name="quoteStart" inputmode="numeric" required></label><label>END<input id="quote-end" form="publish-form" name="quoteEnd" inputmode="numeric" required></label><label>SELECTION PREVIEW<input id="quote-preview" readonly placeholder="Select text in the source field"></label></div></div></section>
<div class="split"><section class="section"><header><strong>02 / PUBLISH RANGE</strong><span>Source verification required</span></header><div class="body"><form id="publish-form" method="post" action="/decision">${hidden}<input type="hidden" name="action" value="publish"><div class="grid"><label class="wide">TITLE<input name="title" maxlength="160" required></label><label class="wide">CONTEXT<textarea name="context" maxlength="1200" required></textarea></label><label>DATE<input type="date" name="date"></label><label>DATE PRECISION<select name="datePrecision">${option("unknown", "Unknown", true)}${option("day", "Day")}${option("month", "Month")}${option("range", "Range")}</select></label><label>RECORD TYPE<select name="recordType">${option("diary_entry", "Diary entry", true)}${option("email", "Email")}${option("transcript", "Transcript")}${option("publisher_annotation", "Publisher annotation")}${option("unknown", "Unknown")}</select></label><label>EVIDENCE<select name="evidenceKind">${option("diary_text", "Diary text", true)}${option("unresolved", "Unresolved")}</select></label><label>EDITORIAL POSTURE<select name="editorialPosture">${option("source_record", "Source record", true)}${option("publisher_claim", "Publisher claim")}${option("editorial_comparison", "Editorial comparison")}</select></label><label>RESPONSE STATE<select name="responseState">${option("not_applicable", "Not applicable", true)}${option("pending", "Pending")}${option("included", "Included")}</select></label><label>PRIVACY RESULT<select name="privacyReview">${option("clear", "Clear", true)}${option("redacted", "Redacted")}</select></label><label>THIRD-PARTY REVIEW<select name="thirdPartyReview">${option("none", "None", true)}${option("excluded", "Excluded")}</select></label><label class="wide">PRIVACY NOTE<textarea name="privacyNote" maxlength="600" required></textarea></label><label class="wide">REVIEW NOTE<textarea name="note" maxlength="600" required></textarea></label></div><div class="checks"><label><input type="checkbox" name="transcriptionVerified" value="yes" required> Transcription verified</label><label><input type="checkbox" name="sourceLinkVerified" value="yes" required> Source link verified</label></div><button type="submit">SAVE PUBLISH DECISION</button></form></div></section>
<section class="section"><header><strong>03 / REJECT PAGE</strong><span>Whole candidate only</span></header><div class="body"><form method="post" action="/decision">${hidden}<input type="hidden" name="action" value="reject"><div class="grid"><label class="wide">REASON<select name="reason">${option("not_an_entry", "Not an entry", true)}${option("privacy", "Privacy")}${option("third_party_material", "Third-party material")}${option("insufficient_context", "Insufficient context")}${option("extraction_quality", "Extraction quality")}${option("duplicate", "Duplicate")}${option("other", "Other")}</select></label><label class="wide">REVIEW NOTE<textarea name="note" maxlength="600" required></textarea></label></div><button class="secondary" type="submit">SAVE REJECTION</button></form><section class="section"><header><strong>SAVED DECISIONS</strong></header><div class="body">${decisionList}</div></section></div></section></div>
<nav class="pager"><a class="${selectedIndex === 0 ? "disabled" : ""}" href="${query(queue.candidates[Math.max(0, selectedIndex - 1)].id)}">← PREVIOUS</a><a class="${selectedIndex === queue.candidates.length - 1 ? "disabled" : ""}" href="${query(queue.candidates[Math.min(queue.candidates.length - 1, selectedIndex + 1)].id)}">NEXT →</a></nav></main></div>
  <script nonce="${escapeHtml(input.nonce)}">const raw=document.getElementById("raw-text"),start=document.getElementById("quote-start"),end=document.getElementById("quote-end"),preview=document.getElementById("quote-preview");function sync(){start.value=raw.selectionStart;end.value=raw.selectionEnd;preview.value=raw.value.slice(raw.selectionStart,raw.selectionEnd)}raw.addEventListener("select",sync);raw.addEventListener("keyup",sync);</script></body></html>`
}

async function requestBody(request: IncomingMessage) {
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += buffer.length
    if (total > MAX_REQUEST_BYTES) throw new Error("Request body is too large.")
    chunks.push(buffer)
  }
  return Buffer.concat(chunks).toString("utf8")
}

function headers(response: ServerResponse, nonce: string) {
  response.setHeader("Cache-Control", "no-store")
  response.setHeader("Referrer-Policy", "no-referrer")
  response.setHeader("X-Content-Type-Options", "nosniff")
  response.setHeader("X-Frame-Options", "DENY")
  response.setHeader(
    "Content-Security-Policy",
    `default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`
  )
}

export function createPrivateReviewWorkbenchServer(input: {
  queueFile: string
  decisionsFile: string
  reviewer: string
  token?: string
}) {
  const token = input.token ?? randomBytes(32).toString("hex")
  const server = createServer(async (request, response) => {
    const nonce = randomBytes(18).toString("base64")
    headers(response, nonce)
    try {
      const host = request.headers.host ?? ""
      const url = new URL(request.url ?? "/", `http://${host}`)
      const suppliedToken =
        request.method === "POST" ? undefined : url.searchParams.get("token")
      if (request.method === "GET" && url.pathname === "/") {
        if (!suppliedToken || !secureEqual(suppliedToken, token)) {
          response
            .writeHead(403, { "Content-Type": "text/plain; charset=utf-8" })
            .end("Forbidden")
          return
        }
        const { queue, decisions } = parsePrivateReviewArtifacts(
          JSON.parse(await readFile(input.queueFile, "utf8")),
          JSON.parse(await readFile(input.decisionsFile, "utf8"))
        )
        const html = renderPrivateReviewWorkbench({
          queue,
          artifact: decisions,
          token,
          nonce,
          reviewer: input.reviewer,
          candidateId: url.searchParams.get("candidate") ?? undefined,
          notice: url.searchParams.get("notice") ?? undefined,
        })
        response
          .writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
          .end(html)
        return
      }
      if (request.method === "POST" && url.pathname === "/decision") {
        const origin = request.headers.origin
        // Some browser navigation sandboxes serialize a same-page form origin as
        // `null`. The unguessable form token remains the CSRF credential.
        const originAllowed =
          !origin || origin === "null" || origin === `http://${host}`
        if (!/^127\.0\.0\.1:\d+$/.test(host)) {
          response
            .writeHead(403, { "Content-Type": "text/plain; charset=utf-8" })
            .end("Forbidden host")
          return
        }
        if (!originAllowed) {
          response
            .writeHead(403, { "Content-Type": "text/plain; charset=utf-8" })
            .end("Forbidden origin")
          return
        }
        const form = new URLSearchParams(await requestBody(request))
        const formToken = form.get("token") ?? ""
        if (!secureEqual(formToken, token)) {
          response
            .writeHead(403, { "Content-Type": "text/plain; charset=utf-8" })
            .end("Forbidden")
          return
        }
        const { queue, decisions } = parsePrivateReviewArtifacts(
          JSON.parse(await readFile(input.queueFile, "utf8")),
          JSON.parse(await readFile(input.decisionsFile, "utf8"))
        )
        const next = applyWorkbenchAction({
          queue,
          artifact: decisions,
          reviewer: input.reviewer,
          action: parseAction(form),
        })
        await writePrivateDecisionArtifact(
          input.decisionsFile,
          next,
          required(form, "revision")
        )
        const candidate = form.get("candidateId") ?? queue.candidates[0].id
        response
          .writeHead(303, {
            Location: `/?token=${encodeURIComponent(token)}&candidate=${encodeURIComponent(candidate)}&notice=${encodeURIComponent("Decision saved locally.")}`,
          })
          .end()
        return
      }
      response
        .writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
        .end("Not found")
    } catch (error) {
      response
        .writeHead(
          error instanceof Error &&
            error.message === "Request body is too large."
            ? 413
            : 400,
          {
            "Content-Type": "text/plain; charset=utf-8",
          }
        )
        .end(
          error instanceof Error ? error.message : "Workbench request failed."
        )
    }
  })
  return { server, token }
}
