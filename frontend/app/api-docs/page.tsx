"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Code, Key, BookOpen, Terminal, Zap, Shield } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import Link from "next/link"

export default function APIDocsPage() {
  const { language } = useLanguage()

  const apiEndpoints = [
    {
      method: "GET",
      path: "/api/v1/products",
      description:
        language === "ar"
          ? "احصل على قائمة بجميع المنتجات"
          : "Get a list of all products",
      descriptionAr: "احصل على قائمة بجميع المنتجات",
    },
    {
      method: "POST",
      path: "/api/v1/orders",
      description:
        language === "ar"
          ? "إنشاء طلب جديد"
          : "Create a new order",
      descriptionAr: "إنشاء طلب جديد",
    },
    {
      method: "GET",
      path: "/api/v1/orders/:id",
      description:
        language === "ar"
          ? "احصل على تفاصيل طلب معين"
          : "Get order details",
      descriptionAr: "احصل على تفاصيل طلب معين",
    },
    {
      method: "POST",
      path: "/api/v1/designs",
      description:
        language === "ar"
          ? "رفع تصميم جديد"
          : "Upload a new design",
      descriptionAr: "رفع تصميم جديد",
    },
    {
      method: "POST",
      path: "/api/v1/pricing/calculate",
      description:
        language === "ar"
          ? "حساب سعر المنتج"
          : "Calculate product price",
      descriptionAr: "حساب سعر المنتج",
    },
  ]

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge className="mb-4 bg-blue-100 text-blue-800">
          <Code className="h-4 w-4 mr-2" />
          {language === "ar" ? "وثائق API" : "API Documentation"}
        </Badge>
        <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
          {language === "ar" ? "Packaging API" : "Packaging API"}
        </h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
          {language === "ar"
            ? "تكامل مع منصة PackagePro عبر واجهة برمجة التطبيقات القوية"
            : "Integrate with PackagePro platform through our powerful API"}
        </p>
      </div>

      {/* Quick Start */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            {language === "ar" ? "بدء سريع" : "Quick Start"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">
              {language === "ar" ? "1. احصل على API Key" : "1. Get Your API Key"}
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              {language === "ar"
                ? "سجّل الدخول إلى حسابك واحصل على API Key من لوحة التحكم"
                : "Sign in to your account and get your API Key from the dashboard"}
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">
              {language === "ar" ? "2. إرسال طلب تجريبي" : "2. Send a Test Request"}
            </h3>
            <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
              <code>
                curl -X GET https://api.packagepro.com/v1/products \<br />
                &nbsp;&nbsp;&nbsp;&nbsp;-H &quot;Authorization: Bearer YOUR_API_KEY&quot;
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Authentication */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {language === "ar" ? "المصادقة" : "Authentication"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 mb-4">
            {language === "ar"
              ? "جميع طلبات API تتطلب مصادقة باستخدام Bearer Token. أضف الـ API Key في header Authorization."
              : "All API requests require authentication using a Bearer Token. Add your API Key in the Authorization header."}
          </p>
          <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-sm">
            <code>Authorization: Bearer YOUR_API_KEY</code>
          </div>
        </CardContent>
      </Card>

      {/* API Endpoints */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            {language === "ar" ? "نقاط النهاية" : "Endpoints"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {apiEndpoints.map((endpoint, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-start gap-4">
                  <Badge
                    variant={endpoint.method === "GET" ? "default" : "outline"}
                    className={endpoint.method === "POST" ? "bg-green-600" : ""}
                  >
                    {endpoint.method}
                  </Badge>
                  <div className="flex-1">
                    <code className="text-sm font-mono bg-slate-100 px-2 py-1 rounded">
                      {endpoint.path}
                    </code>
                    <p className="text-sm text-slate-600 mt-2">
                      {language === "ar" ? endpoint.descriptionAr : endpoint.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SDKs */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle>{language === "ar" ? "SDKs والمكتبات" : "SDKs & Libraries"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
              <code className="text-lg mb-2">JavaScript</code>
              <span className="text-sm text-slate-600">
                {language === "ar" ? "npm install @packagepro/api" : "npm install @packagepro/api"}
              </span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
              <code className="text-lg mb-2">Python</code>
              <span className="text-sm text-slate-600">
                {language === "ar" ? "pip install packagepro-api" : "pip install packagepro-api"}
              </span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
              <code className="text-lg mb-2">PHP</code>
              <span className="text-sm text-slate-600">
                {language === "ar" ? "composer require packagepro/api" : "composer require packagepro/api"}
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rate Limits */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {language === "ar" ? "حدود المعدل" : "Rate Limits"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600">
            {language === "ar"
              ? "الحد الأقصى للطلبات: 1000 طلب/ساعة لكل API Key. يمكنك ترقية حسابك للحصول على حدود أعلى."
              : "Maximum requests: 1000 requests/hour per API Key. You can upgrade your account for higher limits."}
          </p>
        </CardContent>
      </Card>

      {/* CTA */}
      <Card className="bg-gradient-to-r from-blue-50 to-emerald-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {language === "ar" ? "جاهز للبدء؟" : "Ready to Get Started?"}
            </h2>
            <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
              {language === "ar"
                ? "احصل على API Key وابدأ التكامل مع منصة PackagePro"
                : "Get your API Key and start integrating with PackagePro platform"}
            </p>
            <div className="flex justify-center gap-4">
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href="/contact">
                  {language === "ar" ? "احصل على API Key" : "Get API Key"}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="https://github.com/packagepro/api-examples" target="_blank">
                  {language === "ar" ? "أمثلة الكود" : "Code Examples"}
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

