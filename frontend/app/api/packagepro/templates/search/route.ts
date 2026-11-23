import { NextResponse } from "next/server"

// Retired in-memory template API. The real backend enforces ADMIN authoring.
// This stays retired even in development or with the legacy mock override.
function gone() {
  return NextResponse.json({ success: false, error: "GONE", message: "Use the PackagePro backend template API" }, { status: 410 })
}
export { gone as GET, gone as POST, gone as PUT, gone as PATCH, gone as DELETE, gone as OPTIONS, gone as HEAD }
