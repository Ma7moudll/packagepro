"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, XCircle, Mail } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"

export default function VerifyEmailPage() {
  const { language } = useLanguage()
  const searchParams = useSearchParams()
  const verified = searchParams.get("verified") === "true"

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            {verified ? (
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
            ) : (
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

