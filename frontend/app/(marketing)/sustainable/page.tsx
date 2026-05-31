"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Leaf, Recycle, TreePine, CheckCircle, Award, TrendingDown } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import Link from "next/link"

export default function SustainablePage() {
  const { language } = useLanguage()

  const sustainabilityFeatures = [
    {
      icon: Leaf,
      title: language === "ar" ? "شفافية" : "Transparency",
      titleAr: "شفافية",
      description:
        language === "ar"
          ? "تواصل خصائص التغليف المميزة بعلامات بيئية مبسطة"
          : "Communicate your branded packaging properties with simplified eco labels",
      descriptionAr: "تواصل خصائص التغليف المميزة بعلامات بيئية مبسطة",
    },
    {
      icon: Recycle,
      title: language === "ar" ? "المصادر المسؤولة" : "Responsible Sourcing",
      titleAr: "المصادر المسؤولة",
      description:
        language === "ar"
          ? "تعرف على مواد التغليف الخاصة بك ومن أين جاءت من خلال شبكة الموردين المتميزة لدينا"
          : "Know your packaging materials and where they came from thanks to our vetted supplier network",
      descriptionAr: "تعرف على مواد التغليف الخاصة بك ومن أين جاءت من خلال شبكة الموردين المتميزة لدينا",
    },
    {
      icon: TrendingDown,
      title: language === "ar" ? "تقليل الكربون" : "Decarbonisation",
      titleAr: "تقليل الكربون",
      description:
        language === "ar"
          ? "احصل على فكرة واضحة ودقيقة عن البصمة الكربونية للتغليف الخاص بك طوال دورة حياته"
          : "Get a clear and accurate idea of your packaging's carbon footprint throughout its lifecycle",
      descriptionAr: "احصل على فكرة واضحة ودقيقة عن البصمة الكربونية للتغليف الخاص بك طوال دورة حياته",
    },
    {
      icon: TreePine,
      title: language === "ar" ? "إعادة التشجير" : "Reforestation",
      titleAr: "إعادة التشجير",
      description:
        language === "ar"
          ? "اطلب التغليف من PackagePro وادعم إعادة التشجير - لقد زرعنا حتى الآن 35,000 شجرة من خلال شراكة مع One Tree Planted"
          : "Order packaging from PackagePro and support reforestation - so far we've replanted 35,000 trees through our partnership with One Tree Planted",
      descriptionAr:
        "اطلب التغليف من PackagePro وادعم إعادة التشجير - لقد زرعنا حتى الآن 35,000 شجرة من خلال شراكة مع One Tree Planted",
    },
  ]

  const ecoProperties = [
    { label: language === "ar" ? "قابل لإعادة التدوير" : "Recyclable", labelAr: "قابل لإعادة التدوير" },
    { label: language === "ar" ? "قابل للتحلل" : "Biodegradable", labelAr: "قابل للتحلل" },
    { label: language === "ar" ? "مصنوع من مواد معاد تدويرها" : "Made from recycled materials", labelAr: "مصنوع من مواد معاد تدويرها" },
    { label: language === "ar" ? "FSC معتمد" : "FSC Certified", labelAr: "FSC معتمد" },
    { label: language === "ar" ? "صديق للبيئة" : "Eco-friendly", labelAr: "صديق للبيئة" },
  ]

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge className="mb-4 bg-green-100 text-green-800">
          <Leaf className="h-4 w-4 mr-2" />
          {language === "ar" ? "الاستدامة" : "Sustainability"}
        </Badge>
        <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
          {language === "ar" ? "كن جزءاً من الحل" : "Be part of the solution"}
        </h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
          {language === "ar"
            ? "نلتزم بالاستدامة والمسؤولية البيئية في كل ما نفعله"
            : "We are committed to sustainability and environmental responsibility in everything we do"}
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {sustainabilityFeatures.map((feature, index) => {
          const Icon = feature.icon
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Icon className="h-6 w-6 text-green-600" />
                  </div>
                  <CardTitle>{language === "ar" ? feature.titleAr : feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">{language === "ar" ? feature.descriptionAr : feature.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Eco Properties */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle>{language === "ar" ? "الخصائص البيئية" : "Eco Properties"}</CardTitle>
          <CardDescription>
            {language === "ar"
              ? "تواصل خصائص التغليف الخاص بك بوضوح"
              : "Communicate your packaging properties clearly"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {ecoProperties.map((property, index) => (
              <Badge key={index} variant="outline" className="px-4 py-2">
                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                {language === "ar" ? property.labelAr : property.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <Card className="text-center">
          <CardContent className="pt-6">
            <TreePine className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-3xl font-bold text-slate-900 mb-2">35,000+</h3>
            <p className="text-slate-600">
              {language === "ar" ? "شجرة مزروعة" : "Trees Planted"}
            </p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <Recycle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-3xl font-bold text-slate-900 mb-2">90%+</h3>
            <p className="text-slate-600">
              {language === "ar" ? "من المنتجات قابلة لإعادة التدوير" : "Products Recyclable"}
            </p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6">
            <Award className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-3xl font-bold text-slate-900 mb-2">FSC</h3>
            <p className="text-slate-600">
              {language === "ar" ? "معتمد" : "Certified"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* CTA */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="pt-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {language === "ar" ? "ابدأ رحلتك المستدامة" : "Start Your Sustainable Journey"}
            </h2>
            <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
              {language === "ar"
                ? "استكشف منتجاتنا الصديقة للبيئة واختر التغليف الذي يعكس قيمك"
                : "Explore our eco-friendly products and choose packaging that reflects your values"}
            </p>
            <div className="flex justify-center gap-4">
              <Button asChild className="bg-green-600 hover:bg-green-700">
                <Link href="/products?feature=sustainable">
                  {language === "ar" ? "استكشف المنتجات" : "Explore Products"}
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
