"use client"

import { useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")

interface StripePaymentProps {
  amount: number
  onSuccess: (paymentMethod: any) => void
  onError: (error: string) => void
}

function StripePaymentForm({ amount, onSuccess, onError }: StripePaymentProps) {
  const { language } = useLanguage()
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setLoading(true)
    setError("")

    try {
      // Create payment intent
      const response = await fetch("/api/ecommerce/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      })

      const { clientSecret } = await response.json()

      if (!clientSecret) {
        throw new Error("Failed to create payment intent")
      }

      // Confirm payment
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        throw new Error("Card element not found")
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      )

      if (confirmError) {
        setError(confirmError.message || "Payment failed")
        onError(confirmError.message || "Payment failed")
        return
      }

      if (paymentIntent?.status === "succeeded") {
        onSuccess({
          stripePaymentMethodId: paymentIntent.payment_method,
          paymentIntentId: paymentIntent.id,
        })
      }
    } catch (err: any) {
      const errorMessage = err.message || (language === "ar" ? "حدث خطأ" : "An error occurred")
      setError(errorMessage)
      onError(errorMessage)
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

      <div className="p-4 border border-slate-200 rounded-lg">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#424770",
                "::placeholder": {
                  color: "#aab7c4",
                },
              },
              invalid: {
                color: "#9e2146",
              },
            },
          }}
        />
      </div>

      <Button type="submit" className="w-full" disabled={!stripe || loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {language === "ar" ? "جارٍ المعالجة..." : "Processing..."}
          </>
        ) : (
          language === "ar" ? "دفع" : "Pay"
        )}
      </Button>
    </form>
  )
}

export function StripePayment(props: StripePaymentProps) {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return (
      <Alert>
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

