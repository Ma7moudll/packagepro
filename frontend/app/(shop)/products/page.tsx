"use client"

import { useState, useEffect, Suspense, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useLanguage } from "@/providers/language-provider"
import { useCart } from "@/providers/cart-provider"
import { Search, Grid, List, ShoppingCart, Eye, Star, Bell, Package, Palette, AlertCircle, Leaf, Shield, Clock, Target, Heart } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface Product {
  id: string
  name: string
  nameEn: string
  description: string
  descriptionEn: string
  price: number
  image: string
  category: string
  subcategory: string
  material: string
  minQuantity: number
  customizable: boolean
  stock: number
  sizes: string[]
  rating?: number
  reviewCount?: number
  discount?: number
  sustainableMaterial?: boolean
}

function ProductsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { language } = useLanguage()
  const { addItem } = useCart()

  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "")
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all")
  const [selectedMaterial, setSelectedMaterial] = useState(searchParams.get("material") || "all")
  const [selectedFeature, setSelectedFeature] = useState(searchParams.get("feature") || null)
  const [sortBy, setSortBy] = useState("name")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [priceRange] = useState({ min: 0, max: 1000 })

  // Dialog states
  const [customOrderDialog, setCustomOrderDialog] = useState(false)
  const [sampleDialog, setSampleDialog] = useState(false)
  const [priceAlertDialog, setPriceAlertDialog] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [wishlistItems, setWishlistItems] = useState<Set<string>>(new Set())

  // Form states
  const [customOrderForm, setCustomOrderForm] = useState({
    quantity: "",
    specifications: "",
    deadline: "",
    contactInfo: "",
  })
  const [sampleForm, setSampleForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  })
  const [priceAlertForm, setPriceAlertForm] = useState({
    email: "",
    targetPrice: "",
  })



  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/products")

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Response is not JSON")
      }

      const data = await response.json()

      if (data.success === false) {
        throw new Error(data.message || "Failed to fetch products")
      }

      setProducts(data.products || [])
      setLoading(false)
    } catch (error) {
      console.error("Error fetching products:", error)
      setError(error instanceof Error ? error.message : "Failed to load products")
      setProducts([])
      setLoading(false)

      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description:
          language === "ar"
            ? "فشل تحميل المنتجات. يرجى المحاولة مرة أخرى."
            : "Failed to load products. Please try again.",
        variant: "destructive",
      })
    }
  }, [language])

  const filterProducts = useCallback(() => {
    let filtered = [...products]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.descriptionEn.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter((product) => product.category === selectedCategory)
    }

    // Material filter
    if (selectedMaterial !== "all") {
      filtered = filtered.filter((product) => product.material === selectedMaterial)
    }

    // Feature filter
    if (selectedFeature) {
      switch (selectedFeature) {
        case "sustainable":
          filtered = filtered.filter(
            (product) =>
              product.sustainableMaterial === true ||
              product.name.toLowerCase().includes("sustainable") ||
              product.nameEn.toLowerCase().includes("sustainable") ||
              product.description.toLowerCase().includes("مستدام") ||
              product.descriptionEn.toLowerCase().includes("eco") ||
              product.description.toLowerCase().includes("صديق") ||
              product.material.toLowerCase().includes("sustainable")
          )
          break
        case "verified":
          // Filter verified products (can be based on rating or other criteria)
          filtered = filtered.filter((product) => (product.rating || 0) >= 4.0)
          break
        case "fast-delivery":
          // Filter products with fast delivery (can be based on stock or other criteria)
          filtered = filtered.filter((product) => product.stock > 0)
          break
        case "competitive-prices":
          // Filter products with competitive prices (below average)
          const avgPrice = products.reduce((sum, p) => sum + p.price, 0) / products.length
          filtered = filtered.filter((product) => product.price < avgPrice * 0.9)
          break
      }
    }

    // Price range filter
    filtered = filtered.filter((product) => product.price >= priceRange.min && product.price <= priceRange.max)

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return a.price - b.price
        case "price-high":
          return b.price - a.price
        case "rating":
          return (b.rating || 0) - (a.rating || 0)
        case "name":
        default:
          return language === "ar" ? a.name.localeCompare(b.name) : a.nameEn.localeCompare(b.nameEn)
      }
    })

    setFilteredProducts(filtered)
  }, [products, searchTerm, selectedCategory, selectedMaterial, selectedFeature, sortBy, priceRange, language])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Update filters from URL params
  useEffect(() => {
    const search = searchParams.get("search")
    const category = searchParams.get("category")
    const material = searchParams.get("material")
    const feature = searchParams.get("feature")

    if (search !== null) {
      setSearchTerm(search)
    }
    if (category !== null) {
      setSelectedCategory(category || "all")
    }
    if (material !== null) {
      setSelectedMaterial(material || "all")
    }
    if (feature !== null) {
      setSelectedFeature(feature)
    } else {
      setSelectedFeature(null)
    }
  }, [searchParams])

  useEffect(() => {
    filterProducts()
  }, [filterProducts])

  const handleAddToCart = (product: Product) => {
    addItem({
      id: product.id,
      name: language === "ar" ? product.name : product.nameEn,
      price: product.price,
      quantity: 1,
      image: product.image,
    })
    toast({
      title: language === "ar" ? "تم إضافة المنتج" : "Product Added",
      description: language === "ar" ? "تم إضافة المنتج إلى السلة بنجاح" : "Product added to cart successfully",
    })
  }

  const handleViewDetails = (productId: string) => {
    router.push(`/products/${productId}`)
  }

  const handleCustomOrder = (product: Product) => {
    setSelectedProduct(product)
    setCustomOrderDialog(true)
  }

  const handleSampleRequest = (product: Product) => {
    setSelectedProduct(product)
    setSampleDialog(true)
  }

  const handlePriceAlert = (product: Product) => {
    setSelectedProduct(product)
    setPriceAlertDialog(true)
  }

  const toggleWishlist = async (product: Product) => {
    const isInWishlist = wishlistItems.has(product.id)

    try {
      if (isInWishlist) {
        // Remove from wishlist
        const response = await fetch("/api/wishlist", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.id }),
        })
        if (response.ok) {
          setWishlistItems((prev) => {
            const newSet = new Set(prev)
            newSet.delete(product.id)
            return newSet
          })
          toast({
            title: language === "ar" ? "تم الحذف" : "Removed",
            description: language === "ar" ? "تم حذف المنتج من المفضلة" : "Product removed from wishlist",
          })
        }
      } else {
        // Add to wishlist
        const response = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.id }),
        })
        if (response.ok) {
          setWishlistItems((prev) => new Set(prev).add(product.id))
          toast({
            title: language === "ar" ? "تم الإضافة" : "Added",
            description: language === "ar" ? "تم إضافة المنتج للمفضلة" : "Product added to wishlist",
          })
        }
      }
    } catch {
      // Fallback: update local state even if API fails
      if (isInWishlist) {
        setWishlistItems((prev) => {
          const newSet = new Set(prev)
          newSet.delete(product.id)
          return newSet
        })
      } else {
        setWishlistItems((prev) => new Set(prev).add(product.id))
      }
    }
  }

  const submitCustomOrder = async () => {
    try {
      const response = await fetch("/api/custom-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct?.id,
          productName: selectedProduct?.name,
          ...customOrderForm,
        }),
      })

      if (response.ok) {
        toast({
          title: language === "ar" ? "تم إرسال الطلب" : "Order Submitted",
          description: language === "ar" ? "سيتم التواصل معك قريباً" : "We will contact you soon",
        })
        setCustomOrderDialog(false)
        setCustomOrderForm({ quantity: "", specifications: "", deadline: "", contactInfo: "" })
      }
    } catch {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" ? "حدث خطأ في إرسال الطلب" : "Error submitting order",
        variant: "destructive",
      })
    }
  }

  const submitSampleRequest = async () => {
    try {
      const response = await fetch("/api/sample-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct?.id,
          productName: selectedProduct?.name,
          ...sampleForm,
        }),
      })

      if (response.ok) {
        toast({
          title: language === "ar" ? "تم إرسال طلب العينة" : "Sample Request Submitted",
          description: language === "ar" ? "سيتم إرسال العينة خلال 3-5 أيام" : "Sample will be sent within 3-5 days",
        })
        setSampleDialog(false)
        setSampleForm({ name: "", company: "", email: "", phone: "", address: "", notes: "" })
      }
    } catch {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" ? "حدث خطأ في إرسال الطلب" : "Error submitting request",
        variant: "destructive",
      })
    }
  }

  const submitPriceAlert = async () => {
    try {
      const response = await fetch("/api/price-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct?.id,
          productName: selectedProduct?.name,
          currentPrice: selectedProduct?.price,
          ...priceAlertForm,
        }),
      })

      if (response.ok) {
        toast({
          title: language === "ar" ? "تم تفعيل التنبيه" : "Alert Activated",
          description: language === "ar" ? "سيتم إشعارك عند انخفاض السعر" : "You will be notified when price drops",
        })
        setPriceAlertDialog(false)
        setPriceAlertForm({ email: "", targetPrice: "" })
      }
    } catch {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" ? "حدث خطأ في تفعيل التنبيه" : "Error activating alert",
        variant: "destructive",
      })
    }
  }

  const categories = [
    { value: "all", label: language === "ar" ? "جميع الفئات" : "All Categories" },
    { value: "food-packaging", label: language === "ar" ? "تعبئة الأطعمة" : "Food Packaging" },
    { value: "cups-lids", label: language === "ar" ? "الأكواب والأغطية" : "Cups & Lids" },
    { value: "bags-packaging", label: language === "ar" ? "الأكياس والتغليف" : "Bags & Packaging" },
    { value: "cutlery", label: language === "ar" ? "أدوات المائدة" : "Cutlery" },
    { value: "delivery-supplies", label: language === "ar" ? "مستلزمات التوصيل" : "Delivery Supplies" },
  ]

  const materials = [
    { value: "all", label: language === "ar" ? "جميع المواد" : "All Materials" },
    { value: "Corrugated Cardboard", label: language === "ar" ? "كرتون مقوى" : "Corrugated Cardboard" },
    { value: "Food Grade Cardboard", label: language === "ar" ? "كرتون غذائي" : "Food Grade Cardboard" },
    { value: "Food Grade Plastic", label: language === "ar" ? "بلاستيك غذائي" : "Food Grade Plastic" },
    { value: "Kraft Paper", label: language === "ar" ? "ورق كرافت" : "Kraft Paper" },
    { value: "Insulated Paper", label: language === "ar" ? "ورق معزول" : "Insulated Paper" },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">
                {language === "ar" ? "جاري تحميل المنتجات..." : "Loading products..."}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <Card className="max-w-md w-full">
              <CardContent className="p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{language === "ar" ? "خطأ في التحميل" : "Loading Error"}</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <Button onClick={fetchProducts}>{language === "ar" ? "إعادة المحاولة" : "Try Again"}</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{language === "ar" ? "منتجاتنا" : "Our Products"}</h1>
          <p className="text-gray-600">
            {language === "ar"
              ? "اكتشف مجموعتنا الواسعة من منتجات التعبئة والتغليف عالية الجودة"
              : "Discover our wide range of high-quality packaging products"}
          </p>
        </div>

        {/* Search Section - Side by Side Layout */}
        <Card className="mb-4 bg-white shadow-lg rounded-xl">
          <CardContent className="p-5">
            {/* Search Bar and Filters in Same Row */}
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              {/* Search Bar - Takes more space */}
              <div className="relative flex-1 md:flex-[2]">
                <Search className={`absolute ${language === "ar" ? "right-3" : "left-3"} top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5`} />
                <Input
                  placeholder={language === "ar" ? "ابحث عن المنتجات..." : "Search for products..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      filterProducts()
                    }
                  }}
                  className={`h-12 text-base rounded-lg ${language === "ar" ? "pr-11 text-right" : "pl-11"}`}
                />
              </div>

              {/* Three Filters - Side by Side */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-12 rounded-lg text-sm flex-1">
                  <SelectValue placeholder={language === "ar" ? "نوع المنتج" : "Product Type"} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                <SelectTrigger className="h-12 rounded-lg text-sm flex-1">
                  <SelectValue placeholder={language === "ar" ? "المادة" : "Material"} />
                </SelectTrigger>
                <SelectContent>
                  {materials.map((material) => (
                    <SelectItem key={material.value} value={material.value}>
                      {material.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-12 rounded-lg text-sm flex-1">
                  <SelectValue placeholder={language === "ar" ? "الترتيب" : "Sort By"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">{language === "ar" ? "الاسم" : "Name"}</SelectItem>
                  <SelectItem value="price-low">
                    {language === "ar" ? "السعر: منخفض إلى مرتفع" : "Price: Low to High"}
                  </SelectItem>
                  <SelectItem value="price-high">
                    {language === "ar" ? "السعر: مرتفع إلى منخفض" : "Price: High to Low"}
                  </SelectItem>
                  <SelectItem value="rating">{language === "ar" ? "التقييم" : "Rating"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search Button - Full Width */}
            <Button
              onClick={filterProducts}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-base font-semibold shadow-sm"
            >
              <Search className={`w-5 h-5 ${language === "ar" ? "ml-2" : "mr-2"}`} />
              {language === "ar" ? "بحث" : "Search"}
            </Button>
          </CardContent>
        </Card>

        {/* Features Badges - Compact Row */}
        <div className="flex flex-wrap items-center gap-2 mb-3 justify-center md:justify-start">
          <Badge variant="secondary" className="px-3 py-1.5 text-xs bg-green-50 text-green-700 border-green-200 rounded-full">
            <Leaf className="w-3 h-3 mr-1.5 inline" />
            {language === "ar" ? "تغليف مستدام" : "Sustainable Packaging"}
          </Badge>
          <Badge variant="secondary" className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 border-blue-200 rounded-full">
            <Shield className="w-3 h-3 mr-1.5 inline" />
            {language === "ar" ? "مورد معتمد" : "Verified Supplier"}
          </Badge>
          <Badge variant="secondary" className="px-3 py-1.5 text-xs bg-purple-50 text-purple-700 border-purple-200 rounded-full">
            <Clock className="w-3 h-3 mr-1.5 inline" />
            {language === "ar" ? "توصيل سريع" : "Fast Delivery"}
          </Badge>
          <Badge variant="secondary" className="px-3 py-1.5 text-xs bg-orange-50 text-orange-700 border-orange-200 rounded-full">
            <Target className="w-3 h-3 mr-1.5 inline" />
            {language === "ar" ? "أسعار تنافسية" : "Competitive Prices"}
          </Badge>
        </div>

        {/* View Mode & Results Count */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-600">
            {language === "ar"
              ? `تم العثور على ${filteredProducts.length} منتج`
              : `${filteredProducts.length} products found`}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 mr-1">
              {language === "ar" ? "العرض:" : "View:"}
            </span>
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-8 w-8 p-0"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8 w-8 p-0"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Products Grid */}
        <div
          className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"}`}
        >
          {filteredProducts.map((product) => (
            <Card key={product.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                {/* Product Image */}
                <div className="relative aspect-square mb-4 rounded-lg overflow-hidden bg-gray-100 group">
                  <Image
                    src={product.image || "/placeholder.svg"}
                    alt={language === "ar" ? product.name : product.nameEn}
                    fill
                    className="object-cover"
                  />
                  {product.discount && (
                    <Badge className="absolute top-2 right-2 bg-red-500">-{product.discount}%</Badge>
                  )}
                  {product.customizable && (
                    <Badge className="absolute top-2 left-2 bg-blue-500">
                      <Palette className="w-3 h-3 mr-1" />
                      {language === "ar" ? "قابل للتخصيص" : "Customizable"}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-white hover:bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => toggleWishlist(product)}
                  >
                    <Heart
                      className={`h-4 w-4 ${wishlistItems.has(product.id) ? "text-red-500 fill-current" : "text-gray-400"}`}
                    />
                  </Button>
                </div>

                {/* Product Info */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg line-clamp-2">
                    {language === "ar" ? product.name : product.nameEn}
                  </h3>

                  <p className="text-sm text-gray-600 line-clamp-2">
                    {language === "ar" ? product.description : product.descriptionEn}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      {product.rating && (
                        <>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${i < Math.floor(product.rating!) ? "text-yellow-400 fill-current" : "text-gray-300"
                                  }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-gray-500">({product.reviewCount})</span>
                        </>
                      )}
                    </div>
                    <Badge variant="secondary">{product.material}</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-lg font-bold text-blue-600">${product.price.toFixed(2)}</span>
                      <span className="text-xs text-gray-500">
                        {language === "ar" ? "الحد الأدنى:" : "Min:"} {product.minQuantity}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span
                        className={`text-xs px-2 py-1 rounded ${product.stock > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                      >
                        {product.stock > 0
                          ? language === "ar"
                            ? "متوفر"
                            : "In Stock"
                          : language === "ar"
                            ? "نفد المخزون"
                            : "Out of Stock"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleViewDetails(product.id)}
                      variant="outline"
                      size="sm"
                      className="flex items-center justify-center"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      {language === "ar" ? "عرض التفاصيل" : "View Details"}
                    </Button>
                    <Button
                      onClick={() => handleAddToCart(product)}
                      size="sm"
                      disabled={product.stock === 0}
                      className="flex items-center justify-center"
                    >
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      {language === "ar" ? "إضافة للسلة" : "Add to Cart"}
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-1">
                    <Button onClick={() => handleCustomOrder(product)} variant="outline" size="sm" className="text-xs">
                      <Package className="w-3 h-3 mr-1" />
                      {language === "ar" ? "طلب خاص" : "Custom"}
                    </Button>
                    <Button
                      onClick={() => handleSampleRequest(product)}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      <Package className="w-3 h-3 mr-1" />
                      {language === "ar" ? "عينة" : "Sample"}
                    </Button>
                    <Button onClick={() => handlePriceAlert(product)} variant="outline" size="sm" className="text-xs">
                      <Bell className="w-3 h-3 mr-1" />
                      {language === "ar" ? "تنبيه" : "Alert"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* No Results */}
        {filteredProducts.length === 0 && !loading && !error && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {language === "ar" ? "لم يتم العثور على منتجات" : "No products found"}
            </p>
            <Button onClick={() => window.location.reload()} className="mt-4" variant="outline">
              {language === "ar" ? "إعادة التحميل" : "Reload"}
            </Button>
          </div>
        )}

        {/* Custom Order Dialog */}
        <Dialog open={customOrderDialog} onOpenChange={setCustomOrderDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{language === "ar" ? "طلب خاص" : "Custom Order"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{language === "ar" ? "الكمية المطلوبة" : "Required Quantity"}</Label>
                <Input
                  value={customOrderForm.quantity}
                  onChange={(e) => setCustomOrderForm({ ...customOrderForm, quantity: e.target.value })}
                  placeholder={language === "ar" ? "أدخل الكمية" : "Enter quantity"}
                />
              </div>
              <div>
                <Label>{language === "ar" ? "المواصفات الخاصة" : "Special Specifications"}</Label>
                <Textarea
                  value={customOrderForm.specifications}
                  onChange={(e) => setCustomOrderForm({ ...customOrderForm, specifications: e.target.value })}
                  placeholder={language === "ar" ? "اكتب المواصفات المطلوبة" : "Write required specifications"}
                />
              </div>
              <div>
                <Label>{language === "ar" ? "الموعد المطلوب" : "Required Deadline"}</Label>
                <Input
                  type="date"
                  value={customOrderForm.deadline}
                  onChange={(e) => setCustomOrderForm({ ...customOrderForm, deadline: e.target.value })}
                />
              </div>
              <div>
                <Label>{language === "ar" ? "معلومات التواصل" : "Contact Information"}</Label>
                <Input
                  value={customOrderForm.contactInfo}
                  onChange={(e) => setCustomOrderForm({ ...customOrderForm, contactInfo: e.target.value })}
                  placeholder={language === "ar" ? "رقم الهاتف أو البريد الإلكتروني" : "Phone number or email"}
                />
              </div>
              <Button onClick={submitCustomOrder} className="w-full">
                {language === "ar" ? "إرسال الطلب" : "Submit Order"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Sample Request Dialog */}
        <Dialog open={sampleDialog} onOpenChange={setSampleDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{language === "ar" ? "طلب عينة مجانية" : "Free Sample Request"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{language === "ar" ? "الاسم" : "Name"}</Label>
                <Input
                  value={sampleForm.name}
                  onChange={(e) => setSampleForm({ ...sampleForm, name: e.target.value })}
                  placeholder={language === "ar" ? "اسمك الكامل" : "Your full name"}
                />
              </div>
              <div>
                <Label>{language === "ar" ? "الشركة" : "Company"}</Label>
                <Input
                  value={sampleForm.company}
                  onChange={(e) => setSampleForm({ ...sampleForm, company: e.target.value })}
                  placeholder={language === "ar" ? "اسم الشركة" : "Company name"}
                />
              </div>
              <div>
                <Label>{language === "ar" ? "البريد الإلكتروني" : "Email"}</Label>
                <Input
                  type="email"
                  value={sampleForm.email}
                  onChange={(e) => setSampleForm({ ...sampleForm, email: e.target.value })}
                  placeholder={language === "ar" ? "بريدك الإلكتروني" : "Your email"}
                />
              </div>
              <div>
                <Label>{language === "ar" ? "رقم الهاتف" : "Phone"}</Label>
                <Input
                  value={sampleForm.phone}
                  onChange={(e) => setSampleForm({ ...sampleForm, phone: e.target.value })}
                  placeholder={language === "ar" ? "رقم هاتفك" : "Your phone number"}
                />
              </div>
              <div>
                <Label>{language === "ar" ? "العنوان" : "Address"}</Label>
                <Textarea
                  value={sampleForm.address}
                  onChange={(e) => setSampleForm({ ...sampleForm, address: e.target.value })}
                  placeholder={language === "ar" ? "عنوان الشحن" : "Shipping address"}
                />
              </div>
              <Button onClick={submitSampleRequest} className="w-full">
                {language === "ar" ? "طلب العينة" : "Request Sample"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Price Alert Dialog */}
        <Dialog open={priceAlertDialog} onOpenChange={setPriceAlertDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{language === "ar" ? "تنبيه انخفاض السعر" : "Price Drop Alert"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  {language === "ar" ? "السعر الحالي:" : "Current Price:"} ${selectedProduct?.price.toFixed(2)}
                </p>
              </div>
              <div>
                <Label>{language === "ar" ? "البريد الإلكتروني" : "Email"}</Label>
                <Input
                  type="email"
                  value={priceAlertForm.email}
                  onChange={(e) => setPriceAlertForm({ ...priceAlertForm, email: e.target.value })}
                  placeholder={language === "ar" ? "بريدك الإلكتروني" : "Your email"}
                />
              </div>
              <div>
                <Label>{language === "ar" ? "السعر المستهدف" : "Target Price"}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={priceAlertForm.targetPrice}
                  onChange={(e) => setPriceAlertForm({ ...priceAlertForm, targetPrice: e.target.value })}
                  placeholder={language === "ar" ? "السعر المرغوب" : "Desired price"}
                />
              </div>
              <Button onClick={submitPriceAlert} className="w-full">
                {language === "ar" ? "تفعيل التنبيه" : "Activate Alert"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading products...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  )
}
