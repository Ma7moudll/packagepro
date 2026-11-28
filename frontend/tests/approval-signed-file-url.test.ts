import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { approvalProofUrl } from "../lib/orders/approval-proof.ts"

// The backend signs /api/files/ URLs in its JSON responses (?exp=&sig=). The
// pages render them as given, so the helper must keep the query string.
test("a signed local file URL keeps exp and sig when made absolute", () => {
  const out = approvalProofUrl("/api/files/proofs/p.pdf?exp=1900000000&sig=" + "a".repeat(64), "http://localhost:4000/api", "http://localhost:3000")
  assert.equal(out, "http://localhost:4000/api/files/proofs/p.pdf?exp=1900000000&sig=" + "a".repeat(64))
})

test("pages use the response fileUrl as given (no rebuilt or stripped URL)", () => {
  for (const [file, needle] of [
    ["app/(customer)/designs/[id]/page.tsx", "src={preview.fileUrl}"],
    ["app/(customer)/designs/[id]/page.tsx", "href={f.fileUrl}"],
    ["app/(customer)/designs/page.tsx", "src={preview.fileUrl}"],
    ["app/(customer)/orders/[id]/approve/page.tsx", "href={proofFile.fileUrl}"],
  ] as const) assert.ok(readFileSync(file, "utf8").includes(needle), `${file}: ${needle}`)
})
