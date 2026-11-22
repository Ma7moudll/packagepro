"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { buildHomeStatCounts, UNAVAILABLE_STAT, type HomeStatCounts } from "@/lib/home-stats"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Package,
  Leaf,
  Users,
  Sparkles,
  Award,
  Shield,
  ArrowRight,
  Factory,
  ShoppingBag,
  CheckCircle,
  Globe,
  Zap,
  Heart,
  Truck,
  Phone,
  Mail,
  MapPin,
  Code,
  Plug,
  Store,
  Calculator,
} from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/providers/language-provider"

export default function HomePage() {
  const router = useRouter()
  const { language } = useLanguage()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [statCounts, setStatCounts] = useState<HomeStatCounts>(UNAVAILABLE_STAT)
  const [statsLoading, setStatsLoading] = useState(true)
  // Transaction volume is not shown: its currency is not established (see lib/home-stats.ts).
  const stats = [
    {
      label: "صفقة مكتملة",
      labelEn: "Completed Deals",
      value: statCounts.completedDeals,
      icon: CheckCircle,
      color: "text-emerald-600",
    },
    {
      label: "موردون مسجلون",
      labelEn: "Registered Vendors",
      value: statCounts.registeredFactories,
      icon: Factory,
      color: "text-blue-600",
    },
    {
      label: "عملاء مسجلون",
      labelEn: "Registered Customers",
      value: statCounts.activeTraders,
      icon: Users,
      color: "text-orange-600",
    },
  ]

  // Fetch statistics on component mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true)
        const response = await fetch("/api/stats")
        const data = await response.json()

        setStatCounts(buildHomeStatCounts(data))
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setStatsLoading(false)
      }
    }

    fetchStats()
  }, [])

  // Real catalogue categories (slugs from shared/catalog/products.ts, served by GET /api/catalog).
  const categories = [
    { name: "علب", nameEn: "Boxes", categoryKey: "boxes", icon: Package, description: "علب بريد ومنتجات وشحن مطبوعة بأبعادك", descriptionEn: "Custom printed mailing, product and shipping boxes", color: "bg-amber-500" },
    { name: "أكياس", nameEn: "Bags", categoryKey: "bags", icon: ShoppingBag, description: "أكياس ورقية للحمل وأكياس بريد بعلامتك", descriptionEn: "Paper carrier bags and mailing bags with your branding", color: "bg-blue-500" },
    { name: "ملصقات", nameEn: "Labels & Stickers", categoryKey: "labels-stickers", icon: Package, description: "ملصقات وبطاقات مقصوصة للمنتجات", descriptionEn: "Die-cut labels and stickers", color: "bg-pink-500" },
    { name: "أكياس بوتش", nameEn: "Pouches", categoryKey: "pouches", icon: Package, description: "أكياس بوتش قائمة للأغذية والقهوة والتجزئة", descriptionEn: "Stand-up and doypack pouches", color: "bg-green-500" },
    { name: "أكواب وأنابيب", nameEn: "Cups & Tubes", categoryKey: "cups-tubes", icon: Package, description: "أكواب ورقية وأنابيب كرتون مطبوعة", descriptionEn: "Printed paper cups and cardboard tubes", color: "bg-teal-500" },
    { name: "مظاريف", nameEn: "Envelopes", categoryKey: "envelopes", icon: Package, description: "مظاريف كرتون ومضلعة للمستندات والكتب", descriptionEn: "Cardboard and corrugated envelopes", color: "bg-indigo-500" },
    { name: "ورق وشريط", nameEn: "Paper & Tape", categoryKey: "paper-tape", icon: Package, description: "ورق تغليف وورق حرير وأشرطة لاصقة", descriptionEn: "Wrapping paper, tissue and adhesive tapes", color: "bg-purple-500" },
    { name: "بطاقات", nameEn: "Cards", categoryKey: "cards", icon: Package, description: "بطاقات أعمال وولاء وشكر وقوائم", descriptionEn: "Business, loyalty, thank-you and menu cards", color: "bg-rose-500" },
  ]


  const productTypes = [
    "أكياس بلاستيك",
    "علب كرتون",
    "أطباق فويل",
    "أغلفة مرنة",
    "مواد مستدامة",
    "علب معدنية",
    "أكواب ورقية",
    "مناديل",
  ]

  const handleSearch = () => {
    // Build query parameters
    const params = new URLSearchParams()

    if (searchQuery.trim()) {
      params.set("search", searchQuery.trim())
    }

    if (selectedCategory && selectedCategory !== "all" && selectedCategory.trim()) {
      params.set("category", selectedCategory.trim())
    }

    // Navigate to products page with search params
    const queryString = params.toString()
    router.push(`/products${queryString ? `?${queryString}` : ""}`)
  }


  return (
    <div className="min-h-screen">
      {/* Hero Section with Smart Search */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white min-h-screen flex flex-col overflow-hidden">
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10 flex-1 flex flex-col justify-center py-20">
          {/* PackagePro Title */}
          <div className="text-center mb-8 pt-12">
            <h2 className="text-5xl lg:text-6xl font-bold text-white mb-8">PackagePro</h2>
          </div>

          <div className="text-center mb-8">
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white mb-4 px-3 py-1.5 text-sm max-w-full whitespace-normal text-center">
              <Award className="w-3 h-3 mr-1.5" />
              {language === "ar" ? "منصة التعبئة والتغليف المخصصة" : "Custom Packaging Platform"}
            </Badge>

            <h1 className="text-3xl lg:text-4xl font-bold leading-tight mb-4">
              {language === "ar" ? (
                <>
                  اكتشف حلول
                  <span className="text-emerald-400"> التعبئة والتغليف</span>
                </>
              ) : (
                <>
                  Discover
                  <span className="text-emerald-400"> Packaging Solutions</span>
                </>
              )}
            </h1>

            <p className="text-base text-slate-200 leading-relaxed max-w-2xl mx-auto mb-6">
              {language === "ar"
                ? "منصة تربط المصانع بالتجار لطلب منتجات التعبئة والتغليف المخصصة، من التصميم إلى الشحن"
                : "A platform connecting factories with traders for custom packaging orders, from design to shipping"}
            </p>

            {/* Smart Search Bar */}
            <Card className="max-w-4xl mx-auto bg-white shadow-xl rounded-lg">
              <CardContent className="p-4">
                {/* Search Bar - Full Width */}
                <div className="mb-3">
                  <div className="relative">
                    <Search
                      className={`absolute ${language === "ar" ? "right-3" : "left-3"} top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4`}
                    />
                    <Input
                      placeholder={language === "ar" ? "ابحث عن المنتج..." : "Search for products..."}
                      className={`${language === "ar" ? "pr-10 text-right" : "pl-10"} h-10 text-sm rounded-lg`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleSearch()
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={language === "ar" ? "جميع الفئات" : "All Categories"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === "ar" ? "جميع الفئات" : "All Categories"}</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.categoryKey} value={cat.categoryKey}>
                          {language === "ar" ? cat.name : cat.nameEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button onClick={handleSearch} className="h-9 bg-emerald-600 hover:bg-emerald-700">
                    <Search className="w-4 h-4 mr-2" />
                    {language === "ar" ? "بحث" : "Search"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center group">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <stat.icon className={`w-8 h-8 ${stat.color}`} />
                  </div>
                </div>
                <div className="text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
                  {statsLoading ? (
                    <span className="inline-block h-10 w-20 bg-slate-200 rounded animate-pulse"></span>
                  ) : (
                    stat.value ?? "-"
                  )}
                </div>
                <div className="text-gray-600 font-medium">{language === "ar" ? stat.label : stat.labelEn}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Categories */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              {language === "ar" ? "الأقسام الرئيسية" : "Main Categories"}
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              {language === "ar"
                ? "اكتشف مجموعتنا من منتجات التعبئة والتغليف"
                : "Discover our range of packaging products"}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {categories.map((category, index) => (
              <Card
                key={index}
                className="group hover:shadow-xl transition-all cursor-pointer border-0 shadow-lg hover:-translate-y-2"
              >
                <CardContent className="p-8 text-center">
                  <div
                    className={`w-16 h-16 ${category.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform`}
                  >
                    <category.icon className="w-8 h-8 text-white" />
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {language === "ar" ? category.name : category.nameEn}
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    {language === "ar" ? category.description : category.descriptionEn}
                  </p>

                  <Button
                    variant="outline"
                    className="w-full group-hover:bg-emerald-50 group-hover:border-emerald-200 bg-transparent transition-colors"
                    asChild
                  >
                    <Link href={`/products?category=${category.categoryKey}`}>
                      {language === "ar" ? "تصفح المنتجات" : "Browse Products"}
                      <ArrowRight className="w-4 h-4 mr-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How an order is handled (stages that exist in the order workflow) */}
      <section className="py-20 bg-emerald-50">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="bg-emerald-600 text-white mb-6 px-4 py-2">
                <Shield className="w-4 h-4 mr-2" />
                {language === "ar" ? "مراحل الطلب" : "Order stages"}
              </Badge>

              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6">
                {language === "ar" ? "كيف يُنفَّذ طلبك" : "How your order is handled"}
              </h2>

              <p className="text-lg text-slate-600 mb-8">
                {language === "ar"
                  ? "تتبع الطلبات في المنصة مراحل محددة لا يمكن تخطيها، ويظهر على الطلب مرحلته الحالية."
                  : "Orders on the platform follow defined stages that cannot be skipped, and the order shows its current stage."}
              </p>

              <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                <Link href="/products">
                  <Package className="w-5 h-5 mr-2" />
                  {language === "ar" ? "تصفح المنتجات" : "Browse Products"}
                </Link>
              </Button>
            </div>

            <ol className="space-y-4" data-testid="order-stages">
              {[
                {
                  en: "Configure and price",
                  ar: "الإعداد والتسعير",
                  enText: "Pick a product and its options. Pricing is shown where the product has price tiers; other products are quoted.",
                  arText: "اختر المنتج وخياراته. يظهر السعر للمنتجات التي لها شرائح أسعار، وتُسعَّر المنتجات الأخرى بعرض سعر.",
                },
                {
                  en: "Print-file check",
                  ar: "فحص ملف الطباعة",
                  enText: "A prepress check is available for uploaded artwork.",
                  arText: "يتوفر فحص ما قبل الطباعة لملف التصميم المرفوع.",
                },
                {
                  en: "Design approval",
                  ar: "اعتماد التصميم",
                  enText: "An order cannot be routed to a vendor before it passes the design-approval stage.",
                  arText: "لا يمكن توجيه الطلب إلى مصنع قبل أن يمر بمرحلة اعتماد التصميم.",
                },
                {
                  en: "Production and quality check",
                  ar: "الإنتاج وفحص الجودة",
                  enText: "An order passes a quality-check stage before it can be marked ready to ship.",
                  arText: "يمر الطلب بمرحلة فحص الجودة قبل أن يصبح جاهزًا للشحن.",
                },
                {
                  en: "Shipping",
                  ar: "الشحن",
                  enText: "Once a shipment exists, its status is shown on the order.",
                  arText: "بعد إنشاء الشحنة تظهر حالتها على الطلب.",
                },
              ].map((stage, index) => (
                <li key={stage.en} className="flex items-start gap-4 bg-white rounded-xl p-4 shadow-sm">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-bold text-slate-900">{language === "ar" ? stage.ar : stage.en}</p>
                    <p className="text-sm text-slate-600">{language === "ar" ? stage.arText : stage.enText}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Materials (only what the product configurator offers) */}
      <section className="py-20 bg-green-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="bg-green-600 text-white mb-6 px-4 py-2">
              <Leaf className="w-4 h-4 mr-2" />
              {language === "ar" ? "الخامات" : "Materials"}
            </Badge>

            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6">
              {language === "ar" ? "اختر الخامة المناسبة" : "Choose the right material"}
            </h2>

            <p className="text-lg text-slate-600 mb-8">
              {language === "ar"
                ? "تتضمن خيارات الخامة في المنتجات الورق الكرافت. اطلع على الخيارات المتاحة لكل منتج في صفحته."
                : "Product material options include kraft paper. See the options available for each product on its page."}
            </p>

            <Button asChild size="lg" className="bg-green-600 hover:bg-green-700 max-w-full whitespace-normal h-auto min-h-10 text-center">
              <Link href="/products">
                {language === "ar" ? "تصفح المنتجات" : "Browse Products"}
                <ArrowRight className="w-5 h-5 mr-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              {language === "ar" ? "كيف يعمل النظام" : "How It Works"}
            </h2>
            <p className="text-xl text-slate-600">
              {language === "ar"
                ? "خطوات طلب منتجات التغليف المخصصة"
                : "Steps for a custom packaging order"}
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-emerald-600">1</span>
              </div>
              <h3 className="font-bold text-lg mb-2">
                {language === "ar" ? "تصفح واختر" : "Browse & Choose"}
              </h3>
              <p className="text-slate-600">
                {language === "ar"
                  ? "تصفح المنتجات المتاحة في الكتالوج"
                  : "Browse the products available in the catalog"}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-emerald-600">2</span>
              </div>
              <h3 className="font-bold text-lg mb-2">
                {language === "ar" ? "إعداد التصميم" : "Configure Design"}
              </h3>
              <p className="text-slate-600">
                {language === "ar"
                  ? "للمنتجات التي يدعمها المحرر، اضبط المقاسات وخيارات الخامة المتاحة"
                  : "For products supported by the editor, set dimensions and available material options"}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-emerald-600">3</span>
              </div>
              <h3 className="font-bold text-lg mb-2">
                {language === "ar" ? "اطلب بالكمية" : "Choose a Quantity"}
              </h3>
              <p className="text-slate-600">
                {language === "ar"
                  ? "اختر الكمية التي تحتاجها، والسعر يظهر أو يُطلب حسب المنتج"
                  : "Pick the quantity you need. Price is shown or quoted depending on the product"}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-emerald-600">4</span>
              </div>
              <h3 className="font-bold text-lg mb-2">
                {language === "ar" ? "تتبع الشحن" : "Shipping Status"}
              </h3>
              <p className="text-slate-600">
                {language === "ar"
                  ? "بعد إنشاء الشحنة تظهر حالتها على الطلب"
                  : "Once a shipment exists, its status is shown on the order"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 to-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            {language === "ar" ? "جاهز للبدء؟" : "Ready to Get Started?"}
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto text-slate-100">
            {language === "ar"
              ? "ابدأ طلب التغليف المخصص الخاص بك"
              : "Start your custom packaging order"}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="secondary" className="text-emerald-600">
              <Link href="/products">
                {language === "ar" ? "تصفح المنتجات" : "Browse Products"}
                <ArrowRight className="w-5 h-5 mr-2" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              <Link href="/contact">
                <Phone className="w-5 h-5 mr-2" />
                {language === "ar" ? "اتصل بنا" : "Contact Us"}
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
