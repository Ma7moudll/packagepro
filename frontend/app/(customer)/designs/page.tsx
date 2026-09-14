"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Palette, Eye, Loader2, FileText } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { useAuth } from "@/providers/auth-provider"
import { designsApi, type DesignRecord } from "@/lib/api/designs"

export default function DesignsPage() {
  const { language } = useLanguage()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [designs, setDesigns] = useState<DesignRecord[]>([])
  const [loading, setLoading] = useState(true)

  const t = (en: string, ar: string) => (language === "ar" ? ar : en)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/designs")
      return
    }
    if (user) loadDesigns()
  }, [user, authLoading, router])

  const loadDesigns = async () => {
    try {
      const res = await designsApi.list()
      if (res.success && Array.isArray(res.data)) {
        setDesigns(res.data)
      }
    } catch (error: any) {
      if (error?.status === 401) {
        router.push("/login?redirect=/designs")
        return
      }
      console.error("Error loading designs:", error)
    } finally {
      setLoading(false)
    }
  }

  const previewFor = (d: DesignRecord) =>
    d.files?.find((f) => f.fileType === "preview")

  const statusColor = (status?: string) => {
    switch (status) {
      case "approved":
        return "bg-emerald-500"
      case "rejected":
        return "bg-red-500"
      case "in_review":
      case "submitted":
        return "bg-amber-500"
      default:
        return "bg-slate-500"
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-3xl font-bold mb-2">{t("Designs Library", "مكتبة التصاميم")}</h1>
        <p className="text-slate-500 mb-8">
          {t(
            "All your saved and approved packaging designs in one place.",
            "جميع تصاميم التغليف المحفوظة والمعتمدة في مكان واحد.",
          )}
        </p>

        {designs.length === 0 ? (
          <div className="text-center py-12">
            <Palette className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">{t("No designs yet", "لا توجد تصاميم بعد")}</h2>
            <p className="text-slate-600 mb-6">
              {t(
                "Design your packaging in the editor and it will be saved here.",
                "صمّم تغليفك في المحرر وسيتم حفظه هنا.",
              )}
            </p>
            <Link href="/editor">
              <Button>{t("Open Design Editor", "فتح محرر التصميم")}</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {designs.map((d) => {
              const preview = previewFor(d)
              return (
                <Card key={d.id} className="overflow-hidden">
                  <div className="h-44 bg-white border-b border-slate-100 flex items-center justify-center overflow-hidden">
                    {preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={preview.fileUrl}
                        alt={d.name || d.sessionId || d.id}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <FileText className="h-10 w-10 text-slate-300" />
                    )}
                  </div>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="font-semibold truncate">
                        {d.name || d.sessionId || t("Untitled design", "تصميم بدون اسم")}
                      </h3>
                      <Badge className={statusColor(d.lifecycleStatus || d.status)}>
                        {(d.lifecycleStatus || d.status || "draft").toLowerCase().replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500">
                        {d.updatedAt
                          ? new Date(d.updatedAt).toLocaleDateString()
                          : ""}
                      </p>
                      {d.order?.orderNumber && (
                        <Link
                          href={`/orders/${d.order.id}`}
                          className="text-xs text-emerald-700 hover:text-emerald-800"
                        >
                          {t("Order", "طلب")} {d.order.orderNumber}
                        </Link>
                      )}
                    </div>
                    <div className="mt-4">
                      <Link href={`/designs/${d.id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          <Eye className="h-4 w-4 mr-2" />
                          {t("View", "عرض")}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}