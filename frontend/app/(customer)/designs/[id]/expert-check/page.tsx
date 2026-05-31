"use client"

import { use } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle, Clock, Sparkles } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function ExpertCheckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { language } = useLanguage()
  const { toast } = useToast()

  const handleRequestCheck = async () => {
    toast({
      title: language === "ar" ? "تم إرسال الطلب" : "Request Submitted",
      description:
        language === "ar"
          ? "سيتم مراجعة التصميم من قبل خبير خلال 24 ساعة"
          : "Your design will be reviewed by an expert within 24 hours",
    })
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge className="mb-4 bg-purple-100 text-purple-800">
          <Sparkles className="h-4 w-4 mr-2" />
          {language === "ar" ? "فحص الخبراء" : "Expert Check"}
        </Badge>
        <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
          {language === "ar" ? "تأكد من أن التصميم مثالي" : "Make Sure Your Design is Perfect"}
        </h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
          {language === "ar"
            ? "احصل على فحص احترافي من خبراء التغليف قبل الطباعة"
            : "Get a professional review from packaging experts before printing"}
        </p>
      </div>

      {/* What's Checked */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              {language === "ar" ? "ما يتم فحصه" : "What We Check"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">
                  {language === "ar" ? "جودة الملفات" : "File Quality"}
                </h4>
                <p className="text-sm text-slate-600">
                  {language === "ar"
                    ? "دقة 300 DPI، وضع الألوان CMYK، الهوامش"
                    : "300 DPI resolution, CMYK color mode, bleed margins"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">
                  {language === "ar" ? "التصميم والجمالية" : "Design & Aesthetics"}
                </h4>
                <p className="text-sm text-slate-600">
                  {language === "ar"
                    ? "التوازن، الوضوح، جاذبية العلامة التجارية"
                    : "Balance, clarity, brand appeal"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">
                  {language === "ar" ? "الملاءمة للطباعة" : "Print Readiness"}
                </h4>
                <p className="text-sm text-slate-600">
                  {language === "ar"
                    ? "التوافق مع المواد، التصميم المناسب"
                    : "Material compatibility, appropriate design"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              {language === "ar" ? "كيف يعمل" : "How It Works"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-semibold">
                1
              </div>
              <div>
                <h4 className="font-semibold mb-1">
                  {language === "ar" ? "اطلب الفحص" : "Request Check"}
                </h4>
                <p className="text-sm text-slate-600">
                  {language === "ar"
                    ? "أرسل التصميم للفحص من قبل خبرائنا"
                    : "Submit your design for review by our experts"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-semibold">
                2
              </div>
              <div>
                <h4 className="font-semibold mb-1">
                  {language === "ar" ? "الفحص (24 ساعة)" : "Review (24 hours)"}
                </h4>
                <p className="text-sm text-slate-600">
                  {language === "ar"
                    ? "يتم فحص التصميم بعناية من قبل الخبراء"
                    : "Design is carefully reviewed by experts"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-semibold">
                3
              </div>
              <div>
                <h4 className="font-semibold mb-1">
                  {language === "ar" ? "احصل على التقرير" : "Get Report"}
                </h4>
                <p className="text-sm text-slate-600">
                  {language === "ar"
                    ? "تقرير مفصل مع اقتراحات للتحسين"
                    : "Detailed report with improvement suggestions"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Request Check */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle>{language === "ar" ? "طلب فحص خبير" : "Request Expert Check"}</CardTitle>
          <CardDescription>
            {language === "ar"
              ? "تصميم ID: {id}"
              : `Design ID: ${id}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="bg-slate-50 rounded-lg p-6">
              <h3 className="font-semibold mb-4">
                {language === "ar" ? "ما يشمله الفحص:" : "What's Included:"}
              </h3>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <span>
                    {language === "ar"
                      ? "فحص جودة الملفات (DPI، CMYK، الهوامش)"
                      : "File quality check (DPI, CMYK, margins)"}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <span>
                    {language === "ar"
                      ? "مراجعة التصميم والجمالية"
                      : "Design and aesthetic review"}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <span>
                    {language === "ar"
                      ? "اقتراحات للتحسين"
                      : "Improvement suggestions"}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <span>
                    {language === "ar"
                      ? "تقرير مفصل"
                      : "Detailed report"}
                  </span>
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <div>
                <p className="font-semibold text-emerald-900">
                  {language === "ar" ? "السعر: مجاني" : "Price: Free"}
                </p>
                <p className="text-sm text-emerald-700">
                  {language === "ar"
                    ? "الفحص الأول مجاني لجميع التصاميم"
                    : "First check is free for all designs"}
                </p>
              </div>
              <Button onClick={handleRequestCheck} className="bg-emerald-600 hover:bg-emerald-700">
                {language === "ar" ? "اطلب الفحص" : "Request Check"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Card className="bg-gradient-to-r from-purple-50 to-emerald-50 border-purple-200">
        <CardContent className="pt-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {language === "ar" ? "أسئلة؟" : "Questions?"}
            </h2>
            <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
              {language === "ar"
                ? "تواصل معنا إذا كان لديك أي أسئلة حول خدمة فحص الخبراء"
                : "Contact us if you have any questions about the expert check service"}
            </p>
            <Button asChild variant="outline">
              <Link href="/contact">
                {language === "ar" ? "اتصل بنا" : "Contact Us"}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

