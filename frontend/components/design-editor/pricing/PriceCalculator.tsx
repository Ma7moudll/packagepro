"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calculator, TrendingUp, Package } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { api } from "@/lib/api"

interface PricingBreakdown {
  surfaceArea: number
  materialCost: number
  conversionCost: number
  marginAmount: number
  subtotal: number
  tax: number
  shippingEstimate: number
  total: number
  material?: {
    code: string
    name: string
    unitPrice: number
  }
  productType: string
  quantity: number
  dimensions: {
    length: number
    width: number
    height: number
    unit: string
  }
}

interface PriceCalculatorProps {
  dimensions: { length: number; width: number; height: number }
  productType: "box" | "bag" | "label"
  material: string
  quantity: number
  printType?: string
}

export function PriceCalculator({
  dimensions,
  productType,
  material,
  quantity,
  printType = "print-monochrome",
}: PriceCalculatorProps) {
  const { language } = useLanguage()
  const [pricing, setPricing] = useState<PricingBreakdown | null>(null)
  const [loading, setLoading] = useState(false)
  const [quantityInput, setQuantityInput] = useState(quantity)

  useEffect(() => {
    calculatePrice()
  }, [dimensions, productType, material, quantityInput, printType])

  const calculatePrice = async () => {
    if (!dimensions || quantityInput < 1) return

    setLoading(true)
    try {
      const response = await api.post("/pricing/calculate", {
        productType,
        quantity: quantityInput,
        dimensions: {
          ...dimensions,
          unit: "mm",
        },
        materialCode: material,
        complexity: printType === "print-full-color" ? "complex" : "simple",
      })

      setPricing(response.data)
    } catch (error) {
      console.error("Failed to calculate price:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!pricing && !loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            {language === "ar" ? "حاسبة السعر" : "Price Calculator"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            {language === "ar" ? "أدخل الأبعاد والكمية لحساب السعر" : "Enter dimensions and quantity to calculate price"}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          {language === "ar" ? "حاسبة السعر" : "Price Calculator"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quantity Input */}
        <div>
          <label className="text-xs text-slate-600 mb-2 block">
            {language === "ar" ? "الكمية" : "Quantity"}
          </label>
          <input
            type="number"
            min="1"
            value={quantityInput}
            onChange={(e) => setQuantityInput(parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 border rounded text-sm"
          />
        </div>

        {loading ? (
          <div className="text-center py-4 text-slate-500">
            {language === "ar" ? "جاري الحساب..." : "Calculating..."}
          </div>
        ) : pricing ? (
          <>
            {/* Total Price */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-emerald-900">
                  {language === "ar" ? "السعر الإجمالي" : "Total Price"}
                </span>
                <span className="text-2xl font-bold text-emerald-600">
                  ${pricing.total.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-emerald-700 mt-1">
                {language === "ar" ? "لكل وحدة:" : "Per unit:"} ${(pricing.total / pricing.quantity).toFixed(2)}
              </p>
            </div>

            {/* Breakdown */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">
                  {language === "ar" ? "تكلفة المادة" : "Material Cost"}
                </span>
                <span>${pricing.materialCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">
                  {language === "ar" ? "تكلفة التحويل" : "Conversion Cost"}
                </span>
                <span>${pricing.conversionCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">
                  {language === "ar" ? "الهامش" : "Margin"}
                </span>
                <span>${pricing.marginAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">
                  {language === "ar" ? "المجموع الفرعي" : "Subtotal"}
                </span>
                <span>${pricing.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">
                  {language === "ar" ? "الشحن (تقديري)" : "Shipping (Estimate)"}
                </span>
                <span>${pricing.shippingEstimate.toFixed(2)}</span>
              </div>
            </div>

            {/* Surface Area Info */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  {language === "ar" ? "مساحة السطح" : "Surface Area"}
                </span>
                <span>{pricing.surfaceArea.toFixed(2)} cm²</span>
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

