"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/providers/auth-provider"
import { useLanguage } from "@/providers/language-provider"
import { useToast } from "@/hooks/use-toast"
import { vendorsApi, type PurchaseOrder } from "@/lib/api/vendors"
import { SampleUploader, type UploadablePhoto } from "@/components/vendor/sample-uploader"
import { ImageIcon, Loader2, RefreshCw, Camera } from "lucide-react"

/**
 * Vendor sample management (SPEC-029 Week 8): upload QA photos per production
 * and track the review status (pending → approved / revision requested).
 */

interface ProductionSample {
  id: string
  status: string
  photoUrls: string[]
  notes?: string | null
  revisionNotes?: string | null
  updatedAt: string
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.slice(result.indexOf(",") + 1))
    }
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
    reader.readAsDataURL(file)
  })
}

function sampleTone(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "approved") return "secondary"
  if (status === "rejected") return "destructive"
  return "outline"
}

export default function VendorSamplesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { language } = useLanguage()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [pos, setPos] = useState<PurchaseOrder[]>([])
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await vendorsApi.getOrders({ limit: 50 })
      if (res.success && res.data) {
        setPos(res.data as unknown as PurchaseOrder[])
      }
    } catch (err) {
      console.error("Failed to load productions:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && (!user || (user.role !== "MANUFACTURER" && user.role !== "ADMIN"))) {
      router.push("/login")
      return
    }
    if (user) load()
  }, [user, authLoading, router, load])

  if (!user || (user.role !== "MANUFACTURER" && user.role !== "ADMIN")) return null

  const withProduction = pos.filter((po) => po.production)

  const handleUpload = async (po: PurchaseOrder, photos: UploadablePhoto[]) => {
    if (!po.production) return
    setUploadingFor(po.production.id)
    try {
      const payload = await Promise.all(
        photos.map(async (p) => ({
          fileName: p.file.name,
          mimeType: p.file.type,
          dataBase64: await fileToBase64(p.file),
        }))
      )
      const res = await vendorsApi.uploadSamples(
        po.production.id,
        payload,
        language === "ar" ? "عينة أولية من المورد" : "Initial sample from vendor"
      )
      if (res.success) {
        toast({
          title: language === "ar" ? "تم رفع العينة" : "Sample submitted",
          description:
            language === "ar"
              ? "سيتم إشعارك عند اكتمال مراجعة الجودة."
              : "You will be notified once QA reviews it.",
        })
        await load()
      }
    } catch (err) {
      console.error("Sample upload failed:", err)
      toast({
        title: language === "ar" ? "فشل الرفع" : "Upload failed",
        variant: "destructive",
      })
    } finally {
      setUploadingFor(null)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {language === "ar" ? "إدارة العينات" : "Sample Management"}
          </h1>
          <p className="text-sm text-slate-500">
            {language === "ar"
              ? "ارفع صور العينات للمراجعة وتابع حالة الفحص"
              : "Upload QA sample photos and track review status"}
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          {language === "ar" ? "تحديث" : "Refresh"}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : withProduction.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Camera className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">
              {language === "ar"
                ? "لا توجد عمليات إنتاج نشطة. ابدأ الإنتاج من صفحة الطلبات."
                : "No active productions yet. Start production from the orders page."}
            </p>
            <Button asChild className="mt-4">
              <Link href="/manufacturer/orders">
                {language === "ar" ? "الذهاب للطلبات" : "Go to orders"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {withProduction.map((po) => {
            const sample = (po.production?.samples?.[0] ?? null) as ProductionSample | null
            const inSampleStage =
              po.production?.status === "in_progress" ||
              po.production?.status === "sample_production"
            return (
              <Card key={po.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold font-mono">
                      {po.poNumber}
                    </CardTitle>
                    {sample && (
                      <Badge variant={sampleTone(sample.status)}>
                        {sample.status === "approved"
                          ? language === "ar"
                            ? "معتمدة"
                            : "Approved"
                          : sample.status === "rejected"
                            ? language === "ar"
                              ? "تعديلات مطلوبة"
                              : "Revision requested"
                            : language === "ar"
                              ? "قيد المراجعة"
                              : "Pending QA"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    {language === "ar" ? "الإنتاج" : "Production"}: {po.production?.status} ·{" "}
                    {po.production?.progressPercent ?? 0}%
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sample?.revisionNotes && (
                    <div className="rounded-md bg-rose-50 border border-rose-100 p-3 text-sm text-rose-700">
                      <p className="font-medium mb-1">
                        {language === "ar" ? "ملاحظات المراجعة:" : "QA notes:"}
                      </p>
                      {sample.revisionNotes}
                    </div>
                  )}

                  {sample && sample.photoUrls.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {sample.photoUrls.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt="Sample"
                            className="aspect-square w-full rounded-md object-cover border"
                          />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <ImageIcon className="h-4 w-4" />
                      {language === "ar"
                        ? "لم تُرفع عينات بعد"
                        : "No samples uploaded yet"}
                    </div>
                  )}

                  {inSampleStage && po.production && (
                    <SampleUploader
                      disabled={uploadingFor === po.production.id}
                      onUpload={(photos) => handleUpload(po, photos)}
                    />
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
