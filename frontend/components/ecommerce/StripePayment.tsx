"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { checkoutApi } from "@/lib/api/checkout"
import { useCartStore } from "@/lib/ecommerce/cart-store"
import type { CheckoutAddress } from "@/lib/ecommerce/types"

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
)

interface StripePaymentProps {
  shippingAddress: CheckoutAddress
  notes?: string
  designSessionId?: string
}

function StripePaymentForm({
  shippingAddress,
  notes,
  designSessionId,
}: StripePaymentProps) {
  const { language } = useLanguage()
  const router = useRouter()
  const stripe = useStripe()
  const elements = useElements()
  const refresh = useCartStore((s) => s.refresh)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Order-first checkout: the backend creates the `pending_review` order,
      // a Stripe PaymentIntent against it, and clears the server cart.
      const res = await checkoutApi.checkout({
        shippingAddress: {
          name: shippingAddress.name,
          phone: shippingAddress.phone,
          email: shippingAddress.email,
          street: shippingAddress.street,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postalCode: shippingAddress.postalCode,
          country: shippingAddress.country,
        },
        notes,
        designSessionId,
      })

      if (!res.success || !res.data?.clientSecret) {
        throw new Error(
          (res as { message?: string }).message ||
            "Failed to create order"
        )
      }

      const { clientSecret, orderId, orderNumber } = res.data

      const result = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/orders/${orderId}`,
        },
        redirect: "if_required",
      })

      if (result.error) {
        throw new Error(result.error.message || "Payment failed")
      }

      // Payment succeeded (or already succeeded client-side). The webhook
      // moves the order to `awaiting_approval`; navigate to the order page.
      await refresh()
      router.push(`/orders/${orderId}`)
      router.refresh()
    } catch (err: any) {
      const message =
        err.message ||
        (language === "ar" ? "حدث خطأ في الدفع" : "Payment failed. Please try again.")
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <PaymentElement />

      <Button type="submit" className="w-full" disabled={!stripe || !elements || loading} size="lg">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {language === "ar" ? "جارٍ المعالجة..." : "Processing..."}
          </>
        ) : (
          language === "ar" ? "تأكيد الدفع" : "Pay"
        )}
      </Button>
    </form>
  )
}

export function StripePayment(props: StripePaymentProps) {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return (
      <Alert className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Stripe is not configured. Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Elements stripe={stripePromise}>
      <StripePaymentForm {...props} />
    </Elements>
  )
}