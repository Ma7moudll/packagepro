/**
 * Proof-approval token flow (Decision A):
 *   - Customer reaches the approval page from the email URL
 *     /orders/:orderId/approve?token=...
 *   - Approves via the existing POST /orders/:id/approve endpoint
 *     (NO duplicate backend API).
 *   - Revision guidance routes the customer to the order administrator.
 *     Only the separate admin reopen endpoint can return an order to review.
 */
import { apiGet, apiPost } from "./client"
import type { Order } from "@shared/types"

export const approvalsApi = {
  /** GET /orders/:id — includes design.files, shipment, customer.user. */
  getById: (id: string) => apiGet<Order>(`/orders/${id}`),

  /** POST /orders/:id/approve { token } — token-based, NO auth header needed server-side. */
  approve: (id: string, token: string) =>
    apiPost<{ message: string }>(`/orders/${id}/approve`, { token }),

}
