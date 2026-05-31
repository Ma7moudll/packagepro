"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Store, Sparkles, CheckCircle, TrendingUp, Shield, Zap } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import Link from "next/link"

export default function WhiteLabelPage() {
  const { language } = useLanguage()

  const features = [
    {
      icon: Store,
      title: language === "ar" ? "متجرك الخاص" : "Your Own Store",
      titleAr: "متجرك الخاص",
      description:
        language === "ar"
          ? "أنشئ متجر تغليف خاص بك بالعلامة البيضاء"
          : "Create your own white-label packaging store",
      descriptionAr: "أنشئ متجر تغليف خاص بك بالعلامة البيضاء",
    },
    {
      icon: Sparkles,
      title: language === "ar" ? "تخصيص كامل" : "Full Customization",
      titleAr: "تخصيص كامل",
      description:
        language === "ar"
          ? "قم بتخصيص المتجر وفقاً لعلامتك التجارية"
          : "Customize the store according to your brand",
      descriptionAr: "قم بتخصيص المتجر وفقاً لعلامتك التجارية",
    },
    {
      icon: TrendingUp,
      title: language === "ar" ? "تحكم كامل" : "Full Control",
      titleAr: "تحكم كامل",
      description:
        language === "ar"
          ? "تحكم كامل في المنتجات والأسعار"
          : "Full control over products and pricing",
      descriptionAr: "تحكم كامل في المنتجات والأسعار",
    },
    {
      icon: Shield,
      title: language === "ar" ? "آمن ومضمون" : "Secure & Reliable",
      titleAr: "آمن ومضمون",
      description:
        language === "ar"
          ? "بنية تحتية آمنة وموثوقة"
          : "Secure and reliable infrastructure",
      descriptionAr: "بنية تحتية آمنة وموثوقة",
    },
  ]

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge className="mb-4 bg-purple-100 text-purple-800">
          <Store className="h-4 w-4 mr-2" />
          {language === "ar" ? "العلامة البيضاء" : "White Label"}
        </Badge>
        <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
          {language === "ar" ? "أنشئ متجر تغليف خاص بك" : "Create Your Own Packaging Store"}
        </h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
          {language === "ar"
            ? "أنشئ متجر تغليف خاص بك بالعلامة البيضاء وابدأ البيع فوراً"
            : "Create your own white-label packaging store and start selling immediately"}
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="p-3 bg-purple-100 rounded-lg w-fit mb-4">
                  <Icon className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{language === "ar" ? feature.titleAr : feature.title}</h3>
                <p className="text-sm text-slate-600">{language === "ar" ? feature.descriptionAr : feature.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* What's Included */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle>{language === "ar" ? "ما يشمله الحل" : "What's Included"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">
                    {language === "ar" ? "متجر كامل" : "Complete Store"}
                  </h4>
                  <p className="text-sm text-slate-600">
                    {language === "ar"
                      ? "متجر كامل مع جميع الميزات"
                      : "Complete store with all features"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">
                    {language === "ar" ? "تخصيص العلامة التجارية" : "Brand Customization"}
                  </h4>
                  <p className="text-sm text-slate-600">
                    {language === "ar"
                      ? "شعارك وألوانك وعلامتك التجارية"
                      : "Your logo, colors, and brand"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">
                    {language === "ar" ? "إدارة المنتجات" : "Product Management"}
                  </h4>
                  <p className="text-sm text-slate-600">
                    {language === "ar"
                      ? "إضافة وإدارة المنتجات بسهولة"
                      : "Easily add and manage products"}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">
                    {language === "ar" ? "نظام الدفع" : "Payment System"}
                  </h4>
                  <p className="text-sm text-slate-600">
                    {language === "ar"
                      ? "تكامل مع أنظمة الدفع الشائعة"
                      : "Integration with common payment systems"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">
                    {language === "ar" ? "دعم العملاء" : "Customer Support"}
                  </h4>
                  <p className="text-sm text-slate-600">
                    {language === "ar"
                      ? "دعم مخصص لعملائك"
                      : "Custom support for your customers"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">
                    {language === "ar" ? "لوحة تحكم" : "Dashboard"}
                  </h4>
                  <p className="text-sm text-slate-600">
                    {language === "ar"
                      ? "لوحة تحكم شاملة لإدارة المتجر"
                      : "Comprehensive dashboard to manage the store"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Card className="bg-gradient-to-r from-purple-50 to-emerald-50 border-purple-200">
        <CardContent className="pt-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {language === "ar" ? "جاهز لإنشاء متجرك؟" : "Ready to Create Your Store?"}
            </h2>
            <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
              {language === "ar"
                ? "تواصل معنا لمعرفة المزيد عن حل العلامة البيضاء وإنشاء متجرك الخاص"
                : "Contact us to learn more about the white label solution and create your own store"}
            </p>
            <div className="flex justify-center gap-4">
              <Button asChild className="bg-purple-600 hover:bg-purple-700">
                <Link href="/contact">
                  {language === "ar" ? "اتصل بنا" : "Contact Us"}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/products">
                  {language === "ar" ? "استكشف المنتجات" : "Explore Products"}
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

