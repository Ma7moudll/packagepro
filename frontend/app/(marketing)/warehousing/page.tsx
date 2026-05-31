"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Warehouse, Package, TrendingDown, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { useToast } from "@/hooks/use-toast"

export default function WarehousingPage() {
  const { language } = useLanguage()
  const { toast } = useToast()
  const [isRequesting, setIsRequesting] = useState(false)

  const handleRequest = async () => {
    setIsRequesting(true)
    try {
      // Here you would send the request to backend
      toast({
        title: language === "ar" ? "تم إرسال الطلب" : "Request Submitted",
        description:
          language === "ar"
            ? "سيتم مراجعة طلبك وإرسال عرض السعر خلال 24 ساعة"
            : "Your request will be reviewed and a quote will be sent within 24 hours",
      })
    } catch (error) {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" ? "حدث خطأ في إرسال الطلب" : "Failed to submit request",
        variant: "destructive",
      })
    } finally {
      setIsRequesting(false)
    }
  }

  const benefits = [
    {
      icon: TrendingDown,
      title: language === "ar" ? "تخفيض التكاليف" : "Lower Costs",
      titleAr: "تخفيض التكاليف",
      description:
        language === "ar"
          ? "اشترِ المزيد، ووفّر المزيد - كلما كان الطلب أكبر، استفدت من المدخرات المضمونة"
          : "Buy more, save more - the bigger order you make, the more you benefit from guaranteed savings",
      descriptionAr: "اشترِ المزيد، ووفّر المزيد - كلما كان الطلب أكبر، استفدت من المدخرات المضمونة",
    },
    {
      icon: Clock,
      title: language === "ar" ? "إنتاج مبسط" : "Streamlined Production",
      titleAr: "إنتاج مبسط",
      description:
        language === "ar"
          ? "قم بطلب واحد كبير، واحفظ الفائض في مستودعنا واحصل على التغليف الخاص بك بسرعة كلما احتجت إليه"
          : "Make a single big order, store the excess in our warehouse and have your packaging delivered fast whenever you need it",
      descriptionAr: "قم بطلب واحد كبير، واحفظ الفائض في مستودعنا واحصل على التغليف الخاص بك بسرعة كلما احتجت إليه",
    },
    {
      icon: Package,
      title: language === "ar" ? "مستودع سهل" : "Easy Warehousing",
      titleAr: "مستودع سهل",
      description:
        language === "ar"
          ? "احفظ التغليف الخاص بك في غرفنا الخاضعة للتحكم في درجة الحرارة واحصل على إعادة تعبئة عندما تقل مخزونك"
          : "Store your packaging in our temperature-controlled rooms and get a refill when you're running low",
      descriptionAr: "احفظ التغليف الخاص بك في غرفنا الخاضعة للتحكم في درجة الحرارة واحصل على إعادة تعبئة عندما تقل مخزونك",
    },
  ]

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge className="mb-4 bg-blue-100 text-blue-800">
          <Warehouse className="h-4 w-4 mr-2" />
          {language === "ar" ? "خدمة التخزين" : "Warehousing Service"}
        </Badge>
        <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
          {language === "ar" ? "تخزين التغليف" : "Warehouse Your Packaging"}
        </h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
          {language === "ar"
            ? "احفظ التغليف الخاص بك في مستودعنا واحصل على إعادة تعبئة سريعة عندما تحتاجها"
            : "Store your packaging in our warehouse and get fast refills when you need them"}
        </p>
      </div>

      {/* Benefits Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {benefits.map((benefit, index) => {
          const Icon = benefit.icon
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle>{language === "ar" ? benefit.titleAr : benefit.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">{language === "ar" ? benefit.descriptionAr : benefit.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Features */}
      <div className="grid lg:grid-cols-2 gap-8 mb-12">
        <Card>
          <CardHeader>
            <CardTitle>{language === "ar" ? "مزايا التخزين" : "Warehousing Benefits"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">
                  {language === "ar" ? "تخزين خاضع للتحكم في درجة الحرارة" : "Temperature-Controlled Storage"}
                </h4>
                <p className="text-sm text-slate-600">
                  {language === "ar"
                    ? "غرف تخزين محمية للحفاظ على جودة التغليف"
                    : "Protected storage rooms to maintain packaging quality"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">
                  {language === "ar" ? "توصيل سريع" : "Fast Delivery"}
                </h4>
                <p className="text-sm text-slate-600">
                  {language === "ar"
                    ? "احصل على التغليف الخاص بك بسرعة كلما احتجت إليه"
                    : "Get your packaging delivered fast whenever you need it"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">
                  {language === "ar" ? "توفير في التكاليف" : "Cost Savings"}
                </h4>
                <p className="text-sm text-slate-600">
                  {language === "ar"
                    ? "وفر المال بطلب كميات كبيرة واحفظ الفائض"
                    : "Save money by ordering in bulk and storing excess"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{language === "ar" ? "طلب خدمة التخزين" : "Request Warehousing Service"}</CardTitle>
            <CardDescription>
              {language === "ar"
                ? "املأ النموذج أدناه وسنتواصل معك قريباً"
                : "Fill out the form below and we'll get in touch soon"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="company">
                {language === "ar" ? "اسم الشركة" : "Company Name"} *
              </Label>
              <Input id="company" placeholder={language === "ar" ? "اسم شركتك" : "Your company name"} className="mt-2" />
            </div>
            <div>
              <Label htmlFor="email">
                {language === "ar" ? "البريد الإلكتروني" : "Email"} *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={language === "ar" ? "you@company.com" : "you@company.com"}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="quantity">
                {language === "ar" ? "كمية التخزين المتوقعة" : "Expected Storage Quantity"}
              </Label>
              <Input
                id="quantity"
                type="number"
                placeholder={language === "ar" ? "عدد الوحدات" : "Number of units"}
                className="mt-2"
              />
            </div>
            <Button
              onClick={handleRequest}
              disabled={isRequesting}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              {isRequesting
                ? language === "ar"
                  ? "جاري الإرسال..."
                  : "Submitting..."
                : language === "ar"
                  ? "إرسال الطلب"
                  : "Submit Request"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-blue-600 mt-1" />
            <div>
              <h3 className="font-semibold text-lg mb-2">
                {language === "ar" ? "كيف يعمل التخزين؟" : "How Does Warehousing Work?"}
              </h3>
              <p className="text-slate-700 mb-4">
                {language === "ar"
                  ? "1. قم بطلب كبير واحفظ الفائض في مستودعنا"
                  : "1. Make a bulk order and store excess in our warehouse"}
              </p>
              <p className="text-slate-700 mb-4">
                {language === "ar"
                  ? "2. احصل على إعادة تعبئة سريعة كلما احتجت إلى المزيد"
                  : "2. Get fast refills whenever you need more"}
              </p>
              <p className="text-slate-700">
                {language === "ar"
                  ? "3. وفّر المال مع خصومات الطلبات الكبيرة"
                  : "3. Save money with bulk order discounts"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

