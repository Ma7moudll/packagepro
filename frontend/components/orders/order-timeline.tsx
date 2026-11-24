"use client"
import { RecordedReleaseNote } from "./recorded-release-note"

import { useLanguage } from "@/providers/language-provider"
import { cn } from "@/lib/utils"
import { CheckCircle2, Circle, Clock, Truck, Package, Settings, Check, AlertCircle } from "lucide-react"
import type { OrderStatus } from "@shared/types"

const STEPS: { status: OrderStatus; icon: typeof Circle; labelEn: string; labelAr: string }[] = [
  { status: "pending_review", icon: Clock, labelEn: "Pending Review", labelAr: "قيد المراجعة" },
  { status: "awaiting_approval", icon: CheckCircle2, labelEn: "Awaiting Approval", labelAr: "بانتظار الموافقة" },
  { status: "ready_for_routing", icon: Settings, labelEn: "Routing to Vendor", labelAr: "التوجيه للمورد" },
  { status: "vendor_confirmed", icon: Package, labelEn: "Vendor Confirmed", labelAr: "تم تأكيد المورد" },
  { status: "in_production", icon: Settings, labelEn: "In Production", labelAr: "قيد الإنتاج" },
  { status: "quality_check", icon: AlertCircle, labelEn: "Quality Check", labelAr: "فحص الجودة" },
  { status: "ready_to_ship", icon: Package, labelEn: "Ready to Ship", labelAr: "جاهز للشحن" },
  { status: "shipped", icon: Truck, labelEn: "Shipped", labelAr: "تم الشحن" },
  { status: "delivered", icon: Check, labelEn: "Delivered", labelAr: "تم التوصيل" },
  { status: "completed", icon: CheckCircle2, labelEn: "Completed", labelAr: "مكتمل" },
]

const STATUS_ORDER: Record<OrderStatus, number> = {
  pending_review: 0,
  awaiting_approval: 1,
  ready_for_routing: 2,
  vendor_confirmed: 3,
  in_production: 4,
  quality_check: 5,
  ready_to_ship: 6,
  shipped: 7,
  delivered: 8,
  completed: 9,
  cancelled: -1,
}

export function OrderTimeline({ status }: { status: OrderStatus }) {
  const { language, isRTL } = useLanguage()
  const currentStep = STATUS_ORDER[status] ?? 0
  const isCancelled = status === "cancelled"

  if (isCancelled) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-red-500" />
        <p className="text-sm text-red-700 font-medium">
          {language === "ar" ? "تم إلغاء الطلب" : "Order cancelled"}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      <RecordedReleaseNote status={status} />
      {status === "quality_check" && <p role="status" data-order-release-note className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        {language === "ar" ? "حالة الطلب المسجلة هي فحص الجودة. هذه الحالة وحدها ليست تصريحًا بالشحن. مراجعة الفريق والسماح بالشحن لا يزالان معلقين." : "The recorded order status is Quality Check. This status alone is not permission to ship. Team review and shipping release are still pending."}
      </p>}
      {STEPS.map((step, idx) => {
        const stepOrder = STATUS_ORDER[step.status]
        const isCompleted = stepOrder !== undefined && currentStep > stepOrder
        const isCurrent = step.status === status
        const isFuture = !isCompleted && !isCurrent

        return (
          <div key={step.status} className="flex gap-4">
            {/* Line + Icon */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  isCompleted && "bg-emerald-100",
                  isCurrent && "bg-emerald-600",
                  isFuture && "bg-gray-100"
                )}
              >
                {isCompleted ? (
                  <Check className={cn("h-4 w-4", isCompleted && "text-emerald-600")} />
                ) : (
                  <step.icon
                    className={cn(
                      "h-4 w-4",
                      isCurrent && "text-white",
                      isFuture && "text-gray-300"
                    )}
                  />
                )}
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    "w-0.5 h-8",
                    isCompleted ? "bg-emerald-300" : "bg-gray-200"
                  )}
                />
              )}
            </div>

            {/* Label */}
            <div className="pb-6">
              <p
                className={cn(
                  "text-sm font-medium",
                  isCompleted && "text-emerald-700",
                  isCurrent && "text-emerald-700",
                  isFuture && "text-gray-400"
                )}
              >
                {language === "ar" ? step.labelAr : step.labelEn}
              </p>
              {isCurrent && (
                <p className="text-xs text-emerald-600 mt-0.5">
                  {language === "ar" ? "المرحلة الحالية" : "Current stage"}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
