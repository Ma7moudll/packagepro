"use client"

import { useState } from "react"
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"

interface PayPalPaymentProps {
  amount: number
  onSuccess: (paymentMethod: any) => void
  onError: (error: string) => void
}

function PayPalPaymentForm({ amount, onSuccess, onError }: PayPalPaymentProps) {
  const { language } = useLanguage()
  const [{ isPending }] = usePayPalScriptReducer()

  const createOrder = async () => {
    try {
      const response = await fetch("/api/ecommerce/create-paypal-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      })

      const { orderId } = await response.json()
      return orderId
    } catch (error) {
      onError(language === "ar" ? "حدث خطأ" : "An error occurred")
      throw error
    }
  }

  const onApprove = async (data: any) => {
    try {
      const response = await fetch("/api/ecommerce/capture-paypal-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: data.orderID }),
      })

      const result = await response.json()

      if (result.status === "COMPLETED") {
        onSuccess({
          paypalOrderId: data.orderID,
          captureId: result.captureId,
        })
      } else {
        onError(language === "ar" ? "فشل الدفع" : "Payment failed")
      }
    } catch (error) {
      onError(language === "ar" ? "حدث خطأ" : "An error occurred")
    }
  }

  if (isPending) {
    return <div className="text-center py-4">{language === "ar" ? "جارٍ التحميل..." : "Loading..."}</div>
  }

  return (
    <PayPalButtons
      createOrder={createOrder}
      onApprove={onApprove}
      onError={(err) => {
        onError(err.message || (language === "ar" ? "حدث خطأ" : "An error occurred"))
      }}
    />
  )
}

export function PayPalPayment(props: PayPalPaymentProps) {
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

  if (!paypalClientId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          PayPal is not configured. Please set NEXT_PUBLIC_PAYPAL_CLIENT_ID
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId: paypalClientId,
        currency: "SAR",
        intent: "capture",
      }}
    >
      <PayPalPaymentForm {...props} />
    </PayPalScriptProvider>
  )
}

