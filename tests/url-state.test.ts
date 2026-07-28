import assert from "node:assert/strict"
import test from "node:test"

import {
  readEnumParam,
  readPositiveIntParam,
  withArchiveParams,
} from "../lib/archive/url-state.ts"

test("archive URL updates preserve unrelated state and sort deterministically", () => {
  const current = new URLSearchParams("trace=entry-demo-001&q=source")
  const href = withArchiveParams("/timeline", current, {
    density: "dense",
    q: null,
    topic: "topic-review",
  })

  assert.equal(
    href,
    "/timeline?density=dense&topic=topic-review&trace=entry-demo-001"
  )
})

test("archive URL removes empty values and omits an empty query string", () => {
  const current = new URLSearchParams("q=source")
  assert.equal(withArchiveParams("/timeline", current, { q: "" }), "/timeline")
})

test("receipt permalinks preserve filters and replace an open trace", () => {
  const current = new URLSearchParams("trace=entry-demo-002&topic=topic-review")
  const href = withArchiveParams("/receipts", current, {
    receipt: "entry-demo-001",
    trace: null,
  })

  assert.equal(href, "/receipts?receipt=entry-demo-001&topic=topic-review")
})

test("archive URL readers reject invalid enum and page values", () => {
  const params = new URLSearchParams("density=huge&page=999")

  assert.equal(
    readEnumParam(params, "density", ["readable", "dense"], "readable"),
    "readable"
  )
  assert.equal(readPositiveIntParam(params, "page", [1, 2, 3], 1), 1)
})
