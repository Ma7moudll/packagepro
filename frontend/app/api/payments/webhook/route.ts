/**
 * Payments Webhook Handler — RETIRED (SEC-03d)
 *
 * This legacy frontend webhook endpoint has been decommissioned. Payment
 * events are now handled exclusively by the Fastify backend webhook
 * (POST /webhooks/stripe), which verifies the Stripe signature against
 * the raw request body and records events in the ProcessedStripeEvent
 * ledger. The old handler trusted an unverified payload and changed
 * order state through mock services, so a forged event could mark an
 * order PAYMENT_CONFIRMED without any real payment.
 *
 * This route file stays in place only so the URL keeps answering
 * 410 Gone instead of silently 404ing.
 */

import { NextRequest, NextResponse } from "next/server"

const GONE_BODY = {
  error: "GONE",
  message:
    "This legacy webhook endpoint has been retired (SEC-03d). Use the backend webhook instead: POST /webhooks/stripe on the Fastify backend.",
}

function gone() {
  return NextResponse.json(GONE_BODY, { status: 410 })
}

export const POST = async (_request: NextRequest) => gone()
export const GET = async (_request: NextRequest) => gone()
export const PUT = async (_request: NextRequest) => gone()
export const DELETE = async (_request: NextRequest) => gone()
export const PATCH = async (_request: NextRequest) => gone()
