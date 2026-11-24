"use client"
import { useLanguage } from "@/providers/language-provider"
export function RecordedReleaseNote({ status }: { status?: string }) {
  const { language } = useLanguage()
  if (status !== "ready_to_ship") return null
  return <p data-recorded-release-note role="note" className="my-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
    {language === "ar" ? "جاهز للشحن حالة مسجلة فقط، وليست تصريحًا بالشحن. يجب التحقق من مراجعة الفريق وشروط السماح بالشحن قبل أي شحن." : "Ready to Ship is a recorded status only, not permission to ship. Team review and release conditions must be checked before any shipment."}
  </p>
}
