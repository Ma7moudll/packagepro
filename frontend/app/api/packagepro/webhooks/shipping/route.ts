/**
 * PackagePro Shipping Webhook Handler — RETIRED (SEC-03d)
 *
 * This legacy frontend webhook endpoint has been decommissioned. Carrier
 * tracking updates are now handled exclusively by the Fastify backend
 * webhook (POST /webhooks/dhl), which re-verifies every delivery claim
 * against the DHL Track API before changing any order state. The old
 * handler proxied to the backend and returned success even when the
 * proxy failed, so a delivery could be "acknowledged" without ever
 * being recorded.
 *
 * This route file stays in place only so the URL keeps answering
 * 410 Gone instead of silently 404ing.
 */

import { NextRequest, NextResponse } from "next/server"

const GONE_BODY = {
  error: "GONE",
  message:
    "This legacy webhook endpoint has been retired (SEC-03d). Use the backend webhook instead: POST /webhooks/dhl on the Fastify backend.",
}

function gone() {
  return NextResponse.json(GONE_BODY, { status: 410 })
}

export const POST = async (_request: NextRequest) => gone()
export const GET = async (_request: NextRequest) => gone()
export const PUT = async (_request: NextRequest) => gone()
export const DELETE = async (_request: NextRequest) => gone()
export const PATCH = async (_request: NextRequest) => gone()
