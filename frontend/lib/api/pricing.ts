import { apiPost } from "@/lib/api/client"
import type { ApiResponse, PricingRequest, PricingResponse } from "@shared/types"

export const pricingApi = {
  calculate: (payload: PricingRequest): Promise<ApiResponse<PricingResponse>> =>
    apiPost<PricingResponse>("/pricing/calculate", payload),
}