"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { CreditCard, Lock, Truck } from "lucide-react"
import { useCart } from "./cart-provider"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/providers/language-provider"

interface PaymentFormProps {
  onSuccess: () => void
}

export function PaymentForm({ onSuccess }: PaymentFormProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("card")
  const { total, clearCart } = useCart()
  const { toast } = useToast()
  const { language } = useLanguage()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Clear cart and show success
      clearCart()
      toast({
        title: language === "ar" ? "تم الدفع بنجاح!" : "Payment Successful!",
        description: language === "ar"
          ? "تم إتمام طلبك بنجاح. ستصلك رسالة تأكيد قريباً"
          : "Your order has been placed successfully. You'll receive a confirmation email shortly.",
      })
      onSuccess()
    } catch {
      toast({
        title: language === "ar" ? "فشل الدفع" : "Payment Failed",
        description: language === "ar"
          ? "حدث خطأ في معالجة الدفع. يرجى المحاولة مرة أخرى"
          : "There was an error processing your payment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const shippingCost = total > 100 ? 0 : 15
  const tax = total * 0.08
  const finalTotal = total + shippingCost + tax

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="mr-2 h-5 w-5" />
            Payment Information
          </CardTitle>
          <CardDescription>Enter your payment details to complete your order</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Credit/Debit Card</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="cod">Cash on Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentMethod === "card" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input id="cardNumber" placeholder="1234 5678 9012 3456" required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input id="expiry" placeholder="MM/YY" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvv">CVV</Label>
                    <Input id="cvv" placeholder="123" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cardName">Name on Card</Label>
                  <Input id="cardName" placeholder="John Doe" required />
                </div>
              </>
            )}

            {/* Billing Address */}
            <Separator />
            <h3 className="font-semibold">Billing Address</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input id="zipCode" required />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isProcessing}>
              <Lock className="mr-2 h-4 w-4" />
              {isProcessing ? "Processing..." : `Pay $${finalTotal.toFixed(2)}`}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>${total.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Truck className="mr-2 h-4 w-4" />
              <span>Shipping:</span>
            </div>
            <span>{shippingCost === 0 ? "Free" : `$${shippingCost.toFixed(2)}`}</span>
          </div>

          <div className="flex justify-between">
            <span>Tax:</span>
            <span>${tax.toFixed(2)}</span>
          </div>

          <Separator />

          <div className="flex justify-between font-semibold text-lg">
            <span>Total:</span>
            <span>${finalTotal.toFixed(2)}</span>
          </div>

          <div className="bg-emerald-50 p-4 rounded-lg">
            <p className="text-sm text-emerald-800">
              <Lock className="inline mr-1 h-4 w-4" />
              Your payment information is secure and encrypted
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
