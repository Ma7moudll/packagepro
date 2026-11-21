"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShoppingCart, Loader2 } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { useAuth } from "@/providers/auth-provider"
import { cartApi } from "@/lib/api/cart"
import { pricingApi } from "@/lib/api/pricing"
import { useRouter } from "next/navigation"

interface AddToCartProps {
  productType: "box" | "bag" | "label"
  materialCode: string
  dimensions: { length: number; width: number; height: number }
  defaultQuantity: number
  sessionId: string | null
  onEnsureSession: () => Promise<string>
}

export function AddToCart({
  productType,
  materialCode,
  dimensions,
  defaultQuantity,
  sessionId,
  onEnsureSession,
}: AddToCartProps) {
  const { language } = useLanguage()
  const router = useRouter()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [designName, setDesignName] = useState("")
  const [quantity, setQuantity] = useState(defaultQuantity)
  const [price, setPrice] = useState<{ total: number; unit: number } | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)
  const [priceError, setPriceError] = useState<string | null>(null)

  // The editor's quantity is loaded asynchronously (catalog config); the dialog
  // may have mounted before it resolved. Re-sync with the live model quantity
  // each time the dialog opens so the cart line matches what was designed.
  useEffect(() => {
    if (open) setQuantity(defaultQuantity)
  }, [open, defaultQuantity])

  useEffect(() => {
    let cancelled = false
    if (!open) return
    setPriceLoading(true)
    setPriceError(null)
    pricingApi
      .calculate({
        productType,
        quantity,
        dimensions: { ...dimensions, unit: "mm" },
        materialCode,
      })
      .then((res) => {
        if (!cancelled && res.success && res.data) {
          setPrice({ total: res.data.totalPrice, unit: res.data.totalPrice / quantity })
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setPriceError(error?.message || "Price unavailable")
          setPrice(null)
        }
      })
      .finally(() => {
        if (!cancelled) setPriceLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, quantity, productType, dimensions, materialCode])

  const handleAddToCart = async () => {
    if (!user) {
      const redirect = encodeURIComponent(
        typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/editor"
      )
      router.push(`/login?redirect=${redirect}`)
      return
    }

    setAdding(true)
    try {
      const sid = sessionId || (await onEnsureSession())
      await cartApi.addItem({
        productType,
        quantity,
        dimensions: { ...dimensions, unit: "mm" },
        materialCode,
        sessionId: sid,
        // The backend passes config through to the cart line; keep the
        // entered design name with the item (no dedicated column yet).
        ...(designName.trim() ? { config: { designName: designName.trim() } } : {}),
      })
      setOpen(false)
      router.push("/cart")
    } catch (error) {
      console.error("Failed to add to cart:", error)
    } finally {
      setAdding(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700" size="sm" onClick={() => setDesignName("")}>
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
            {language === "ar" ? "أدخل اسم التصميم والكمية وأضفه إلى السلة" : "Enter a design name and quantity, then add it to cart"}
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

          {/* Quantity */}
          <div>
            <Label htmlFor="quantity">
              {language === "ar" ? "الكمية" : "Quantity"}
            </Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-32"
            />
          </div>

          {/* Order Summary - server priced */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">
                {language === "ar" ? "الكمية" : "Quantity"}
              </span>
              <span>{quantity}</span>
            </div>
            {priceLoading ? (
              <div className="flex justify-between text-sm text-slate-400">
                <span>{language === "ar" ? "جاري حساب السعر..." : "Calculating price..."}</span>
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : priceError ? (
              <p className="text-sm text-red-500">{priceError}</p>
            ) : price ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">
                    {language === "ar" ? "السعر لكل وحدة (شامل الشحن)" : "Price per unit (incl. shipping)"}
                  </span>
                  <span>{language === "ar" ? `${price.unit.toFixed(2)} ج.م` : `EGP ${price.unit.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>
                    {language === "ar" ? "الإجمالي" : "Total"}
                  </span>
                  <span>{language === "ar" ? `${price.total.toFixed(2)} ج.م` : `EGP ${price.total.toFixed(2)}`}</span>
                </div>
              </>
            ) : null}
          </div>

          {/* Add to Cart Button */}
          <Button
            onClick={handleAddToCart}
            disabled={adding || priceLoading}
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
                {user
                  ? (language === "ar" ? "إضافة إلى السلة" : "Add to Cart")
                  : (language === "ar" ? "سجّل الدخول للمتابعة" : "Sign in to continue")}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}