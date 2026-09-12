"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/providers/auth-provider"
import { useLanguage } from "@/providers/language-provider"
import { vendorsApi } from "@/lib/api/vendors"
import { FileText, Check, X, Loader2, AlertCircle } from "lucide-react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

interface PendingHandshake {
  id: string
  status: string
  createdAt?: string
  vendorId?: string
  purchaseOrder?: {
    id: string
    poNumber: string
    orderId?: string
    order?: { orderNumber?: string }
  } | null
}

export default function ManufacturerQuotesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { language } = useLanguage()
  const { toast } = useToast()

  const [handshakes, setHandshakes] = useState<PendingHandshake[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<PendingHandshake | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const loadPending = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await vendorsApi.getDashboard()
      if (res.success) {
        setHandshakes((res.data?.pendingHandshakes as PendingHandshake[]) || [])
      }
    } catch (err: any) {
      console.error("Error fetching handshakes:", err)
      setError(err.message || "Failed to fetch quote requests")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user || (user.role !== "MANUFACTURER" && user.role !== "ADMIN")) {
      router.push("/login")
      return
    }
    loadPending()
  }, [user, router, loadPending])

  const handleAccept = async (handshake: PendingHandshake) => {
    try {
      setActionLoading(handshake.id)
      await vendorsApi.acceptHandshake(handshake.id)
      toast({
        title: language === "ar" ? "تم القبول" : "Accepted",
        description: language === "ar" ? "تم قبول أمر الشراء" : "Purchase order accepted",
      })
      await loadPending()
    } catch (err: any) {
      console.error("Error accepting handshake:", err)
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: err.message || "Failed to accept",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    if (!rejectTarget) return
    try {
      setActionLoading(rejectTarget.id)
      await vendorsApi.rejectHandshake(rejectTarget.id, rejectReason || undefined)
      setRejectTarget(null)
      setRejectReason("")
      toast({
        title: language === "ar" ? "تم الرفض" : "Rejected",
        description: language === "ar" ? "تم رفض أمر الشراء" : "Purchase order rejected",
      })
      await loadPending()
    } catch (err: any) {
      console.error("Error rejecting handshake:", err)
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: err.message || "Failed to reject",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  if (!user || (user.role !== "MANUFACTURER" && user.role !== "ADMIN")) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          {language === "ar" ? "عروض الأسعار" : "Quote Requests"}
        </h1>
        <p className="text-slate-600">
          {language === "ar" ? "طلبات أوامر الشراء بانتظار قبولك" : "Purchase order requests awaiting your response"}
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {/* Handshakes List */}
          <div className="space-y-4">
            {handshakes.map((hs) => (
              <Card key={hs.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="text-lg font-semibold">#{hs.purchaseOrder?.poNumber || hs.id}</h3>
                        <Badge variant="secondary">
                          {language === "ar" ? "قيد الانتظار" : "Pending"}
                        </Badge>
                      </div>
                      <p className="text-slate-600 mb-2">
                        {hs.purchaseOrder?.order?.orderNumber
                          ? `${language === "ar" ? "الطلب" : "Order"} #${hs.purchaseOrder.order.orderNumber}`
                          : language === "ar" ? "لم يتم تحديد رقم الطلب" : "No order number"}
                      </p>
                      {hs.createdAt ? (
                        <p className="text-xs text-slate-400">
                          {new Date(hs.createdAt).toLocaleDateString()}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        disabled={actionLoading === hs.id}
                        onClick={() => handleAccept(hs)}
                      >
                        {actionLoading === hs.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-2" />
                        )}
                        {language === "ar" ? "قبول" : "Accept"}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={actionLoading === hs.id}
                        onClick={() => {
                          setRejectTarget(hs)
                          setRejectReason("")
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        {language === "ar" ? "رفض" : "Reject"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {handshakes.length === 0 && !loading && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">
                {language === "ar" ? "لا توجد طلبات عروض أسعار" : "No quote requests found"}
              </p>
            </div>
          )}
        </>
      )}

      {/* Reject Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) setRejectTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "رفض أمر الشراء" : "Reject Purchase Order"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{language === "ar" ? "السبب (اختياري)" : "Reason (optional)"}</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={language === "ar" ? "لماذا ترفض هذا الطلب؟" : "Why are you rejecting this?"}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              {language === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              {language === "ar" ? "تأكيد الرفض" : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}