"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShoppingCart, Loader2 } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"

interface AddToCartProps {
  designData: any
  dimensions: { length: number; width: number; height: number }
  productType: string
  material: string
  quantity: number
  price: number
}

export function AddToCart({
  designData,
  dimensions,
  productType,
  material,
  quantity,
  price,
}: AddToCartProps) {
  const { language } = useLanguage()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [designName, setDesignName] = useState("")

  const handleAddToCart = async () => {
    setAdding(true)
    try {
      // First, save the design
      const sessionResponse = await api.post("/designs/session", {
        name: designName || "Custom Design",
      })

      const sessionId = sessionResponse.data.sessionId

      // Save design data
      await api.post("/designs/save", {
        sessionId,
        designData,
        name: designName || "Custom Design",
      })

      // Create order item (or add to existing cart)
      // This would typically call a cart API
      // For now, redirect to cart/checkout

      setOpen(false)
      router.push(`/cart?design=${sessionId}`)
    } catch (error) {
      console.error("Failed to add to cart:", error)
    } finally {
      setAdding(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <ShoppingCart className="h-4 w-4 mr-2" />
          {language === "ar" ? "إضافة إلى السلة" : "Add to Cart"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {language === "ar" ? "إضافة إلى السلة" : "Add to Cart"}
          </DialogTitle>
          <DialogDescription>
            {language === "ar" ? "أدخل اسم للتصميم وأضفه إلى السلة" : "Enter a name for your design and add it to cart"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Design Name */}
          <div>
            <Label htmlFor="designName">
              {language === "ar" ? "اسم التصميم" : "Design Name"}
            </Label>
            <Input
              id="designName"
              value={designName}
              onChange={(e) => setDesignName(e.target.value)}
              placeholder={language === "ar" ? "اسم التصميم..." : "Design name..."}
            />
          </div>

          {/* Order Summary */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">
                {language === "ar" ? "الكمية" : "Quantity"}
              </span>
              <span>{quantity}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">
                {language === "ar" ? "السعر لكل وحدة" : "Price per unit"}
              </span>
              <span>${(price / quantity).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold pt-2 border-t">
              <span>
                {language === "ar" ? "الإجمالي" : "Total"}
              </span>
              <span>${price.toFixed(2)}</span>
            </div>
          </div>

          {/* Add to Cart Button */}
          <Button
            onClick={handleAddToCart}
            disabled={adding || !designName.trim()}
            className="w-full"
          >
            {adding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {language === "ar" ? "جاري الإضافة..." : "Adding..."}
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4 mr-2" />
                {language === "ar" ? "إضافة إلى السلة" : "Add to Cart"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

