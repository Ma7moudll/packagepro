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
import {useEditorPresetQuote} from "@/lib/editor/hooks/useEditorPresetQuote"
import { useRouter } from "next/navigation"

interface AddToCartProps {
  open?: boolean
  onOpenChange?: (open:boolean)=>void
  getDesignRevision?: ()=>string
  quoteRequired?: boolean
  productType: "box" | "bag" | "label"
  materialCode: string
  dimensions: { length: number; width: number; height: number }
  defaultQuantity: number
  onEnsureSession: () => Promise<string>
}

export function AddToCart({
  open: controlledOpen,
  onOpenChange,
  getDesignRevision,
  quoteRequired = false,
  productType,
  materialCode,
  dimensions,
  defaultQuantity,
  onEnsureSession,
}: AddToCartProps) {
  const { language } = useLanguage()
  const router = useRouter()
  const { user } = useAuth()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = (value:boolean) => {setInternalOpen(value);onOpenChange?.(value)}
  const [cartError, setCartError] = useState<string | null>(null)
  const [addedWithNewerEdits, setAddedWithNewerEdits] = useState(false)
  const [adding, setAdding] = useState(false)
  const [designName, setDesignName] = useState("")
  const [quantity, setQuantity] = useState(defaultQuantity)
  const pricing = useEditorPresetQuote(open ? quantity : defaultQuantity)
  const price = pricing.quote
  const priceLoading = pricing.status === "loading"
  const unpriced = quoteRequired || pricing.status === "unpriced"
  const priceError = pricing.status === "error" ? (language === "ar" ? "السعر غير متاح. حاول مرة أخرى." : "Price unavailable. Try again.") : null

  // The editor's quantity is loaded asynchronously (catalog config); the dialog
  // may have mounted before it resolved. Re-sync with the live model quantity
  // each time the dialog opens so the cart line matches what was designed.
  useEffect(() => {
    if (open) setQuantity(defaultQuantity)
  }, [open, defaultQuantity])

  useEffect(() => {
    if (open) {setCartError(null);setAddedWithNewerEdits(false)}
  }, [open])

  const handleAddToCart = async () => {
    if (unpriced || !price || priceLoading) return
    if (!user) {
      const redirect = encodeURIComponent(
        typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/editor"
      )
      router.push(`/login?redirect=${redirect}`)
      return
    }

    setAdding(true)
    setCartError(null)
    const revision = getDesignRevision?.()
    let phase: "save" | "cart" = "save"
    let designChanged = false
    try {
      // Existing sessions must save too, or the cart links older artwork.
      const sid = await onEnsureSession()
      if (getDesignRevision && getDesignRevision() !== revision) {
        designChanged = true
        throw new Error("Design changed during save")
      }
      phase = "cart"
      await cartApi.addItem({
        productType,
        quantity,
        dimensions: { ...dimensions, unit: "mm" },
        materialCode,
        sessionId: sid,
        productId: price.prepared.productId,
        variantId: price.prepared.variantId,
        sku: price.prepared.sku,
        // The quote and cart use the SAME validated, string-only option map.
        // A name must never replace the saved material/print/finish choices.
        config: { ...price.prepared.body.config, ...(designName.trim() ? {designName:designName.trim()} : {}) },
      })
      if (getDesignRevision && getDesignRevision() !== revision) {
        setAddedWithNewerEdits(true)
        setCartError(language === "ar" ? "تمت إضافة النسخة المحفوظة إلى السلة. التعديلات الأحدث ما زالت في المحرر ولم تُضمّن. ارجع للمحرر لمراجعتها." : "The saved version was added to the cart. Newer edits are still in the editor and were not included. Return to the editor to review them.")
        return
      }
      setOpen(false)
      router.push("/cart")
    } catch (error) {
      console.error("Failed to add to cart:", error)
      setCartError(designChanged
        ? (language === "ar" ? "تغير التصميم أثناء الحفظ. لم تتم إضافته إلى السلة. حاول مرة أخرى لحفظ التعديلات الحالية." : "The design changed while saving. Nothing was added to the cart. Try again to save the current edits.")
        : phase === "save"
          ? (language === "ar" ? "تعذر حفظ التصميم. العمل ما زال هنا ولم تتم إضافته إلى السلة. حاول مرة أخرى." : "Could not save the design. Your artwork is still here and nothing was added to the cart. Try again.")
          : (language === "ar" ? "تعذر تأكيد تحديث السلة. التصميم محفوظ. راجع السلة قبل المحاولة مرة أخرى." : "Could not confirm the cart update. Your design is saved. Check the cart before trying again."))
    } finally {
      setAdding(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={unpriced} title={unpriced ? (language === "ar" ? "المواصفات تحتاج عرض سعر" : "Specifications require a quote") : undefined} className="bg-emerald-600 hover:bg-emerald-700" size="sm" onClick={() => setDesignName("")}>
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
              disabled={adding}
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
              disabled={adding}
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
            {unpriced ? <p role="status" className="text-sm text-amber-700">{language === "ar" ? "هذه المواصفات تحتاج عرض سعر. لم يتم استبدالها بإعداد آخر." : "This configuration requires a quote. No preset was substituted."}</p> : priceLoading ? (
              <div className="flex justify-between text-sm text-slate-400">
                <span>{language === "ar" ? "جاري حساب السعر..." : "Calculating price..."}</span>
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : priceError ? (
              <div><p className="text-sm text-red-500">{priceError}</p><Button variant="outline" size="sm" onClick={pricing.retry}>{language === "ar" ? "إعادة حساب السعر" : "Retry price"}</Button></div>
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
                  <span data-testid="editor-dialog-total">{language === "ar" ? `${price.total.toFixed(2)} ج.م` : `EGP ${price.total.toFixed(2)}`}</span>
                </div>
              </>
            ) : null}
          </div>

          {cartError && <p role="alert" className="text-sm text-red-600">{cartError}</p>}
          {addedWithNewerEdits && <Button variant="outline" onClick={() => setOpen(false)}>{language === "ar" ? "العودة للمحرر" : "Return to editor"}</Button>}

          {/* Add to Cart Button */}
          <Button
            onClick={handleAddToCart}
            disabled={unpriced || !price || adding || priceLoading || addedWithNewerEdits}
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