"use client"

import { use } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, CheckCircle, Package, TrendingUp, Star } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"

const industryData: Record<
  string,
  {
    name: string
    nameAr: string
    description: string
    descriptionAr: string
    heroImage: string
    icon: string
    recommendedProducts: Array<{
      id: string
      name: string
      nameAr: string
      description: string
      descriptionAr: string
      image: string
    }>
    useCases: Array<{
      title: string
      titleAr: string
      description: string
      descriptionAr: string
    }>
    features: Array<{
      title: string
      titleAr: string
      description: string
      descriptionAr: string
    }>
  }
> = {
  "e-commerce": {
    name: "E-commerce",
    nameAr: "التجارة الإلكترونية",
    description: "Professional packaging solutions for online stores",
    descriptionAr: "حلول تغليف احترافية للمتاجر الإلكترونية",
    heroImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=600&fit=crop",
    icon: "🛍️",
    recommendedProducts: [
      {
        id: "1",
        name: "Corrugated Mailer Boxes",
        nameAr: "علب بريد مضلعة",
        description: "Perfect for shipping products safely",
        descriptionAr: "مثالية لشحن المنتجات بأمان",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
      },
      {
        id: "2",
        name: "Poly Mailers",
        nameAr: "أكياس بولي",
        description: "Lightweight and cost-effective",
        descriptionAr: "خفيفة الوزن وفعالة من حيث التكلفة",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
      },
    ],
    useCases: [
      {
        title: "Product Protection",
        titleAr: "حماية المنتجات",
        description: "Ensure your products arrive in perfect condition",
        descriptionAr: "تأكد من وصول منتجاتك بحالة مثالية",
      },
      {
        title: "Brand Experience",
        titleAr: "تجربة العلامة التجارية",
        description: "Create memorable unboxing experiences",
        descriptionAr: "أنشئ تجارب فتح علب لا تُنسى",
      },
    ],
    features: [
      {
        title: "Fast Shipping",
        titleAr: "شحن سريع",
        description: "Optimized for quick delivery",
        descriptionAr: "محسّن للتسليم السريع",
      },
      {
        title: "Cost-Effective",
        titleAr: "فعال من حيث التكلفة",
        description: "Reduce shipping costs",
        descriptionAr: "تقليل تكاليف الشحن",
      },
    ],
  },
  "apparel": {
    name: "Apparel & Fashion",
    nameAr: "الأزياء والموضة",
    description: "Stylish packaging for fashion brands",
    descriptionAr: "تغليف أنيق لعلامات الأزياء",
    heroImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=600&fit=crop",
    icon: "👗",
    recommendedProducts: [
      {
        id: "1",
        name: "Rigid Gift Boxes",
        nameAr: "علب هدايا صلبة",
        description: "Luxury packaging for premium items",
        descriptionAr: "تغليف فاخر للمنتجات المميزة",
        image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
      },
    ],
    useCases: [
      {
        title: "Luxury Experience",
        titleAr: "تجربة فاخرة",
        description: "Elevate your brand with premium packaging",
        descriptionAr: "ارتق بعلامتك التجارية بتغليف فاخر",
      },
    ],
    features: [
      {
        title: "Custom Design",
        titleAr: "تصميم مخصص",
        description: "Match your brand aesthetic",
        descriptionAr: "يطابق جمالية علامتك التجارية",
      },
    ],
  },
  "health-beauty": {
    name: "Health & Beauty",
    nameAr: "الصحة والجمال",
    description: "Premium packaging for beauty products",
    descriptionAr: "تغليف فاخر لمنتجات الجمال",
    heroImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=600&fit=crop",
    icon: "💄",
    recommendedProducts: [],
    useCases: [],
    features: [],
  },
  "home-deco": {
    name: "Home & Decor",
    nameAr: "المنزل والديكور",
    description: "Elegant packaging for home products",
    descriptionAr: "تغليف أنيق لمنتجات المنزل",
    heroImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=600&fit=crop",
    icon: "🏠",
    recommendedProducts: [],
    useCases: [],
    features: [],
  },
  "electronics": {
    name: "Electronics",
    nameAr: "الإلكترونيات",
    description: "Protective packaging for electronic devices",
    descriptionAr: "تغليف واقي للأجهزة الإلكترونية",
    heroImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=600&fit=crop",
    icon: "📱",
    recommendedProducts: [],
    useCases: [],
    features: [],
  },
  food: {
    name: "Food & Takeaway",
    nameAr: "الطعام والتوصيل",
    description: "Food-grade packaging solutions",
    descriptionAr: "حلول تغليف آمنة للطعام",
    heroImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=600&fit=crop",
    icon: "🍔",
    recommendedProducts: [],
    useCases: [],
    features: [],
  },
  supplements: {
    name: "Supplements & CBD",
    nameAr: "المكملات الغذائية وCBD",
    description: "Compliant packaging for supplements",
    descriptionAr: "تغليف متوافق للمكملات الغذائية",
    heroImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=600&fit=crop",
    icon: "💊",
    recommendedProducts: [],
    useCases: [],
    features: [],
  },
  "hobby-gifts": {
    name: "Hobby & Gifts",
    nameAr: "الهوايات والهدايا",
    description: "Special packaging for gifts and hobbies",
    descriptionAr: "تغليف خاص للهدايا والهوايات",
    heroImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=600&fit=crop",
    icon: "🎁",
    recommendedProducts: [],
    useCases: [],
    features: [],
  },
}

