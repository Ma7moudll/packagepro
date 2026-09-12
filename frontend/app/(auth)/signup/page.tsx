"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, Lock, User, AlertCircle } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"

export default function SignupPage() {
  const { language, isRTL } = useLanguage()
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError(
        language === "ar" ? "كلمتا المرور غير متطابقتين" : "Passwords do not match"
      )
      return
    }

    if (formData.password.length < 8) {
      setError(
        language === "ar"
          ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل"
          : "Password must be at least 8 characters"
      )
      return
    }

    if (!acceptTerms) {
      setError(
        language === "ar" ? "يرجى الموافقة على الشروط والأحكام" : "Please accept the terms and conditions"
      )
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        router.push("/verify-email?email=" + encodeURIComponent(formData.email))
      } else {
        setError(
          data.message ||
            (language === "ar" ? "فشل إنشاء الحساب" : "Failed to create account")
        )
      }
    } catch {
      setError(
        language === "ar" ? "حدث خطأ أثناء إنشاء الحساب" : "An error occurred during sign up"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {language === "ar" ? "إنشاء حساب" : "Sign Up"}
          </CardTitle>
          <CardDescription className="text-center">
            {language === "ar"
              ? "أدخل بياناتك لإنشاء حساب جديد"
              : "Enter your details to create a new account"}
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
              <Label htmlFor="name">
                {language === "ar" ? "الاسم" : "Name"}
                <span className="text-slate-400 text-xs mr-1">
                  {language === "ar" ? "(اختياري)" : "(optional)"}
                </span>
              </Label>
              <div className="relative">
                <User className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400`} />
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder={language === "ar" ? "الاسم الكامل" : "Full name"}
                  value={formData.name}
                  onChange={handleChange("name")}
                  className={isRTL ? "pr-10" : "pl-10"}
                />
              </div>
            </div>

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
                  value={formData.email}
                  onChange={handleChange("email")}
                  required
                  className={isRTL ? "pr-10" : "pl-10"}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                {language === "ar" ? "كلمة المرور" : "Password"}
              </Label>
              <div className="relative">
                <Lock className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400`} />
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={language === "ar" ? "٨ أحرف على الأقل" : "Min. 8 characters"}
                  value={formData.password}
                  onChange={handleChange("password")}
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
                  value={formData.confirmPassword}
                  onChange={handleChange("confirmPassword")}
                  required
                  minLength={8}
                  className={isRTL ? "pr-10" : "pl-10"}
                />
              </div>
            </div>

            <div className={`flex items-center ${isRTL ? "space-x-reverse" : "space-x-2"}`}>
              <Checkbox
                id="terms"
                checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
              />
              <Label htmlFor="terms" className="text-sm cursor-pointer">
                {language === "ar" ? "أوافق على" : "I agree to the"}{" "}
                <Link href="/terms" className="text-emerald-600 hover:underline">
                  {language === "ar" ? "الشروط والأحكام" : "terms and conditions"}
                </Link>
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
              {loading ? (
                <>
                  <Loader2 className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"} animate-spin`} />
                  {language === "ar" ? "جارٍ إنشاء الحساب..." : "Creating account..."}
                </>
              ) : (
                language === "ar" ? "إنشاء حساب" : "Sign Up"
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">
                {language === "ar" ? "أو" : "Or"}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={loading}
          >
            <svg className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {language === "ar" ? "التسجيل عبر جوجل" : "Sign up with Google"}
          </Button>

          <div className="text-center text-sm">
            <span className="text-slate-600">
              {language === "ar" ? "لديك حساب بالفعل؟" : "Already have an account?"}{" "}
            </span>
            <Link href="/login" className="text-emerald-600 hover:underline">
              {language === "ar" ? "تسجيل الدخول" : "Sign in"}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
