import { test } from "node:test"
import assert from "node:assert/strict"
import { parseSSE } from "../lib/notifications/stream.ts"

// Step-4 Piece 5 — the shared SSE frame parser both the notifications stream
// and the new admin analytics stream (`subscribeToAdminAnalytics`) rely on.

test("parseSSE keeps the default message type for plain frames", () => {
  const event = parseSSE("data: hello\n")
  assert.equal(event.type, "message")
  assert.equal(event.data, "hello")
})

test("parseSSE extracts the event type and single data line", () => {
  const event = parseSSE('event: summary\ndata: {"revenue": 10}\n')
  assert.equal(event.type, "summary")
  assert.equal(event.data, '{"revenue": 10}')
})

test("parseSSE joins multi-line data payloads and strips comments", () => {
  const event = parseSSE("event: summary\ndata: first\ndata: second\n: ping\n")
  assert.equal(event.type, "summary")
  assert.equal(event.data, "first\nsecond")
})

test("parseSSE returns a type-only event when no data lines exist", () => {
  const event = parseSSE(": ping\n")
  assert.equal(event.type, "message")
  assert.equal(event.data, undefined)
})
