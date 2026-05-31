"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, ShoppingBag, Shirt, Sparkles, Home, Smartphone, Utensils, Pill, Gift } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"

interface Industry {
  id: string
  name: string
  nameAr: string
  description: string
  descriptionAr: string
  icon: any
  image: string
  slug: string
  color: string
}

const industries: Industry[] = [
  {
    id: "1",
    name: "E-commerce",
    nameAr: "التجارة الإلكترونية",
    description: "Professional packaging solutions for online stores",
    descriptionAr: "حلول تغليف احترافية للمتاجر الإلكترونية",
    icon: ShoppingBag,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
    slug: "e-commerce",
    color: "bg-blue-100 text-blue-800",
  },
  {
    id: "2",
    name: "Apparel & Fashion",
    nameAr: "الأزياء والموضة",
    description: "Stylish packaging for fashion brands",
    descriptionAr: "تغليف أنيق لعلامات الأزياء",
    icon: Shirt,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
    slug: "apparel",
    color: "bg-pink-100 text-pink-800",
  },
  {
    id: "3",
    name: "Health & Beauty",
    nameAr: "الصحة والجمال",
    description: "Premium packaging for beauty products",
    descriptionAr: "تغليف فاخر لمنتجات الجمال",
    icon: Sparkles,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
    slug: "health-beauty",
    color: "bg-purple-100 text-purple-800",
  },
  {
    id: "4",
    name: "Home & Decor",
    nameAr: "المنزل والديكور",
    description: "Elegant packaging for home products",
    descriptionAr: "تغليف أنيق لمنتجات المنزل",
    icon: Home,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
    slug: "home-deco",
    color: "bg-amber-100 text-amber-800",
  },
  {
    id: "5",
    name: "Electronics",
    nameAr: "الإلكترونيات",
    description: "Protective packaging for electronic devices",
    descriptionAr: "تغليف واقي للأجهزة الإلكترونية",
    icon: Smartphone,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
    slug: "electronics",
    color: "bg-gray-100 text-gray-800",
  },
  {
    id: "6",
    name: "Food & Takeaway",
    nameAr: "الطعام والتوصيل",
    description: "Food-grade packaging solutions",
    descriptionAr: "حلول تغليف آمنة للطعام",
    icon: Utensils,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
    slug: "food",
    color: "bg-orange-100 text-orange-800",
  },
  {
    id: "7",
    name: "Supplements & CBD",
    nameAr: "المكملات الغذائية وCBD",
    description: "Compliant packaging for supplements",
    descriptionAr: "تغليف متوافق للمكملات الغذائية",
    icon: Pill,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
    slug: "supplements",
    color: "bg-green-100 text-green-800",
  },
  {
    id: "8",
    name: "Hobby & Gifts",
    nameAr: "الهوايات والهدايا",
    description: "Special packaging for gifts and hobbies",
    descriptionAr: "تغليف خاص للهدايا والهوايات",
    icon: Gift,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
    slug: "hobby-gifts",
    color: "bg-rose-100 text-rose-800",
  },
]

export default function IndustriesPage() {
  const { language } = useLanguage()

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge className="mb-4 bg-emerald-100 text-emerald-800">
          {language === "ar" ? "حلول مخصصة" : "Custom Solutions"}
        </Badge>
        <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
          {language === "ar" ? "حلول متخصصة للصناعات" : "Industry-Specific Solutions"}
        </h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
          {language === "ar"
            ? "اكتشف حلول التغليف المصممة خصيصاً لقطاع عملك"
            : "Discover packaging solutions tailored specifically to your industry"}
        </p>
      </div>

      {/* Industries Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {industries.map((industry) => {
          const Icon = industry.icon
          return (
            <Card key={industry.id} className="hover:shadow-lg transition-shadow group cursor-pointer">
              <Link href={`/industries/${industry.slug}`}>
                <div className="relative h-48 overflow-hidden rounded-t-lg">
                  <Image
                    src={industry.image}
                    alt={language === "ar" ? industry.nameAr : industry.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/20" />
                  <Badge className={`absolute top-4 right-4 ${industry.color}`}>
                    <Icon className="h-4 w-4 mr-2" />
                    {language === "ar" ? industry.nameAr : industry.name}
                  </Badge>
                </div>
                <CardHeader>
                  <CardTitle>{language === "ar" ? industry.nameAr : industry.name}</CardTitle>
                  <CardDescription>
                    {language === "ar" ? industry.descriptionAr : industry.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="w-full group-hover:text-emerald-600">
                    {language === "ar" ? "استكشف الحلول" : "Explore Solutions"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Link>
            </Card>
          )
        })}
      </div>

      {/* CTA Section */}
      <Card className="bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-200">
        <CardContent className="pt-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {language === "ar" ? "لا تجد ما تبحث عنه؟" : "Can't find what you're looking for?"}
            </h2>
            <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
              {language === "ar"
                ? "اتصل بنا وسنساعدك في العثور على حل التغليف المثالي لعملك"
                : "Contact us and we'll help you find the perfect packaging solution for your business"}
            </p>
            <div className="flex justify-center gap-4">
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                <Link href="/contact">
                  {language === "ar" ? "اتصل بنا" : "Contact Us"}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/brief">
                  {language === "ar" ? "إرسال طلب مخصص" : "Send Custom Brief"}
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

