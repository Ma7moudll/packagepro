"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { useLanguage } from "@/providers/language-provider"
import { Handshake, Clock, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react"

interface HandshakeActionsProps {
  handshakeExpiresAt: string
  onAccept: () => Promise<void>
  onReject: (reason?: string) => Promise<void>
  isHandshakable?: boolean
}

function formatCountdown(ms: number, language: string) {
  if (ms <= 0) return language === "ar" ? "انتهى الوقت" : "Expired"
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${hours}h ${minutes}m ${seconds}s`
}

export function HandshakeActions({
  handshakeExpiresAt,
  onAccept,
  onReject,
  isHandshakable = true,
}: HandshakeActionsProps) {
  const { language } = useLanguage()
  const [accepting, setAccepting] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [countdown, setCountdown] = useState(0)

  const updateCountdown = useCallback(() => {
    const now = Date.now()
    const expiry = new Date(handshakeExpiresAt).getTime()
    setCountdown(Math.max(0, expiry - now))
  }, [handshakeExpiresAt])

  useEffect(() => {
    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [updateCountdown])

  const expired = countdown <= 0
  const warning = countdown > 0 && countdown < 600000

  const handleAccept = async () => {
    setAccepting(true)
    try {
      await onAccept()
    } finally {
      setAccepting(false)
    }
  }

  const handleReject = async () => {
    setRejecting(true)
    try {
      await onReject(rejectReason || undefined)
    } finally {
      setRejecting(false)
    }
  }

  if (!isHandshakable) {
    return null
  }

  return (
    <Card className={expired ? "opacity-60" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Handshake className="h-5 w-5" />
          {language === "ar" ? "المصافحة" : "Handshake"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {expired ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {language === "ar"
                ? "انتهت مهلة المصافحة. سيتم إعادة توجيه الطلب إلى مورد آخر."
                : "Handshake expired. Order will be re-routed to another vendor."}
            </AlertDescription>
          </Alert>
        ) : warning ? (
          <Alert variant="default" className="bg-orange-50 border-orange-200">
            <Clock className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-700">
              {language === "ar"
                ? "المصافحة على وشك الانتهاء! يرجى الرد بسرعة."
                : "Handshake expiring soon! Please respond quickly."}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="default" className="bg-blue-50 border-blue-200">
            <Handshake className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700">
              {language === "ar"
                ? "طلب مصافحة جديد. يرجى الرد خلال المهلة المحددة."
                : "New handshake request. Please respond within the time limit."}
            </AlertDescription>
          </Alert>
        )}

        {/* Countdown Timer */}
        <div className="flex items-center justify-center gap-2 py-3">
          <Clock className="h-5 w-5 text-slate-500" />
          <span className={`text-2xl font-mono font-bold ${warning ? "text-orange-600" : expired ? "text-red-600" : "text-slate-700"}`}>
            {formatCountdown(countdown, language)}
          </span>
        </div>

        {showRejectForm ? (
          <div className="space-y-3">
            <Textarea
              placeholder={language === "ar" ? "سبب الرفض (اختياري)" : "Rejection reason (optional)"}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleReject}
                disabled={rejecting}
              >
                {rejecting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                {language === "ar" ? "تأكيد الرفض" : "Confirm Rejection"}
              </Button>
              <Button variant="outline" onClick={() => setShowRejectForm(false)}>
                {language === "ar" ? "رجوع" : "Back"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={handleAccept}
              disabled={accepting || expired}
            >
              {accepting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {language === "ar" ? "قبول" : "Accept"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowRejectForm(true)}
              disabled={rejecting || expired}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {language === "ar" ? "رفض" : "Reject"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
