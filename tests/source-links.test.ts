import assert from "node:assert/strict"
import test from "node:test"

import {
  officialSourcePageHref,
  sourcePageHref,
} from "../lib/archive/source-links.ts"

test("source page links omit the default and preserve exact non-default pages", () => {
  assert.equal(sourcePageHref(1), "/sources")
  assert.equal(sourcePageHref(809), "/sources?page=809")
  assert.throws(() => sourcePageHref(0), /positive integer/)
})

test("official source links replace stale fragments with the selected page", () => {
  assert.equal(
    officialSourcePageHref("https://example.org/archive.pdf#page=3", 809),
    "https://example.org/archive.pdf#page=809"
  )
  assert.throws(
    () => officialSourcePageHref("https://example.org/archive.pdf", 1.5),
    /positive integer/
  )
})
