"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Clock, TrendingUp, CheckCircle } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import Link from "next/link"

export default function FlexiblePaymentsPage() {
  const { language } = useLanguage()

  const paymentOptions = [
    {
      icon: CreditCard,
      title: language === "ar" ? "الدفع الفوري" : "Pay Now",
      titleAr: "الدفع الفوري",
      description:
        language === "ar"
          ? "ادفع فوراً عند الطلب باستخدام البطاقة أو التحويل"
          : "Pay immediately when ordering using card or transfer",
      descriptionAr: "ادفع فوراً عند الطلب باستخدام البطاقة أو التحويل",
      features: [
        language === "ar" ? "دعم جميع البطاقات" : "All cards supported",
        language === "ar" ? "دفع آمن" : "Secure payment",
        language === "ar" ? "معالجة فورية" : "Instant processing",
      ],
    },
    {
      icon: Clock,
      title: language === "ar" ? "الدفع لاحقاً" : "Pay Later",
      titleAr: "الدفع لاحقاً",
      description:
        language === "ar"
          ? "اشترِ الآن وادفع حتى 120 يوم لاحقاً بدون فوائد"
          : "Buy now and pay up to 120 days later with no interest",
      descriptionAr: "اشترِ الآن وادفع حتى 120 يوم لاحقاً بدون فوائد",
      features: [
        language === "ar" ? "حتى 120 يوم" : "Up to 120 days",
        language === "ar" ? "بدون فوائد" : "No interest",
        language === "ar" ? "فحص الجدارة الائتمانية" : "Credit check required",
      ],
    },
    {
      icon: TrendingUp,
      title: language === "ar" ? "الدفع عند الاستخدام" : "Pay on Use",
      titleAr: "الدفع عند الاستخدام",
      description:
        language === "ar"
          ? "ادفع فقط بعد شحن التغليف - مثالي لإدارة الميزانية"
          : "Pay only after packaging is shipped - perfect for budget management",
      descriptionAr: "ادفع فقط بعد شحن التغليف - مثالي لإدارة الميزانية",
      features: [
        language === "ar" ? "دفع بعد الشحن" : "Pay after shipping",
        language === "ar" ? "إدارة الميزانية" : "Budget management",
        language === "ar" ? "تتبع الاستخدام" : "Usage tracking",
      ],
    },
  ]

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge className="mb-4 bg-emerald-100 text-emerald-800">
          <CreditCard className="h-4 w-4 mr-2" />
          {language === "ar" ? "الدفع المرن" : "Flexible Payments"}
        </Badge>
        <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
          {language === "ar" ? "ادفع كما تريد" : "Pay as You Want"}
        </h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
          {language === "ar"
            ? "اختر طريقة الدفع التي تناسب ميزانيتك وتدفقك النقدي"
            : "Choose the payment method that suits your budget and cash flow"}
        </p>
      </div>

      {/* Payment Options */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {paymentOptions.map((option, index) => {
          const Icon = option.icon
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-emerald-100 rounded-lg">
                    <Icon className="h-6 w-6 text-emerald-600" />
                  </div>
                  <CardTitle>{language === "ar" ? option.titleAr : option.title}</CardTitle>
                </div>
                <CardDescription>{language === "ar" ? option.descriptionAr : option.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-4">
                  {option.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant="outline">
                  {language === "ar" ? "تعرف على المزيد" : "Learn More"}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Benefits */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle>{language === "ar" ? "مزايا الدفع المرن" : "Benefits of Flexible Payments"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">
                  {language === "ar" ? "تحرير التدفق النقدي" : "Free Up Cash Flow"}
                </h4>
                <p className="text-sm text-slate-600">
                  {language === "ar"
                    ? "لا تنتظر - اشترِ الآن وادفع لاحقاً"
                    : "Don't wait - buy now and pay later"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">
                  {language === "ar" ? "بدون فوائد" : "No Interest"}
                </h4>
                <p className="text-sm text-slate-600">
                  {language === "ar"
                    ? "لا توجد فوائد على خيارات الدفع المرن"
                    : "No interest on flexible payment options"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">
                  {language === "ar" ? "إدارة أفضل للميزانية" : "Better Budget Management"}
                </h4>
                <p className="text-sm text-slate-600">
                  {language === "ar"
                    ? "خطط لمدفوعاتك مسبقاً"
                    : "Plan your payments in advance"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">
                  {language === "ar" ? "مرونة كاملة" : "Full Flexibility"}
                </h4>
                <p className="text-sm text-slate-600">
                  {language === "ar"
                    ? "اختر ما يناسبك"
                    : "Choose what works for you"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Eligibility */}
      <Card className="bg-emerald-50 border-emerald-200 mb-12">
        <CardHeader>
          <CardTitle>{language === "ar" ? "الأهلية" : "Eligibility"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700 mb-4">
            {language === "ar"
              ? "خيارات الدفع المرن متاحة للعملاء التجاريين المؤهلين. قد يُطلب فحص الجدارة الائتمانية لخيارات الدفع لاحقاً."
              : "Flexible payment options are available to qualified business customers. Credit check may be required for pay later options."}
          </p>
          <Button variant="outline" asChild>
            <Link href="/contact">
              {language === "ar" ? "اتصل بنا للتحقق من الأهلية" : "Contact Us to Check Eligibility"}
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* CTA */}
      <Card className="bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-200">
        <CardContent className="pt-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {language === "ar" ? "جاهز للبدء؟" : "Ready to Get Started?"}
            </h2>
            <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
              {language === "ar"
                ? "اختر طريقة الدفع التي تناسبك عند إنشاء طلب جديد"
                : "Choose your payment method when creating a new order"}
            </p>
            <div className="flex justify-center gap-4">
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                <Link href="/products">
                  {language === "ar" ? "تصفح المنتجات" : "Browse Products"}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/contact">
                  {language === "ar" ? "اتصل بنا" : "Contact Us"}
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

