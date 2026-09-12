"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, CheckCircle2, XCircle, Mail, RefreshCw } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type VerifyState = "loading" | "success" | "error" | "idle"

export default function VerifyEmailPage() {
  const { language } = useLanguage()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [state, setState] = useState<VerifyState>("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [resending, setResending] = useState(false)
  const [email, setEmail] = useState("")

  const token = searchParams.get("token")
  const verifiedParam = searchParams.get("verified") === "true"

  const verifyEmail = useCallback(async (verificationToken: string) => {
    setState("loading")
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verificationToken }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setState("success")
      } else {
        setState("error")
        setErrorMessage(data.message || (language === "ar" ? "رابط التحقق غير صالح أو منتهي الصلاحية" : "Invalid or expired verification link"))
      }
    } catch {
      setState("error")
      setErrorMessage(language === "ar" ? "حدث خطأ في الاتصال. حاول مرة أخرى" : "Connection error. Please try again")
    }
  }, [language])

  const resendVerification = useCallback(async () => {
    if (!email) return
    setResending(true)
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        router.push("/verify-email?resent=true")
      } else {
        setErrorMessage(data.message || (language === "ar" ? "فشل إعادة إرسال التحقق" : "Failed to resend verification"))
      }
    } catch {
      setErrorMessage(language === "ar" ? "حدث خطأ في الاتصال" : "Connection error")
    } finally {
      setResending(false)
    }
  }, [email, language, router])

  useEffect(() => {
    if (verifiedParam && !token) {
      setState("success")
      return
    }

    if (token) {
      verifyEmail(token)
    } else {
      setState("idle")
    }
  }, [token, verifiedParam, verifyEmail])

  useEffect(() => {
    const emailParam = searchParams.get("email")
    if (emailParam) setEmail(emailParam)
  }, [searchParams])

  const handleResend = () => {
    setErrorMessage("")
    resendVerification()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            {state === "loading" && (
              <div role="status" aria-live="polite">
                <Loader2 className="h-16 w-16 text-slate-400 mx-auto animate-spin" />
                <h2 className="text-2xl font-bold mt-4">
                  {language === "ar" ? "جاري التحقق..." : "Verifying..."}
                </h2>
                <p className="text-slate-600">
                  {language === "ar" ? "يرجى الانتظار أثناء التحقق من بريدك الإلكتروني" : "Please wait while we verify your email"}
                </p>
              </div>
            )}

            {state === "success" && (
              <>
                <CheckCircle2 className="h-16 w-16 text-emerald-600 mx-auto" />
                <h2 className="text-2xl font-bold">
                  {language === "ar" ? "تم التحقق من البريد!" : "Email verified!"}
                </h2>
                <p className="text-slate-600">
                  {language === "ar"
                    ? "تم التحقق من بريدك الإلكتروني بنجاح. يمكنك الآن استخدام جميع ميزات الموقع."
                    : "Your email has been verified successfully. You can now use all features of the site."}
                </p>
                <Link href="/">
                  <Button className="w-full">
                    {language === "ar" ? "الذهاب للصفحة الرئيسية" : "Go to Home"}
                  </Button>
                </Link>
              </>
            )}

            {state === "error" && (
              <>
                <XCircle className="h-16 w-16 text-red-500 mx-auto" />
                <h2 className="text-2xl font-bold">
                  {language === "ar" ? "فشل التحقق" : "Verification failed"}
                </h2>
                <Alert variant="destructive" role="alert">
                  <AlertTitle>
                    {language === "ar" ? "خطأ" : "Error"}
                  </AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
                <div className="space-y-2">
                  {email && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleResend}
                      disabled={resending}
                    >
                      {resending ? (
                        <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 ml-2" />
                      )}
                      {language === "ar" ? "إعادة إرسال رابط التحقق" : "Resend verification link"}
                    </Button>
                  )}
                  <Link href="/login">
                    <Button variant="ghost" className="w-full">
                      {language === "ar" ? "العودة لتسجيل الدخول" : "Back to Login"}
                    </Button>
                  </Link>
                </div>
              </>
            )}

            {state === "idle" && (
              <>
                <Mail className="h-16 w-16 text-slate-400 mx-auto" />
                <h2 className="text-2xl font-bold">
                  {language === "ar" ? "تحقق من بريدك الإلكتروني" : "Verify your email"}
                </h2>
                <p className="text-slate-600">
                  {language === "ar"
                    ? "تم إرسال رابط التحقق إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد والنقر على الرابط."
                    : "A verification link has been sent to your email. Please check your inbox and click on the link."}
                </p>
                {errorMessage && (
                  <Alert variant="destructive" role="alert">
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}
                <Link href="/">
                  <Button variant="outline" className="w-full">
                    {language === "ar" ? "العودة للصفحة الرئيسية" : "Back to Home"}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
