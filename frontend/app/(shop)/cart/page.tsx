"use client"

import { useCartStore } from "@/lib/ecommerce/cart-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import Link from "next/link"
import Image from "next/image"

export default function CartPage() {
  const { language } = useLanguage()
  const { items, subtotal, tax, shipping, total, removeItem, updateQuantity, clearCart } =
    useCartStore()

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
            <Link href="/">
              <Button>
                {language === "ar" ? "تصفح المنتجات" : "Browse Products"}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

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
              <Button variant="ghost" size="sm" onClick={clearCart}>
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
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-24 h-24 object-cover rounded"
                          />
                        ) : (
                          <ShoppingCart className="h-8 w-8 text-slate-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-1">{item.name}</h3>
                        <p className="text-sm text-slate-500 mb-2">SKU: {item.sku}</p>
                        {item.customization?.designId && (
                          <p className="text-xs text-emerald-600 mb-2">
                            {language === "ar" ? "مخصص" : "Customized"}
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
                            <p className="font-semibold">
                              {(item.price * item.quantity).toFixed(2)} SAR
                            </p>
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
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      {language === "ar" ? "المجموع الفرعي" : "Subtotal"}
                    </span>
                    <span>{subtotal.toFixed(2)} SAR</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      {language === "ar" ? "الضريبة" : "Tax"} (15%)
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

                <Link href="/checkout">
                  <Button className="w-full" size="lg">
                    {language === "ar" ? "إتمام الطلب" : "Proceed to Checkout"}
                    <ArrowRight className="h-4 w-4 mr-2" />
                  </Button>
                </Link>

                <p className="text-xs text-slate-500 text-center">
                  {language === "ar"
                    ? "الشحن مجاني للطلبات فوق 500 ريال"
                    : "Free shipping on orders over 500 SAR"}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
