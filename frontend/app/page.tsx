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
  Users,
  Sparkles,
  Leaf,
  Award,
  Clock,
  Shield,
  Star,
  ArrowRight,
  Factory,
  ShoppingBag,
  Recycle,
  CheckCircle,
  Globe,
  Zap,
  Heart,
  Target,
  Truck,
  Phone,
  Mail,
  MapPin,
  Code,
  Plug,
  Store,
  FileText,
  Calculator,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useLanguage } from "@/providers/language-provider"

export default function HomePage() {
  const router = useRouter()
  const { language } = useLanguage()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedMaterial, setSelectedMaterial] = useState("all")
  const [selectedRegion, setSelectedRegion] = useState("all")
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null)
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

  const categories = [
    {
      name: "أكياس بلاستيك",
      nameEn: "Plastic Bags",
      categoryKey: "plastic-bags",
      icon: ShoppingBag,
      count: "500+",
      countEn: "500+",
      description: "أكياس بلاستيك عالية الجودة",
      descriptionEn: "High-quality plastic bags",
      color: "bg-blue-500",
    },
    {
      name: "علب كرتون",
      nameEn: "Cardboard Boxes",
      categoryKey: "cardboard-boxes",
      icon: Package,
      count: "300+",
      countEn: "300+",
      description: "علب كرتون قوية ومتينة",
      descriptionEn: "Strong and durable cardboard boxes",
      color: "bg-amber-500",
    },
    {
      name: "أكواب ورقية",
      nameEn: "Paper Cups",
      categoryKey: "paper-cups",
      icon: Package,
      count: "200+",
      countEn: "200+",
      description: "أكواب ورقية مستدامة",
      descriptionEn: "Sustainable paper cups",
      color: "bg-green-500",
    },
    {
      name: "أطباق فويل",
      nameEn: "Foil Plates",
      categoryKey: "foil-plates",
      icon: Package,
      count: "150+",
      countEn: "150+",
      description: "أطباق فويل للمطاعم",
      descriptionEn: "Foil plates for restaurants",
      color: "bg-slate-500",
    },
  ]

  const materials = ["ورق", "بلاستيك", "كرتون", "مواد مستدامة", "معدن", "زجاج", "قماش", "مواد مختلطة"]

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

  const featuredProducts = [
    {
      id: 1,
      name: "أكياس بلاستيك عالية الجودة",
      nameEn: "High Quality Plastic Bags",
      manufacturer: "مصنع الأهرام للبلاستيك",
      manufacturerEn: "Al-Ahram Plastic Factory",
      location: "القاهرة",
      locationEn: "Cairo",
      price: 15,
      originalPrice: 20,
      discount: 25,
      rating: 4.8,
      reviews: 127,
      minOrder: 1000,
      image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop",
      badges: ["sustainable", "featured"],
      inStock: true,
    },
    {
      id: 2,
      name: "علب كرتون مقوى للشحن",
      nameEn: "Corrugated Shipping Boxes",
      manufacturer: "مصنع النيل للكرتون",
      manufacturerEn: "Nile Cardboard Factory",
      location: "الإسكندرية",
      locationEn: "Alexandria",
      price: 8.5,
      originalPrice: 12,
      discount: 30,
      rating: 4.9,
      reviews: 89,
      minOrder: 500,
      image: "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&h=600&fit=crop",
      badges: ["eco-friendly", "fast-delivery"],
      inStock: true,
    },
    {
      id: 3,
      name: "أطباق فويل للمطاعم",
      nameEn: "Foil Plates for Restaurants",
      manufacturer: "مصنع الدلتا للألمنيوم",
      manufacturerEn: "Delta Aluminum Factory",
      location: "طنطا",
      locationEn: "Tanta",
      price: 2.3,
      originalPrice: 3,
      discount: 23,
      rating: 4.7,
      reviews: 156,
      minOrder: 2000,
      image: "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=800&h=600&fit=crop",
      badges: ["food-grade", "bulk-discount"],
      inStock: true,
    },
    {
      id: 4,
      name: "أكواب ورقية مستدامة",
      nameEn: "Sustainable Paper Cups",
      manufacturer: "مصنع البيئة الخضراء",
      manufacturerEn: "Green Environment Factory",
      location: "6 أكتوبر",
      locationEn: "6th October",
      price: 0.85,
      originalPrice: 1.2,
      discount: 29,
      rating: 4.6,
      reviews: 203,
      minOrder: 5000,
      image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&h=600&fit=crop",
      badges: ["sustainable", "biodegradable"],
      inStock: true,
    },
    {
      id: 5,
      name: "أغلفة مرنة للأغذية",
      nameEn: "Flexible Food Packaging",
      manufacturer: "مصنع المستقبل للتغليف",
      manufacturerEn: "Future Packaging Factory",
      location: "العبور",
      locationEn: "El Obour",
      price: 4.2,
      originalPrice: 5.5,
      discount: 24,
      rating: 4.8,
      reviews: 94,
      minOrder: 1500,
      image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&h=600&fit=crop",
      badges: ["food-safe", "custom-print"],
      inStock: true,
    },
    {
      id: 6,
      name: "مناديل ورقية فاخرة",
      nameEn: "Premium Paper Napkins",
      manufacturer: "مصنع الفخامة للورق",
      manufacturerEn: "Luxury Paper Factory",
      location: "المنصورة",
      locationEn: "Mansoura",
      price: 12,
      originalPrice: 16,
      discount: 25,
      rating: 4.5,
      reviews: 78,
      minOrder: 800,
      image: "https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=800&h=600&fit=crop",
      badges: ["premium", "soft-touch"],
      inStock: true,
    },
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

    if (selectedMaterial && selectedMaterial !== "all" && selectedMaterial.trim()) {
      params.set("material", selectedMaterial.trim())
    }

    if (selectedRegion && selectedRegion !== "all" && selectedRegion.trim()) {
      params.set("region", selectedRegion.trim())
    }

    // Navigate to products page with search params
    const queryString = params.toString()
    router.push(`/products${queryString ? `?${queryString}` : ""}`)
  }

  const handleFeatureClick = (feature: string) => {
    if (selectedFeature === feature) {
      setSelectedFeature(null)
    } else {
      setSelectedFeature(feature)
      router.push(`/products?feature=${feature}`)
    }
  }

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case "sustainable":
        return "bg-green-500 text-white"
      case "featured":
        return "bg-purple-500 text-white"
      case "eco-friendly":
        return "bg-teal-500 text-white"
      case "fast-delivery":
        return "bg-orange-500 text-white"
      case "food-grade":
        return "bg-purple-500 text-white"
      case "bulk-discount":
        return "bg-red-500 text-white"
      case "biodegradable":
        return "bg-teal-500 text-white"
      case "food-safe":
        return "bg-indigo-500 text-white"
      case "custom-print":
        return "bg-pink-500 text-white"
      case "premium":
        return "bg-yellow-500 text-black"
      case "soft-touch":
        return "bg-gray-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  const getBadgeText = (badge: string) => {
    const badges = {
      sustainable: { ar: "مستدام", en: "Sustainable" },
      featured: { ar: "مميز", en: "Featured" },
      "eco-friendly": { ar: "صديق للبيئة", en: "Eco-Friendly" },
      "fast-delivery": { ar: "توصيل سريع", en: "Fast Delivery" },
      "food-grade": { ar: "درجة غذائية", en: "Food Grade" },
      "bulk-discount": { ar: "خصم كمية", en: "Bulk Discount" },
      biodegradable: { ar: "قابل للتحلل", en: "Biodegradable" },
      "food-safe": { ar: "آمن غذائياً", en: "Food Safe" },
      "custom-print": { ar: "طباعة مخصصة", en: "Custom Print" },
      premium: { ar: "فاخر", en: "Premium" },
      "soft-touch": { ar: "ملمس ناعم", en: "Soft Touch" },
    }
    return badges[badge as keyof typeof badges]?.[language] || badge
  }

  const newFeatures = [
    {
      title: language === "ar" ? "حلول الصناعات" : "Industry Solutions",
      titleAr: "حلول الصناعات",
      description:
        language === "ar"
          ? "حلول مخصصة لمختلف الصناعات"
          : "Custom solutions for different industries",
      descriptionAr: "حلول مخصصة لمختلف الصناعات",
      icon: Factory,
      link: "/industries",
      color: "bg-blue-500",
    },
    {
      title: language === "ar" ? "تسعير الجملة" : "Wholesale Pricing",
      titleAr: "تسعير الجملة",
      description:
        language === "ar"
          ? "وفر حتى 25% مع طلبات الجملة"
          : "Save up to 25% with bulk orders",
      descriptionAr: "وفر حتى 25% مع طلبات الجملة",
      icon: Calculator,
      link: "/wholesale",
      color: "bg-green-500",
    },
    {
      title: language === "ar" ? "قوالب التصميم" : "Design Templates",
      titleAr: "قوالب التصميم",
      description:
        language === "ar"
          ? "200+ قوالب تصميم جاهزة"
          : "200+ ready-made design templates",
      descriptionAr: "200+ قوالب تصميم جاهزة",
      icon: FileText,
      link: "/templates",
      color: "bg-purple-500",
    },

    {
      title: language === "ar" ? "الدفع المرن" : "Flexible Payments",
      titleAr: "الدفع المرن",
      description:
        language === "ar"
          ? "ادفع كما تريد - الآن أو لاحقاً"
          : "Pay as you want - now or later",
      descriptionAr: "ادفع كما تريد - الآن أو لاحقاً",
      icon: ShoppingBag,
      link: "/payments/flexible",
      color: "bg-orange-500",
    },
    {
      title: language === "ar" ? "التكاملات" : "Integrations",
      titleAr: "التكاملات",
      description:
        language === "ar"
          ? "تكامل مع منصاتك المفضلة"
          : "Integrate with your favorite platforms",
      descriptionAr: "تكامل مع منصاتك المفضلة",
      icon: Plug,
      link: "/integrations",
      color: "bg-indigo-500",
    },
  ]

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
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white mb-4 px-3 py-1.5 text-sm">
              <Award className="w-3 h-3 mr-1.5" />
              {language === "ar" ? "منصة التعبئة والتغليف الرائدة في مصر" : "Leading Packaging Platform in Egypt"}
            </Badge>

            <h1 className="text-3xl lg:text-4xl font-bold leading-tight mb-4">
              {language === "ar" ? (
                <>
                  اكتشف أفضل حلول
                  <span className="text-emerald-400"> التعبئة والتغليف</span>
                </>
              ) : (
                <>
                  Discover the Best
                  <span className="text-emerald-400"> Packaging Solutions</span>
                </>
              )}
            </h1>

            <p className="text-base text-slate-200 leading-relaxed max-w-2xl mx-auto mb-6">
              {language === "ar"
                ? "منصة شاملة تربط المصانع بالتجار لتوفير أفضل منتجات التعبئة والتغليف بأسعار تنافسية وجودة مضمونة"
                : "A comprehensive platform connecting factories with traders to provide the best packaging products at competitive prices with guaranteed quality"}
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
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

                  <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={language === "ar" ? "جميع المواد" : "All Materials"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === "ar" ? "جميع المواد" : "All Materials"}</SelectItem>
                      {materials.map((material, index) => (
                        <SelectItem key={index} value={material.toLowerCase().replace(/\s+/g, "-")}>
                          {material}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button onClick={handleSearch} className="h-9 bg-emerald-600 hover:bg-emerald-700">
                    <Search className="w-4 h-4 mr-2" />
                    {language === "ar" ? "بحث" : "Search"}
                  </Button>
                </div>

                {/* Feature Badges */}
                <div className="flex flex-wrap gap-2 justify-center">
                  <Badge
                    variant="secondary"
                    className={`px-3 py-1.5 text-xs rounded-full cursor-pointer transition-all ${selectedFeature === "sustainable"
                      ? "bg-green-600 text-white border-green-600 shadow-md"
                      : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                      }`}
                    onClick={() => handleFeatureClick("sustainable")}
                  >
                    <Leaf className="w-3 h-3 mr-1.5 inline" />
                    {language === "ar" ? "مستدام" : "Sustainable"}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={`px-3 py-1.5 text-xs rounded-full cursor-pointer transition-all ${selectedFeature === "fast-delivery"
                      ? "bg-purple-600 text-white border-purple-600 shadow-md"
                      : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                      }`}
                    onClick={() => handleFeatureClick("fast-delivery")}
                  >
                    <Clock className="w-3 h-3 mr-1.5 inline" />
                    {language === "ar" ? "توصيل سريع" : "Fast Delivery"}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={`px-3 py-1.5 text-xs rounded-full cursor-pointer transition-all ${selectedFeature === "competitive-prices"
                      ? "bg-orange-600 text-white border-orange-600 shadow-md"
                      : "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                      }`}
                    onClick={() => handleFeatureClick("competitive-prices")}
                  >
                    <Target className="w-3 h-3 mr-1.5 inline" />
                    {language === "ar" ? "أسعار تنافسية" : "Competitive Prices"}
                  </Badge>
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

      {/* New Features Section */}
      <section className="py-20 bg-gradient-to-br from-emerald-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-emerald-100 text-emerald-800">
              {language === "ar" ? "ميزات جديدة" : "New Features"}
            </Badge>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              {language === "ar" ? "اكتشف ميزاتنا الجديدة" : "Discover Our New Features"}
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              {language === "ar"
                ? "ميزات متقدمة لتحسين تجربتك في التغليف"
                : "Advanced features to enhance your packaging experience"}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {newFeatures.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Link href={feature.link} key={index}>
                  <Card className="hover:shadow-lg transition-all group cursor-pointer">
                    <CardContent className="p-6">
                      <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">{language === "ar" ? feature.titleAr : feature.title}</h3>
                      <p className="text-slate-600 mb-4">{language === "ar" ? feature.descriptionAr : feature.description}</p>
                      <Button variant="ghost" size="sm" className="group-hover:text-emerald-600">
                        {language === "ar" ? "اكتشف المزيد" : "Learn More"}
                        <ArrowRight className="h-4 w-4 mr-2" />
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
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
                ? "اكتشف مجموعتنا الواسعة من منتجات التعبئة والتغليف من مصانع معتمدة"
                : "Discover our wide range of packaging products from certified factories"}
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
                  <Badge variant="secondary" className="mb-4">
                    {language === "ar" ? category.count : category.countEn}
                  </Badge>

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

      {/* Verified Supplier Badge */}
      <section className="py-20 bg-emerald-50">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="bg-emerald-600 text-white mb-6 px-4 py-2">
                <Shield className="w-4 h-4 mr-2" />
                {language === "ar" ? "مورد معتمد" : "Verified Supplier"}
              </Badge>

              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6">
                {language === "ar" ? "مصانع موثقة ومعتمدة" : "Verified and Certified Factories"}
              </h2>

              <p className="text-lg text-slate-600 mb-8">
                {language === "ar"
                  ? "جميع المصانع على منصتنا تم التحقق منها وتطبيق معايير الجودة الصارمة لضمان حصولك على أفضل المنتجات"
                  : "All factories on our platform have been verified and strict quality standards applied to ensure you get the best products"}
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600 ml-3 flex-shrink-0" />
                  <span>
                    {language === "ar"
                      ? "التحقق من السجل التجاري والمستندات"
                      : "Commercial registration and document verification"}
                  </span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600 ml-3 flex-shrink-0" />
                  <span>
                    {language === "ar"
                      ? "فحص جودة المنتجات والمواصفات"
                      : "Product quality and specification inspection"}
                  </span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600 ml-3 flex-shrink-0" />
                  <span>
                    {language === "ar" ? "تقييم العملاء والمراجعات الحقيقية" : "Customer ratings and genuine reviews"}
                  </span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600 ml-3 flex-shrink-0" />
                  <span>
                    {language === "ar" ? "ضمان الالتزام بمواعيد التسليم" : "Guaranteed delivery time commitment"}
                  </span>
                </div>
              </div>

              <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                <Link href="/manufacturers">
                  <Factory className="w-5 h-5 mr-2" />
                  {language === "ar" ? "تصفح المصانع المعتمدة" : "Browse Verified Factories"}
                </Link>
              </Button>
            </div>

            <div className="relative">
              <Image
                src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=500&fit=crop"
                alt={language === "ar" ? "مصانع معتمدة" : "Verified Suppliers"}
                width={600}
                height={500}
                className="rounded-2xl shadow-2xl"
              />

              <div className="absolute -bottom-6 right-0 bg-white p-6 rounded-xl shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Star className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">4.8/5</p>
                    <p className="text-sm text-slate-600">{language === "ar" ? "متوسط التقييم" : "Average Rating"}</p>
                  </div>
                </div>
              </div>

              <div className="absolute -top-6 left-0 bg-white p-4 rounded-xl shadow-lg">
                <div className="flex items-center gap-2">
                  <Shield className="w-8 h-8 text-emerald-600" />
                  <div>
                    <p className="font-bold text-slate-900">100%</p>
                    <p className="text-sm text-slate-600">{language === "ar" ? "موثق" : "Verified"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              {language === "ar" ? "منتجات اليوم المميزة" : "Today's Featured Products"}
            </h2>
            <p className="text-xl text-slate-600">
              {language === "ar"
                ? "أحدث المنتجات والعروض الخاصة من مصانعنا المعتمدة"
                : "Latest products and special offers from our certified factories"}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredProducts.map((product) => (
              <Card key={product.id} className="group hover:shadow-xl transition-all hover:-translate-y-1">
                <div className="relative overflow-hidden">
                  <Image
                    src={product.image || "/placeholder.svg"}
                    alt={language === "ar" ? product.name : product.nameEn}
                    width={400}
                    height={250}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
                  />
                  <Badge className="absolute top-4 right-4 bg-red-500">
                    {language === "ar" ? `خصم ${product.discount}%` : `${product.discount}% OFF`}
                  </Badge>
                  <div className="absolute top-4 left-4 flex flex-col gap-1">
                    {product.badges.map((badge, index) => (
                      <Badge key={index} className={`${getBadgeColor(badge)} text-xs`}>
                        {getBadgeText(badge)}
                      </Badge>
                    ))}
                  </div>
                </div>

                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${star <= Math.floor(product.rating) ? "text-yellow-400 fill-current" : "text-gray-300"}`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-slate-500">
                      ({product.reviews} {language === "ar" ? "تقييم" : "reviews"})
                    </span>
                  </div>

                  <h3 className="font-bold text-lg mb-2 line-clamp-2">
                    {language === "ar" ? product.name : product.nameEn}
                  </h3>
                  <p className="text-slate-600 text-sm mb-4">
                    {language === "ar" ? product.manufacturer : product.manufacturerEn} -{" "}
                    {language === "ar" ? product.location : product.locationEn}
                  </p>

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-2xl font-bold text-emerald-600">
                        {product.price} {language === "ar" ? "جنيه" : "EGP"}
                      </span>
                      <span className="text-sm text-slate-500 line-through mr-2">
                        {product.originalPrice} {language === "ar" ? "جنيه" : "EGP"}
                      </span>
                    </div>
                    <Badge variant="secondary">
                      {language === "ar" ? `الحد الأدنى: ${product.minOrder}` : `Min: ${product.minOrder}`}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1" size="sm" asChild>
                      <Link href={`/products/${product.id}`}>
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        {language === "ar" ? "طلب عينة" : "Request Sample"}
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm">
                      <Heart className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button asChild size="lg" variant="outline" className="px-8 bg-transparent">
              <Link href="/products">
                {language === "ar" ? "عرض جميع المنتجات" : "View All Products"}
                <ArrowRight className="w-5 h-5 mr-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Sustainable Focus */}
      <section className="py-20 bg-green-50">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <Image
                src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=500&fit=crop"
                alt={language === "ar" ? "تغليف مستدام" : "Sustainable Packaging"}
                width={600}
                height={500}
                className="rounded-2xl shadow-2xl"
              />

              <div className="absolute -top-6 left-0 bg-white p-4 rounded-xl shadow-lg">
                <div className="flex items-center gap-2">
                  <Recycle className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="font-bold text-slate-900">90%+</p>
                    <p className="text-sm text-slate-600">{language === "ar" ? "قابل للتدوير" : "Recyclable"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Badge className="bg-green-600 text-white mb-6 px-4 py-2">
                <Leaf className="w-4 h-4 mr-2" />
                {language === "ar" ? "الاستدامة" : "Sustainability"}
              </Badge>

              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6">
                {language === "ar" ? "التغليف المستدام لمستقبل أفضل" : "Sustainable Packaging for a Better Future"}
              </h2>

              <p className="text-lg text-slate-600 mb-8">
                {language === "ar"
                  ? "نلتزم بتوفير حلول تغليف مستدامة وصديقة للبيئة دون المساس بالجودة أو الأداء"
                  : "We are committed to providing sustainable and environmentally friendly packaging solutions without compromising quality or performance"}
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 ml-3 flex-shrink-0" />
                  <span>
                    {language === "ar"
                      ? "مواد قابلة لإعادة التدوير والتحلل الحيوي"
                      : "Recyclable and biodegradable materials"}
                  </span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 ml-3 flex-shrink-0" />
                  <span>
                    {language === "ar"
                      ? "شهادات FSC واعتماد الاستدامة"
                      : "FSC certifications and sustainability approvals"}
                  </span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 ml-3 flex-shrink-0" />
                  <span>
                    {language === "ar"
                      ? "تقليل البصمة الكربونية في كل طلب"
                      : "Reduced carbon footprint with every order"}
                  </span>
                </div>
              </div>

              <Button asChild size="lg" className="bg-green-600 hover:bg-green-700">
                <Link href="/sustainable">
                  {language === "ar" ? "اكتشف منتجاتنا المستدامة" : "Discover Our Sustainable Products"}
                  <ArrowRight className="w-5 h-5 mr-2" />
                </Link>
              </Button>
            </div>
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
                ? "خطوات بسيطة للحصول على أفضل منتجات التغليف"
                : "Simple steps to get the best packaging products"}
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
                  ? "تصفح آلاف المنتجات من مصانع معتمدة"
                  : "Browse thousands of products from verified factories"}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-emerald-600">2</span>
              </div>
              <h3 className="font-bold text-lg mb-2">
                {language === "ar" ? "اطلب عينة" : "Request Sample"}
              </h3>
              <p className="text-slate-600">
                {language === "ar"
                  ? "اطلب عينة مجانية للتأكد من الجودة"
                  : "Request a free sample to verify quality"}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-emerald-600">3</span>
              </div>
              <h3 className="font-bold text-lg mb-2">
                {language === "ar" ? "اطلب بكمية" : "Order in Bulk"}
              </h3>
              <p className="text-slate-600">
                {language === "ar"
                  ? "اطلب الكمية التي تحتاجها بأسعار الجملة"
                  : "Order the quantity you need at wholesale prices"}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-emerald-600">4</span>
              </div>
              <h3 className="font-bold text-lg mb-2">
                {language === "ar" ? "تسليم سريع" : "Fast Delivery"}
              </h3>
              <p className="text-slate-600">
                {language === "ar"
                  ? "احصل على منتجاتك في الوقت المحدد"
                  : "Get your products delivered on time"}
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
              ? "انضم إلى آلاف العملاء الراضين الذين يثقون بنا لتلبية احتياجاتهم من التغليف"
              : "Join thousands of satisfied customers who trust us to meet their packaging needs"}
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
