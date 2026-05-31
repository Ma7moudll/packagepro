"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import Link from "next/link"
import { Search, Filter, ExternalLink } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"

interface Inspiration {
  id: string
  title: string
  titleAr: string
  category: string
  categoryAr: string
  company: string
  image: string
  description: string
  descriptionAr: string
  tags: string[]
}

const inspirations: Inspiration[] = [
  {
    id: "1",
    title: "Luxury Beverage Packaging",
    titleAr: "تغليف مشروبات فاخر",
    category: "Beverages",
    categoryAr: "مشروبات",
    company: "Djuce",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
    description: "Premium packaging solution for alcoholic beverages with elegant design",
    descriptionAr: "حل تغليف فاخر للمشروبات الكحولية بتصميم أنيق",
    tags: ["luxury", "beverages", "premium"],
  },
  {
    id: "2",
    title: "Sustainable Fashion Packaging",
    titleAr: "تغليف أزياء مستدام",
    category: "Apparel",
    categoryAr: "أزياء",
    company: "Kuyichi",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
    description: "Eco-friendly packaging for sustainable fashion brand",
    descriptionAr: "تغليف صديق للبيئة لعلامة أزياء مستدامة",
    tags: ["sustainable", "fashion", "eco-friendly"],
  },
  {
    id: "3",
    title: "Health & Beauty Product Boxes",
    titleAr: "علب منتجات الصحة والجمال",
    category: "Health & Beauty",
    categoryAr: "الصحة والجمال",
    company: "Your KAYA",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
    description: "Elegant packaging for period products with sustainable materials",
    descriptionAr: "تغليف أنيق لمنتجات الدورة الشهرية بمواد مستدامة",
    tags: ["beauty", "sustainable", "elegant"],
  },
  {
    id: "4",
    title: "Food Delivery Packaging",
    titleAr: "تغليف توصيل الطعام",
    category: "Food",
    categoryAr: "طعام",
    company: "Psi Bufet",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
    description: "Functional and sustainable packaging for food delivery",
    descriptionAr: "تغليف وظيفي ومستدام لتوصيل الطعام",
    tags: ["food", "delivery", "functional"],
  },
  {
    id: "5",
    title: "CBD Product Packaging",
    titleAr: "تغليف منتجات CBD",
    category: "Supplements",
    categoryAr: "مكملات",
    company: "Hemp Juice",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
    description: "Modern packaging for CBD supplements",
    descriptionAr: "تغليف عصري لمكملات CBD",
    tags: ["supplements", "cbd", "modern"],
  },
  {
    id: "6",
    title: "Luxury Lash Product Boxes",
    titleAr: "علب منتجات الرموش الفاخرة",
    category: "Health & Beauty",
    categoryAr: "الصحة والجمال",
    company: "XLASH",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
    description: "Premium packaging for luxury beauty products",
    descriptionAr: "تغليف فاخر لمنتجات الجمال الفاخرة",
    tags: ["luxury", "beauty", "premium"],
  },
]

export default function InspirationsPage() {
  const { language } = useLanguage()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  const filteredInspirations = inspirations.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.titleAr.includes(searchQuery) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.descriptionAr.includes(searchQuery)

    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const categories = ["all", "Beverages", "Apparel", "Health & Beauty", "Food", "Supplements"]

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
          {language === "ar" ? "معرض الإلهام" : "Inspirations"}
        </h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
          {language === "ar"
            ? "استكشف أمثلة رائعة على التغليف المخصص من عملائنا"
            : "Explore amazing examples of custom packaging from our customers"}
        </p>
      </div>

      {/* Search and Filter */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              placeholder={language === "ar" ? "ابحث في الإلهام..." : "Search inspirations..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                size="sm"
              >
                {category === "all"
                  ? language === "ar"
                    ? "الكل"
                    : "All"
                  : language === "ar"
                    ? inspirations.find((i) => i.category === category)?.categoryAr || category
                    : category}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Inspirations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredInspirations.map((item) => (
          <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative h-64">
              <Image
                src={item.image}
                alt={language === "ar" ? item.titleAr : item.title}
                fill
                className="object-cover"
              />
              <Badge className="absolute top-4 right-4 bg-white text-slate-900 shadow-lg">
                {language === "ar" ? item.categoryAr : item.category}
              </Badge>
            </div>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-2">{language === "ar" ? item.titleAr : item.title}</h3>
              <p className="text-sm text-slate-600 mb-4">{language === "ar" ? item.descriptionAr : item.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{item.company}</span>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/inspirations/${item.id}`}>
                    {language === "ar" ? "عرض التفاصيل" : "View Details"}
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredInspirations.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-600 text-lg">
            {language === "ar" ? "لم يتم العثور على نتائج" : "No inspirations found"}
          </p>
        </div>
      )}
    </div>
  )
}

