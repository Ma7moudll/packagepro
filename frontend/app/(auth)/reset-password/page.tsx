"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"

export default function ResetPasswordPage() {
  const { language, isRTL } = useLanguage()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || (language === "ar" ? "حدث خطأ" : "An error occurred"))
        return
      }

      setSuccess(true)
    } catch {
      setError(
        language === "ar"
          ? "حدث خطأ أثناء إرسال طلب إعادة تعيين كلمة المرور"
          : "An error occurred while sending reset request"
      )
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-emerald-600 mx-auto" />
              <h2 className="text-2xl font-bold">
                {language === "ar" ? "تم إرسال البريد" : "Email sent!"}
              </h2>
              <p className="text-slate-600">
                {language === "ar"
                  ? "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد (ورسائل البريد الغير مرغوب)."
                  : "Password reset link has been sent to your email. Please check your inbox (and spam folder)."}
              </p>
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                  {language === "ar" ? "العودة لتسجيل الدخول" : "Back to Sign In"}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {language === "ar" ? "إعادة تعيين كلمة المرور" : "Reset Password"}
          </CardTitle>
          <CardDescription className="text-center">
            {language === "ar"
              ? "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين"
              : "Enter your email and we'll send you a reset link"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                {language === "ar" ? "البريد الإلكتروني" : "Email"}
              </Label>
              <div className="relative">
                <Mail className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400`} />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder={language === "ar" ? "example@email.com" : "example@email.com"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={isRTL ? "pr-10" : "pl-10"}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
              {loading ? (
                <>
                  <Loader2 className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"} animate-spin`} />
                  {language === "ar" ? "جارٍ الإرسال..." : "Sending..."}
                </>
              ) : (
                language === "ar" ? "إرسال رابط إعادة التعيين" : "Send Reset Link"
              )}
            </Button>
          </form>

          <div className="text-center text-sm">
            <Link href="/login" className="text-emerald-600 hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              {language === "ar" ? "العودة لتسجيل الدخول" : "Back to Sign In"}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
