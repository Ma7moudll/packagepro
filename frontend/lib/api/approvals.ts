/**
 * Proof-approval token flow (Decision A):
 *   - Customer reaches the approval page from the email URL
 *     /orders/:orderId/approve?token=...
 *   - Approves via the existing POST /orders/:id/approve endpoint
 *     (NO duplicate backend API).
 *   - Requests changes via PATCH /orders/:id/status → pending_review.
 */
import { apiGet, apiPost, apiPatch } from "./client"
import type { Order } from "@shared/types"

export const approvalsApi = {
  /** GET /orders/:id — includes design.files, shipment, customer.user. */
  getById: (id: string) => apiGet<Order>(`/orders/${id}`),

  /** POST /orders/:id/approve { token } — token-based, NO auth header needed server-side. */
  approve: (id: string, token: string) =>
    apiPost<{ message: string }>(`/orders/${id}/approve`, { token }),

  /** PATCH /orders/:id/status { status: "pending_review" } — bounce back for vendor revision. */
  requestChanges: (id: string) =>
    apiPatch<Order>(`/orders/${id}/status`, { status: "pending_review" }),
}
