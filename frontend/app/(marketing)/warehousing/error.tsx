'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/providers/language-provider'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { language } = useLanguage()

  useEffect(() => {
    console.error('Page error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900">500</h1>
          <p className="mt-2 text-lg text-gray-600">
            {language === "ar" ? "عذراً، حدث خطأ غير متوقع" : "Sorry, an unexpected error occurred"}
          </p>
        </div>

        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            {language === "ar" ? "حدث خطأ في الصفحة" : "Page Error"}
          </h2>

          <p className="mb-6 text-gray-600">
            {error.message || (language === "ar" ? "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى." : "An unexpected error occurred. Please try again.")}
          </p>

          <div className="space-y-3">
            <Button onClick={() => reset()} className="w-full">
              {language === "ar" ? "المحاولة مرة أخرى" : "Try Again"}
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/'} className="w-full">
              {language === "ar" ? "العودة إلى الصفحة الرئيسية" : "Back to Home"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
