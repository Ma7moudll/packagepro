"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Lock, AlertCircle, CheckCircle2 } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"

export default function ResetPasswordTokenPage() {
  const { language, isRTL } = useLanguage()
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [tokenError, setTokenError] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const verifyTokenRef = useRef(false)

  useEffect(() => {
    if (!token || verifyTokenRef.current) return
    verifyTokenRef.current = true

    const verifyToken = async () => {
      try {
        const response = await fetch(`/api/auth/reset-password?token=${token}`)
        const data = await response.json()

        if (!response.ok || !data.valid) {
          setTokenError(true)
          setError(
            language === "ar"
              ? "الرابط غير صالح أو منتهي الصلاحية"
              : "Invalid or expired link"
          )
        }
      } catch {
        setTokenError(true)
        setError(
          language === "ar" ? "حدث خطأ أثناء التحقق" : "Error verifying token"
        )
      } finally {
        setVerifying(false)
      }
    }

    verifyToken()
  }, [token, language])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError(
        language === "ar" ? "كلمات المرور غير متطابقة" : "Passwords do not match"
      )
      return
    }

    if (password.length < 8) {
      setError(
        language === "ar"
          ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل"
          : "Password must be at least 8 characters"
      )
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/auth/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || (language === "ar" ? "حدث خطأ" : "An error occurred"))
        return
      }

      setSuccess(true)

      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch {
      setError(
        language === "ar"
          ? "حدث خطأ أثناء إعادة تعيين كلمة المرور"
          : "An error occurred while resetting password"
      )
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center" role="status" aria-live="polite">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
              <p className="mt-4 text-slate-600">
                {language === "ar" ? "جارٍ التحقق..." : "Verifying..."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
              <h2 className="text-2xl font-bold">
                {language === "ar" ? "رابط غير صالح" : "Invalid Link"}
              </h2>
              <Alert variant="destructive" role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <p className="text-slate-600">
                {language === "ar"
                  ? "يرجى طلب رابط جديد لإعادة تعيين كلمة المرور"
                  : "Please request a new password reset link"}
              </p>
              <Link href="/reset-password">
                <Button className="w-full">
                  {language === "ar" ? "طلب رابط جديد" : "Request New Link"}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-emerald-600 mx-auto" />
              <h2 className="text-2xl font-bold">
                {language === "ar" ? "تم تغيير كلمة المرور!" : "Password changed!"}
              </h2>
              <p className="text-slate-600">
                {language === "ar"
                  ? "تم تغيير كلمة المرور بنجاح. جارٍ إعادة التوجيه..."
                  : "Password has been changed successfully. Redirecting..."}
              </p>
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
              ? "أدخل كلمة المرور الجديدة"
              : "Enter your new password"}
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
              <Label htmlFor="password">
                {language === "ar" ? "كلمة المرور الجديدة" : "New Password"}
              </Label>
              <div className="relative">
                <Lock className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400`} />
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={language === "ar" ? "8 أحرف على الأقل" : "At least 8 characters"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className={isRTL ? "pr-10" : "pl-10"}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {language === "ar" ? "تأكيد كلمة المرور" : "Confirm Password"}
              </Label>
              <div className="relative">
                <Lock className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400`} />
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder={language === "ar" ? "أعد إدخال كلمة المرور" : "Re-enter password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={isRTL ? "pr-10" : "pl-10"}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
              {loading ? (
                <>
                  <Loader2 className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"} animate-spin`} />
                  {language === "ar" ? "جارٍ التغيير..." : "Changing..."}
                </>
              ) : (
                language === "ar" ? "تغيير كلمة المرور" : "Change Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
