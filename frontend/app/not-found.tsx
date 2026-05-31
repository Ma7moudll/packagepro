import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <h1 className="text-8xl font-bold text-gray-900">404</h1>
          <p className="mt-2 text-2xl font-semibold text-gray-700">
            الصفحة غير موجودة
          </p>
        </div>

        <div className="rounded-lg bg-white p-8 shadow-lg">
          <p className="mb-6 text-gray-600">
            عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها
          </p>

          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/">
                العودة إلى الصفحة الرئيسية
              </Link>
            </Button>

            <Button variant="outline" asChild className="w-full">
              <Link href="/products">
                تصفح المنتجات
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            href="/products"
            className="rounded-lg bg-white p-4 text-sm font-medium text-gray-700 shadow hover:shadow-md"
          >
            📦 المنتجات
          </Link>
          <Link
            href="/about"
            className="rounded-lg bg-white p-4 text-sm font-medium text-gray-700 shadow hover:shadow-md"
          >
            ℹ️ من نحن
          </Link>
          <Link
            href="/contact"
            className="rounded-lg bg-white p-4 text-sm font-medium text-gray-700 shadow hover:shadow-md"
          >
            📞 اتصل بنا
          </Link>
        </div>
      </div>
    </div>
  )
}

