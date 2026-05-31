"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useCartStore } from "@/lib/ecommerce/cart-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CreditCard, Truck, AlertCircle, CheckCircle2 } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { ShippingAddress, BillingAddress, PaymentMethod } from "@/lib/ecommerce/types"
import { StripePayment } from "@/components/ecommerce/StripePayment"
import { PayPalPayment } from "@/components/ecommerce/PayPalPayment"

export default function CheckoutPage() {
  const { language } = useLanguage()
  const router = useRouter()
  const { items, subtotal, tax, shipping, total, clearCart } = useCartStore()

  const [step, setStep] = useState<"shipping" | "payment" | "review">("shipping")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "Saudi Arabia",
  })

  const [billingAddress, setBillingAddress] = useState<BillingAddress>({
    ...shippingAddress,
    sameAsShipping: true,
  })

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod["type"]>("stripe")
  const [paymentData, setPaymentData] = useState<any>(null)

  if (items.length === 0) {
    router.push("/cart")
    return null
  }

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setStep("payment")
  }

  const handlePaymentSubmit = async (paymentMethodData: any) => {
    setPaymentData(paymentMethodData)
    setStep("review")
  }

  const handlePlaceOrder = async () => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/ecommerce/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          shippingAddress,
          billingAddress,
          paymentMethod: {
            type: paymentMethod,
            ...paymentData,
          },
        }),
      })

      const order = await response.json()

      if (!response.ok) {
        throw new Error(order.message || "Failed to place order")
      }

      // Clear cart
      clearCart()

      // Redirect to order confirmation
      router.push(`/orders/${order.id}`)
    } catch (err: any) {
      setError(err.message || (language === "ar" ? "حدث خطأ" : "An error occurred"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-3xl font-bold mb-8">
          {language === "ar" ? "إتمام الطلب" : "Checkout"}
        </h1>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 ${step === "shipping" ? "text-emerald-600" : ""}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "shipping" ? "bg-emerald-600 text-white" : "bg-slate-200"
                  }`}
              >
                1
              </div>
              <span className="font-medium">
                {language === "ar" ? "الشحن" : "Shipping"}
              </span>
            </div>
            <div className="flex-1 h-0.5 bg-slate-200 mx-4" />
            <div className={`flex items-center gap-2 ${step === "payment" ? "text-emerald-600" : ""}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "payment" ? "bg-emerald-600 text-white" : "bg-slate-200"
                  }`}
              >
                2
              </div>
              <span className="font-medium">
                {language === "ar" ? "الدفع" : "Payment"}
              </span>
            </div>
            <div className="flex-1 h-0.5 bg-slate-200 mx-4" />
            <div className={`flex items-center gap-2 ${step === "review" ? "text-emerald-600" : ""}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "review" ? "bg-emerald-600 text-white" : "bg-slate-200"
                  }`}
              >
                3
              </div>
              <span className="font-medium">
                {language === "ar" ? "المراجعة" : "Review"}
              </span>
            </div>
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
                        <Label htmlFor="firstName">
                          {language === "ar" ? "الاسم الأول" : "First Name"} *
                        </Label>
                        <Input
                          id="firstName"
                          value={shippingAddress.firstName}
                          onChange={(e) =>
                            setShippingAddress({ ...shippingAddress, firstName: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">
                          {language === "ar" ? "اسم العائلة" : "Last Name"} *
                        </Label>
                        <Input
                          id="lastName"
                          value={shippingAddress.lastName}
                          onChange={(e) =>
                            setShippingAddress({ ...shippingAddress, lastName: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email">
                        {language === "ar" ? "البريد الإلكتروني" : "Email"} *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={shippingAddress.email}
                        onChange={(e) =>
                          setShippingAddress({ ...shippingAddress, email: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">
                        {language === "ar" ? "الهاتف" : "Phone"} *
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={shippingAddress.phone}
                        onChange={(e) =>
                          setShippingAddress({ ...shippingAddress, phone: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="address">
                        {language === "ar" ? "العنوان" : "Address"} *
                      </Label>
                      <Input
                        id="address"
                        value={shippingAddress.address}
                        onChange={(e) =>
                          setShippingAddress({ ...shippingAddress, address: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="city">
                          {language === "ar" ? "المدينة" : "City"} *
                        </Label>
                        <Input
                          id="city"
                          value={shippingAddress.city}
                          onChange={(e) =>
                            setShippingAddress({ ...shippingAddress, city: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">
                          {language === "ar" ? "المنطقة" : "State"} *
                        </Label>
                        <Input
                          id="state"
                          value={shippingAddress.state}
                          onChange={(e) =>
                            setShippingAddress({ ...shippingAddress, state: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="zipCode">
                          {language === "ar" ? "الرمز البريدي" : "Zip Code"} *
                        </Label>
                        <Input
                          id="zipCode"
                          value={shippingAddress.zipCode}
                          onChange={(e) =>
                            setShippingAddress({ ...shippingAddress, zipCode: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="country">
                        {language === "ar" ? "الدولة" : "Country"} *
                      </Label>
                      <Input
                        id="country"
                        value={shippingAddress.country}
                        onChange={(e) =>
                          setShippingAddress({ ...shippingAddress, country: e.target.value })
                        }
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full">
                      {language === "ar" ? "المتابعة للدفع" : "Continue to Payment"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {step === "payment" && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {language === "ar" ? "طريقة الدفع" : "Payment Method"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="stripe">
                        <CreditCard className="h-4 w-4 mr-2" />
                        {language === "ar" ? "بطاقة" : "Card"}
                      </TabsTrigger>
                      <TabsTrigger value="paypal">
                        <CreditCard className="h-4 w-4 mr-2" />
                        PayPal
                      </TabsTrigger>
                      <TabsTrigger value="cash_on_delivery">
                        <Truck className="h-4 w-4 mr-2" />
                        {language === "ar" ? "الدفع عند الاستلام" : "COD"}
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="stripe" className="mt-4">
                      <StripePayment
                        amount={total}
                        onSuccess={handlePaymentSubmit}
                        onError={setError}
                      />
                    </TabsContent>

                    <TabsContent value="paypal" className="mt-4">
                      <PayPalPayment
                        amount={total}
                        onSuccess={handlePaymentSubmit}
                        onError={setError}
                      />
                    </TabsContent>

                    <TabsContent value="cash_on_delivery" className="mt-4">
                      <div className="text-center py-8">
                        <Truck className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
                        <p className="text-slate-600 mb-4">
                          {language === "ar"
                            ? "ستقوم بدفع المبلغ عند استلام الطلب"
                            : "You will pay when you receive the order"}
                        </p>
                        <Button onClick={() => handlePaymentSubmit({})}>
                          {language === "ar" ? "تأكيد الطلب" : "Confirm Order"}
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {step === "review" && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {language === "ar" ? "مراجعة الطلب" : "Review Order"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">
                      {language === "ar" ? "عنوان الشحن" : "Shipping Address"}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {shippingAddress.firstName} {shippingAddress.lastName}
                      <br />
                      {shippingAddress.address}
                      <br />
                      {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}
                      <br />
                      {shippingAddress.country}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">
                      {language === "ar" ? "طريقة الدفع" : "Payment Method"}
                    </h3>
                    <p className="text-sm text-slate-600 capitalize">
                      {paymentMethod === "stripe"
                        ? language === "ar"
                          ? "بطاقة ائتمانية"
                          : "Credit Card"
                        : paymentMethod === "paypal"
                          ? "PayPal"
                          : language === "ar"
                            ? "الدفع عند الاستلام"
                            : "Cash on Delivery"}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">
                      {language === "ar" ? "المنتجات" : "Items"}
                    </h3>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>
                            {item.name} x {item.quantity}
                          </span>
                          <span>{(item.price * item.quantity).toFixed(2)} SAR</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={handlePlaceOrder}
                    className="w-full"
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {language === "ar" ? "جارٍ المعالجة..." : "Processing..."}
                      </>
                    ) : (
                      language === "ar" ? "تأكيد الطلب" : "Place Order"
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>
                  {language === "ar" ? "ملخص الطلب" : "Order Summary"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        {item.name} x {item.quantity}
                      </span>
                      <span>{(item.price * item.quantity).toFixed(2)} SAR</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      {language === "ar" ? "المجموع الفرعي" : "Subtotal"}
                    </span>
                    <span>{subtotal.toFixed(2)} SAR</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      {language === "ar" ? "الضريبة" : "Tax"}
                    </span>
                    <span>{tax.toFixed(2)} SAR</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      {language === "ar" ? "الشحن" : "Shipping"}
                    </span>
                    <span>
                      {shipping === 0
                        ? language === "ar"
                          ? "مجاني"
                          : "Free"
                        : `${shipping.toFixed(2)} SAR`}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>{language === "ar" ? "الإجمالي" : "Total"}</span>
                    <span>{total.toFixed(2)} SAR</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