export default function IndustryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const { language } = useLanguage()

  const industry = industryData[slug]
  if (!industry) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">
          {language === "ar" ? "الصناعة غير موجودة" : "Industry not found"}
        </h1>
        <Link href="/industries">
          <Button>{language === "ar" ? "العودة للصناعات" : "Back to Industries"}</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero Section */}
      <div className="relative h-96 rounded-lg overflow-hidden mb-12">
        <Image
          src={industry.heroImage}
          alt={language === "ar" ? industry.nameAr : industry.name}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40" />
        <div className="absolute inset-0 flex items-center justify-center text-center text-white p-8">
          <div>
            <div className="text-6xl mb-4">{industry.icon}</div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              {language === "ar" ? industry.nameAr : industry.name}
            </h1>
            <p className="text-xl max-w-2xl mx-auto">
              {language === "ar" ? industry.descriptionAr : industry.description}
            </p>
          </div>
        </div>
      </div>

      {/* Recommended Products */}
      {industry.recommendedProducts.length > 0 && (
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6">
            {language === "ar" ? "المنتجات الموصى بها" : "Recommended Products"}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {industry.recommendedProducts.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <div className="relative h-48">
                  <Image
                    src={product.image}
                    alt={language === "ar" ? product.nameAr : product.name}
                    fill
                    className="object-cover rounded-t-lg"
                  />
                </div>
                <CardHeader>
                  <CardTitle>{language === "ar" ? product.nameAr : product.name}</CardTitle>
                  <CardDescription>
                    {language === "ar" ? product.descriptionAr : product.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/products">
                      {language === "ar" ? "استكشف المنتج" : "Explore Product"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Use Cases */}
      {industry.useCases.length > 0 && (
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6">
            {language === "ar" ? "حالات الاستخدام" : "Use Cases"}
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {industry.useCases.map((useCase, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                    {language === "ar" ? useCase.titleAr : useCase.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">
                    {language === "ar" ? useCase.descriptionAr : useCase.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Features */}
      {industry.features.length > 0 && (
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6">
            {language === "ar" ? "المميزات" : "Key Features"}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {industry.features.map((feature, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>{language === "ar" ? feature.titleAr : feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">
                    {language === "ar" ? feature.descriptionAr : feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <Card className="bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-200">
        <CardContent className="pt-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {language === "ar" ? "جاهز للبدء؟" : "Ready to Get Started?"}
            </h2>
            <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
              {language === "ar"
                ? "تواصل معنا للحصول على حل التغليف المثالي لعملك"
                : "Contact us to get the perfect packaging solution for your business"}
            </p>
            <div className="flex justify-center gap-4">
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                <Link href="/contact">
                  {language === "ar" ? "اتصل بنا" : "Contact Us"}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/products?industry=${slug}`}>
                  {language === "ar" ? "تصفح المنتجات" : "Browse Products"}
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

