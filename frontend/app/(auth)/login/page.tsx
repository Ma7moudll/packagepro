"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { useAuth } from "@/providers/auth-provider"

export default function SignInPage() {
  const { language, isRTL } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const callbackUrl = searchParams.get("callbackUrl") || searchParams.get("redirect") || "/"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const ok = await login(email, password)

      if (!ok) {
        setError(
          language === "ar"
            ? "البريد الإلكتروني أو كلمة المرور غير صحيحة"
            : "Invalid email or password"
        )
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setError(
        language === "ar" ? "حدث خطأ أثناء تسجيل الدخول" : "An error occurred during sign in"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {language === "ar" ? "تسجيل الدخول" : "Sign In"}
          </CardTitle>
          <CardDescription className="text-center">
            {language === "ar"
              ? "أدخل بياناتك للوصول إلى حسابك"
              : "Enter your credentials to access your account"}
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
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={isRTL ? "pr-10" : "pl-10"}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className={`flex items-center ${isRTL ? "space-x-reverse" : "space-x-2"}`}>
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label htmlFor="remember" className="text-sm cursor-pointer">
                  {language === "ar" ? "تذكرني" : "Remember me"}
                </Label>
              </div>
              <Link
                href="/reset-password"
                className="text-sm text-emerald-600 hover:underline"
              >
                {language === "ar" ? "نسيت كلمة المرور؟" : "Forgot password?"}
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
              {loading ? (
                <>
                  <Loader2 className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"} animate-spin`} />
                  {language === "ar" ? "جارٍ تسجيل الدخول..." : "Signing in..."}
                </>
              ) : (
                language === "ar" ? "تسجيل الدخول" : "Sign In"
              )}
            </Button>
          </form>

          <div className="text-center text-sm">
            <span className="text-slate-500">
              {language === "ar" ? "ليس لديك حساب؟" : "Don't have an account?"}{" "}
            </span>
            <Link href="/signup" className="text-emerald-600 hover:underline">
              {language === "ar" ? "سجل الآن" : "Sign up"}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}