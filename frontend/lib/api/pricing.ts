import { apiPost } from "@/lib/api/client"

export interface PricingRequest {
  productType: string
  quantity: number
  dimensions: {
    length: number
    width: number
    height?: number
    unit: string
  }
  materialCode?: string
  complexity?: "simple" | "medium" | "complex"
}

export interface PricingBreakdown {
  subtotal: number
  tax: number
  shippingEstimate: number
  unitCost: number
  [key: string]: number | undefined
}

export interface PricingResult {
  totalPrice: number
  unitPrice?: number
  breakdown: PricingBreakdown
}

export const pricingApi = {
  calculate: async (payload: PricingRequest) => {
    const res = await apiPost<{ success: boolean; data: PricingResult }>(
      "/pricing/calculate",
      payload
    )
    return res.data
  },
}