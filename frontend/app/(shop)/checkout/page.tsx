"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useCartStore } from "@/lib/ecommerce/cart-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CreditCard, AlertCircle, ShoppingCart, ArrowRight, ArrowLeft } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { useAuth } from "@/providers/auth-provider"
import { StripePayment } from "@/components/ecommerce/StripePayment"
import { shippingSplitRows } from "@/lib/ecommerce/shipping-split"
import type { ShippingAddress } from "@/lib/ecommerce/types"

export default function CheckoutPage() {
  const { language } = useLanguage()
  const router = useRouter()
  const { user } = useAuth()
  const { cart, loading: cartLoading, error: cartError, refresh } = useCartStore()

  const [step, setStep] = useState<"shipping" | "payment">("shipping")
  const [error, setError] = useState("")

  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: user?.name || "",
    phone: "",
    email: user?.email || "",
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "United States",
  })

  useEffect(() => {
    if (!user) {
      router.push("/login?redirect=/checkout")
      return
    }
    refresh()
  }, [user, refresh, router])

  const items = cart?.items ?? []
  const summary = cart?.summary
  const designSessionId = items.find((i) => i.sessionId)?.sessionId ?? undefined

  if (cartLoading) {
    return (
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (cartError) {
    return (
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="container mx-auto px-4 max-w-lg">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{cartError}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    router.replace("/cart")
    return null
  }

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setStep("payment")
  }

  const currency = cart?.currency || "USD"
  const formatMoney = (n: number) =>
    `${n.toFixed(2)} ${currency}`

  // 4c: one shipping row per vendor group when the cart spans multiple
  // productTypes (multiple purchase orders will ship separately); the flat
  // row stays for single-group carts.
  const splitRows = shippingSplitRows(summary, items)

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-3xl font-bold mb-8">
          {language === "ar" ? "إتمام الطلب" : "Checkout"}
        </h1>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-md">
            {(["shipping", "payment"] as const).map((s, idx) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {idx + 1}
                </div>
                <span className="font-medium text-sm hidden sm:inline">
                  {s === "shipping"
                    ? language === "ar" ? "الشحن" : "Shipping"
                    : language === "ar" ? "الدفع" : "Payment"}
                </span>
                {idx === 0 && <div className="flex-1 h-0.5 bg-slate-200 mx-4 w-16" />}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {step === "shipping" && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {language === "ar" ? "عنوان الشحن" : "Shipping Address"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleShippingSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">{language === "ar" ? "الاسم الكامل" : "Full Name"} *</Label>
                        <Input id="name" value={shippingAddress.name} onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })} required />
                      </div>
                      <div>
                        <Label htmlFor="phone">{language === "ar" ? "الهاتف" : "Phone"} *</Label>
                        <Input id="phone" type="tel" value={shippingAddress.phone} onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })} required />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email">{language === "ar" ? "البريد الإلكتروني" : "Email"}</Label>
                      <Input id="email" type="email" value={shippingAddress.email} onChange={(e) => setShippingAddress({ ...shippingAddress, email: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="street">{language === "ar" ? "العنوان" : "Address"} *</Label>
                      <Input id="street" value={shippingAddress.street} onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })} required />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="city">{language === "ar" ? "المدينة" : "City"} *</Label>
                        <Input id="city" value={shippingAddress.city} onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })} required />
                      </div>
                      <div>
                        <Label htmlFor="state">{language === "ar" ? "المنطقة" : "State"} *</Label>
                        <Input id="state" value={shippingAddress.state} onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })} required />
                      </div>
                      <div>
                        <Label htmlFor="postalCode">{language === "ar" ? "الرمز البريدي" : "Zip Code"} *</Label>
                        <Input id="postalCode" value={shippingAddress.postalCode} onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })} required />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="country">{language === "ar" ? "الدولة" : "Country"} *</Label>
                      <Input id="country" value={shippingAddress.country} onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })} required />
                    </div>
                    <Button type="submit" className="w-full">
                      {language === "ar" ? "المتابعة للدفع" : "Continue to Payment"}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {step === "payment" && (
              <Card>
                <CardHeader>
                  <CardTitle>{language === "ar" ? "طريقة الدفع" : "Payment Method"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CreditCard className="h-4 w-4" />
                    {language === "ar"
                      ? "الدفع بالبطاقة عبر Stripe (بيئة اختبار – استخدم 4242 4242 4242 4242)"
                      : "Card payment via Stripe (test mode — use card 4242 4242 4242 4242)"}
                  </div>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {language === "ar"
                        ? "سيتم إنشاء طلبك فور تأكيد الدفع"
                        : "Your order is created immediately when payment is confirmed"}
                    </AlertDescription>
                  </Alert>
                  <StripePayment shippingAddress={shippingAddress} designSessionId={designSessionId} />
                  <Button
                    variant="ghost"
                    onClick={() => setStep("shipping")}
                    className="w-full"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {language === "ar" ? "العودة للشحن" : "Back to shipping"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>{language === "ar" ? "ملخص الطلب" : "Order Summary"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="flex items-center gap-2 min-w-0">
                        {item.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.thumbnail} alt={item.name || item.productType} className="w-10 h-10 rounded object-cover shrink-0" />
                        ) : (
                          <ShoppingCart className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className="truncate">{item.name || item.productType} x {item.quantity}</span>
                      </span>
                      <span>{item.totalPrice.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                {summary && (
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">{language === "ar" ? "المجموع الفرعي" : "Subtotal"}</span>
                      <span>{formatMoney(summary.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">{language === "ar" ? "الضريبة" : "Tax"}</span>
                      <span>{formatMoney(summary.tax)}</span>
                    </div>
                    {splitRows.length > 1 ? (
                      splitRows.map((row) => (
                        <div key={row.productType} className="flex justify-between text-sm">
                          <span className="text-slate-600">
                            {language === "ar"
                              ? `الشحن — ${row.productType}`
                              : `Shipping — ${row.productType.charAt(0).toUpperCase()}${row.productType.slice(1)}`}
                          </span>
                          <span>{formatMoney(row.shipping)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">{language === "ar" ? "الشحن" : "Shipping"}</span>
                        <span>
                          {summary.shipping === 0
                            ? language === "ar" ? "مجاني" : "Free"
                            : formatMoney(summary.shipping)}
                        </span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>{language === "ar" ? "الإجمالي" : "Total"}</span>
                      <span>{formatMoney(summary.total)}</span>
                    </div>
                    <p className="text-xs text-slate-500 text-center pt-2">
                      {language === "ar"
                        ? "تخضع الأسعار لتأكيد الخادم عند إنشاء الطلب"
                        : "Prices are confirmed server-side when the order is created"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}