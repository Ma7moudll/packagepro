"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { savedPaymentAmount } from "@/lib/ecommerce/saved-payment-amount";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { useLanguage } from "@/providers/language-provider";
import type { CheckoutResponse } from "@shared/types";
import { useAuth } from "@/providers/auth-provider";
import { checkoutApi } from "@/lib/api/checkout";
import { useCartStore } from "@/lib/ecommerce/cart-store";
import type { CheckoutAddress } from "@/lib/ecommerce/types";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

interface StripePaymentProps {
  resume?: CheckoutResponse;
  shippingAddress: CheckoutAddress;
  notes?: string;
  designSessionId?: string;
}

function StripePaymentForm({
  shippingAddress,
  notes,
  designSessionId,
  resume,
}: StripePaymentProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const refresh = useCartStore((s) => s.refresh);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Order-first checkout: the backend creates the `pending_review` order,
      // a Stripe PaymentIntent against it, and clears the server cart.
      const res = resume
        ? { success: true, data: resume }
        : await checkoutApi.checkout(
            {
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
            },
            user!.id,
          );

      if (res.data?.recoveryRequired || res.data?.cartChanged)
        throw new Error(
          language === "ar"
            ? "الطلب محفوظ ويحتاج مراجعة. لا تبدأ دفعة أخرى."
            : "Saved checkout needs review. Do not start another payment.",
        );
      if (res.data?.paymentState === "succeeded") {
        checkoutApi.forgetUnstarted(user!.id);
        router.push(`/orders/${res.data.orderId}`);
        return;
      }
      if (!res.success || !res.data?.clientSecret) {
        throw new Error(
          (res as { message?: string }).message || "Failed to create order",
        );
      }

      const { clientSecret, orderId, orderNumber } = res.data;

      const result = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/orders/${orderId}`,
        },
        redirect: "if_required",
      });

      if (result.error) {
        throw new Error(result.error.message || "Payment failed");
      }

      if (result.paymentIntent?.status === "succeeded")
        checkoutApi.forgetUnstarted(user!.id);
      // Payment succeeded (or already succeeded client-side). The webhook
      // moves the order to `awaiting_approval`; navigate to the order page.
      await refresh();
      router.push(`/orders/${orderId}`);
      router.refresh();
    } catch (err: any) {
      const message =
        err.message ||
        (language === "ar"
          ? "حدث خطأ في الدفع"
          : "Payment failed. Please try again.");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <PaymentElement />

      <Button
        type="submit"
        className="w-full"
        disabled={!stripe || !elements || loading}
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {language === "ar" ? "جارٍ المعالجة..." : "Processing..."}
          </>
        ) : language === "ar" ? (
          "تأكيد الدفع"
        ) : (
          "Pay"
        )}
      </Button>
    </form>
  );
}

export function StripePayment(props: StripePaymentProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [prepared, setPrepared] = useState<CheckoutResponse | null>(
    props.resume ?? null,
  );
  const [preparing, setPreparing] = useState(false);
  const [prepareError, setPrepareError] = useState("");
  async function prepare() {
    if (!user || preparing) return;
    setPreparing(true);
    setPrepareError("");
    try {
      const response = await checkoutApi.checkout(
        {
          shippingAddress: props.shippingAddress,
          notes: props.notes,
          designSessionId: props.designSessionId,
        },
        user.id,
      );
      if (!response.success || !response.data)
        throw new Error("Checkout unavailable");
      setPrepared(response.data);
    } catch (e) {
      setPrepareError(
        language === "ar"
          ? "تعذر تجهيز الدفع. أعد فتح صفحة الدفع لاستعادة الطلب، ولا تبدأ دفعة أخرى."
          : "Could not prepare payment. Reopen checkout to recover the saved order. Do not start another payment.",
      );
    } finally {
      setPreparing(false);
    }
  }
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    return (
      <Alert>
        <AlertDescription>
          {language === "ar"
            ? "الدفع غير متاح حاليًا"
            : "Payment is currently unavailable"}
        </AlertDescription>
      </Alert>
    );
  if (prepared?.recoveryRequired || prepared?.cartChanged)
    return (
      <Alert>
        <AlertDescription>
          {language === "ar"
            ? "الطلب محفوظ ويحتاج مراجعة. أعد فتح صفحة الدفع لاستعادته."
            : "Saved checkout needs review. Reopen checkout to recover it."}
        </AlertDescription>
      </Alert>
    );
  if (prepared && !prepared.clientSecret)
    return (
      <Alert>
        <AlertDescription>
          {language === "ar"
            ? "الطلب محفوظ. راجع حالة الدفع في الطلب قبل أي دفعة أخرى."
            : "Checkout is saved. Review payment status in the order before another payment."}
        </AlertDescription>
      </Alert>
    );
  if (!prepared)
    return (
      <div className="space-y-3">
        {prepareError && <p role="alert">{prepareError}</p>}
        <Button disabled={preparing} onClick={prepare}>
          {preparing
            ? language === "ar"
              ? "جارٍ تجهيز الطلب..."
              : "Preparing checkout..."
            : language === "ar"
              ? "تجهيز الطلب والدفع"
              : "Prepare order and payment"}
        </Button>
      </div>
    );
  const amount = savedPaymentAmount(
    prepared.total,
    prepared.currency,
    language === "ar" ? "ar-EG" : "en-US",
  );
  if (
    !prepared.orderNumber ||
    !amount ||
    !Number.isFinite(prepared.total) ||
    !prepared.currency ||
    !/^[A-Z]{3}$/.test(prepared.currency)
  )
    return (
      <Alert>
        <AlertDescription>
          {language === "ar"
            ? "تعذر التحقق من قيمة الطلب المحفوظ. راجع الطلب قبل الدفع."
            : "Saved order amount could not be verified. Review the order before paying."}
        </AlertDescription>
      </Alert>
    );
  return (
    <div className="space-y-4">
      <section
        aria-label={
          language === "ar" ? "الطلب المحفوظ للدفع" : "Saved order to pay"
        }
        className="rounded-md border p-3 space-y-2"
      >
        <p>
          {language === "ar" ? "رقم الطلب المحفوظ" : "Saved order"}:{" "}
          <strong>{prepared.orderNumber}</strong>
        </p>
        <p>
          {language === "ar" ? "قيمة الطلب المحفوظ" : "Saved order amount"}:{" "}
          <strong dir="ltr">{amount}</strong>
        </p>
        <p className="text-sm">
          {language === "ar"
            ? "الدفع لهذا الطلب المحفوظ، وليس للسلة الحالية. راجع الطلب والعنوان قبل التأكيد."
            : "Payment is for this saved order, not the current cart. Review the order and address before confirming."}
        </p>
        <Link
          className="inline-block underline"
          href={`/orders/${prepared.orderId}`}
        >
          {language === "ar"
            ? "مراجعة الطلب وعنوان الشحن"
            : "Review saved order and shipping address"}
        </Link>
      </section>
      <Elements
        stripe={stripePromise}
        options={{ clientSecret: prepared.clientSecret! }}
        key={prepared.paymentIntentId}
      >
        <StripePaymentForm {...props} resume={prepared} />
      </Elements>
    </div>
  );
}
