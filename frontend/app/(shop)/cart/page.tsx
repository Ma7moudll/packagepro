"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useCartStore } from "@/lib/ecommerce/cart-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight, Loader2, AlertCircle } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { useAuth } from "@/providers/auth-provider"
import { designsApi } from "@/lib/api/designs"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function CartPage() {
  const { language } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { cart, loading, error, refresh, addItem, removeItem, updateQuantity, clearCart } = useCartStore()

  const [importingDesign, setImportingDesign] = useState(false)
  const importedDesignRef = useRef<string | null>(null)

  useEffect(() => {
    if (!user) {
      router.push("/login?redirect=/cart")
      return
    }
    refresh()
  }, [user, refresh, router])

  useEffect(() => {
    const designSessionId = searchParams.get("design")
    if (!user || !designSessionId) return
    if (importedDesignRef.current === designSessionId) return
    if (cart?.items.some((i) => i.sessionId === designSessionId)) return

    const importDesign = async () => {
      importedDesignRef.current = designSessionId
      setImportingDesign(true)
      try {
        const res = await designsApi.getSession(designSessionId)
        const session = res.success && res.data ? (res.data as any) : null
        await addItem({
          productType: "box",
          quantity: session?.quantity || 30,
          dimensions: session?.dimensions || { length: 100, width: 100, height: 50, unit: "mm" },
          materialCode: session?.materialCode || "kraft",
          sessionId: designSessionId,
        })
      } catch {
        await addItem({
          productType: "box",
          quantity: 30,
          dimensions: { length: 100, width: 100, height: 50, unit: "mm" },
          materialCode: "kraft",
          sessionId: designSessionId,
        })
      }
      setImportingDesign(false)
      const params = new URLSearchParams(searchParams.toString())
      params.delete("design")
      router.replace(`/cart${params.toString() ? `?${params.toString()}` : ""}`)
    }

    importDesign()
  }, [user, searchParams, cart, addItem, router])

  if (importingDesign) {
    return (
      <div className="min-h-screen bg-slate-50 py-12">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </div>
    )
  }

  if (loading && !cart) {
    return (
      <div className="min-h-screen bg-slate-50 py-12">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 py-12">
        <div className="container mx-auto px-4 max-w-lg">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  const items = cart?.items ?? []
  const summary = cart?.summary

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center py-12">
            <ShoppingCart className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">
              {language === "ar" ? "السلة فارغة" : "Your cart is empty"}
            </h2>
            <p className="text-slate-600 mb-6">
              {language === "ar"
                ? "ابدأ بإضافة منتجات إلى سلة التسوق"
                : "Start adding products to your cart"}
            </p>
            <Link href="/products">
              <Button>
                {language === "ar" ? "تصفح المنتجات" : "Browse Products"}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const currency = cart?.currency || "USD"
  const formatMoney = (n: number) => `${n.toFixed(2)} ${currency}`

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-3xl font-bold mb-8">
          {language === "ar" ? "سلة التسوق" : "Shopping Cart"}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {language === "ar" ? "المنتجات" : "Items"} ({items.length})
              </h2>
              <Button variant="ghost" size="sm" onClick={() => clearCart()}>
                <Trash2 className="h-4 w-4 mr-2" />
                {language === "ar" ? "مسح السلة" : "Clear Cart"}
              </Button>
            </div>

            <div className="space-y-4">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 bg-slate-200 rounded flex items-center justify-center shrink-0">
                        {item.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.thumbnail}
                            alt={item.name || item.productType}
                            className="w-24 h-24 object-cover rounded"
                          />
                        ) : (
                          <ShoppingCart className="h-8 w-8 text-slate-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-1">{item.name || item.productType}</h3>
                        <p className="text-sm text-slate-500 mb-2">
                          {item.productType.toUpperCase()} · {item.materialCode || "default"}
                        </p>
                        {item.templateId && (
                          <p className="text-xs text-emerald-600 mb-2">
                            {language === "ar" ? "قالب مخصص" : "From template"}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                updateQuantity(item.id, parseInt(e.target.value) || 1)
                              }
                              className="w-16 text-center h-8"
                              min={1}
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="flex items-center gap-4">
                            <p className="font-semibold">{item.totalPrice.toFixed(2)} USD</p>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>
                  {language === "ar" ? "ملخص الطلب" : "Order Summary"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {summary && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">
                        {language === "ar" ? "المجموع الفرعي" : "Subtotal"}
                      </span>
                      <span>{formatMoney(summary.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">
                        {language === "ar" ? "الضريبة" : "Tax"}
                      </span>
                      <span>{formatMoney(summary.tax)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">
                        {language === "ar" ? "الشحن" : "Shipping"}
                      </span>
                      <span>
                        {summary.shipping === 0
                          ? language === "ar" ? "مجاني" : "Free"
                          : formatMoney(summary.shipping)}
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>{language === "ar" ? "الإجمالي" : "Total"}</span>
                      <span>{formatMoney(summary.total)}</span>
                    </div>
                  </div>
                )}

                <Link href="/checkout">
                  <Button className="w-full" size="lg">
                    {language === "ar" ? "إتمام الطلب" : "Proceed to Checkout"}
                    <ArrowRight className="h-4 w-4 mr-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}