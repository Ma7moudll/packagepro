"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLanguage } from "@/providers/language-provider"
import { useCart } from "@/providers/cart-provider"
import { useToast } from "@/hooks/use-toast"
import {
  Heart,
  Share2,
  Star,
  Plus,
  Minus,
  Upload,
  Eye,
  ShoppingCart,
  Package,
  Truck,
  Shield,
  Award,
  Users,
  ChevronLeft,
  ChevronRight,
  Palette,
} from "lucide-react"

// Mock product data with multiple images
const productData = {
  1: {
    id: 1,
    name: { ar: "علب بيتزا كرتونية", en: "Pizza Boxes" },
    category: { ar: "العلب", en: "Boxes" },
    material: { ar: "كرتون مقوى", en: "Corrugated Cardboard" },
    description: {
      ar: "علب بيتزا عالية الجودة مصنوعة من الكرتون المقوى المعاد تدويره. مقاومة للدهون والرطوبة، مع إمكانية الطباعة المخصصة.",
      en: "High-quality pizza boxes made from recycled corrugated cardboard. Grease and moisture resistant, with custom printing options.",
    },
    images: [
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&h=600&fit=crop",
    ],
    sizes: [
      { name: { ar: "صغير", en: "Small" }, dimensions: "20x20x4 cm", price: 2.5 },
      { name: { ar: "متوسط", en: "Medium" }, dimensions: "25x25x4 cm", price: 3.0 },
      { name: { ar: "كبير", en: "Large" }, dimensions: "30x30x4 cm", price: 3.5 },
      { name: { ar: "كبير جداً", en: "Extra Large" }, dimensions: "35x35x4 cm", price: 4.0 },
    ],
    features: {
      ar: [
        "مقاوم للدهون والرطوبة",
        "قابل للتحلل البيولوجي",
        "طباعة مخصصة متاحة",
        "سهل الطي والتجميع",
        "مصنوع من مواد معاد تدويرها",
      ],
      en: [
        "Grease and moisture resistant",
        "Biodegradable",
        "Custom printing available",
        "Easy to fold and assemble",
        "Made from recycled materials",
      ],
    },
    specifications: {
      ar: {
        المادة: "كرتون مقوى 350 جرام",
        اللون: "أبيض/بني طبيعي",
        الطباعة: "فليكسو/أوفست",
        "الحد الأدنى للطلب": "500 قطعة",
        "وقت التسليم": "7-10 أيام عمل",
      },
      en: {
        Material: "350gsm Corrugated Cardboard",
        Color: "White/Natural Brown",
        Printing: "Flexo/Offset",
        "Minimum Order": "500 pieces",
        "Delivery Time": "7-10 business days",
      },
    },
    reviews: [
      {
        name: "أحمد محمد",
        rating: 5,
        comment: "جودة ممتازة وسعر مناسب. الطباعة واضحة والعلب قوية.",
        date: "2024-01-15",
      },
      {
        name: "فاطمة علي",
        rating: 4,
        comment: "منتج جيد جداً، لكن التسليم كان متأخر قليلاً.",
        date: "2024-01-10",
      },
    ],
    rating: 4.5,
    reviewCount: 127,
  },
  2: {
    id: 2,
    name: { ar: "علب برجر كرتونية", en: "Burger Boxes" },
    category: { ar: "العلب", en: "Boxes" },
    material: { ar: "كرتون مقوى", en: "Corrugated Cardboard" },
    description: {
      ar: "علب برجر مصممة خصيصاً للحفاظ على طعم ونكهة البرجر. مقاومة للدهون مع تهوية مناسبة.",
      en: "Burger boxes specially designed to maintain taste and flavor. Grease resistant with proper ventilation.",
    },
    images: [
      "https://images.unsplash.com/photo-1593246049226-ded77bf90326?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=600&fit=crop",
    ],
    sizes: [
      { name: { ar: "صغير", en: "Small" }, dimensions: "10x10x8 cm", price: 1.8 },
      { name: { ar: "متوسط", en: "Medium" }, dimensions: "12x12x8 cm", price: 2.2 },
      { name: { ar: "كبير", en: "Large" }, dimensions: "14x14x8 cm", price: 2.6 },
    ],
    features: {
      ar: ["تهوية مناسبة للحفاظ على الطعم", "مقاوم للدهون", "سهل الفتح والإغلاق", "طباعة ملونة متاحة"],
      en: [
        "Proper ventilation to maintain taste",
        "Grease resistant",
        "Easy to open and close",
        "Color printing available",
      ],
    },
    specifications: {
      ar: {
        المادة: "كرتون مقوى 300 جرام",
        اللون: "أبيض/بني",
        الطباعة: "فليكسو",
        "الحد الأدنى للطلب": "1000 قطعة",
        "وقت التسليم": "5-7 أيام عمل",
      },
      en: {
        Material: "300gsm Corrugated Cardboard",
        Color: "White/Brown",
        Printing: "Flexo",
        "Minimum Order": "1000 pieces",
        "Delivery Time": "5-7 business days",
      },
    },
    reviews: [
      {
        name: "سارة أحمد",
        rating: 5,
        comment: "ممتازة للمطعم، العملاء راضيين جداً عن الجودة.",
        date: "2024-01-20",
      },
    ],
    rating: 4.7,
    reviewCount: 89,
  },
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { language, t } = useLanguage()
  const { addItem: addToCart } = useCart()
  const { toast } = useToast()

  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedSize, setSelectedSize] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [showLogoOnProduct, setShowLogoOnProduct] = useState(false)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const productId = Array.isArray(params.id) ? params.id[0] : params.id
  const product = productData[productId as unknown as keyof typeof productData]

  useEffect(() => {
    if (!product) {
      router.push("/products")
    }
  }, [product, router])

  if (!product) {
    return <div>Loading...</div>
  }

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddToCart = () => {
    const selectedSizeData = product.sizes[selectedSize]
    addToCart({
      id: String(product.id),
      name: product.name[language],
      price: selectedSizeData.price,
      quantity,
      image: product.images[0] || "",
    })
    toast({
      title: language === "ar" ? "تم الإضافة" : "Added to Cart",
      description: language === "ar" ? "تم إضافة المنتج إلى السلة بنجاح" : "Product added to cart successfully",
    })
  }

  const handleToggleWishlist = async () => {
    try {
      if (isWishlisted) {
        const response = await fetch("/api/wishlist", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: String(product.id) }),
        })
        if (response.ok) {
          setIsWishlisted(false)
          toast({
            title: language === "ar" ? "تم الحذف" : "Removed",
            description: language === "ar" ? "تم حذف المنتج من المفضلة" : "Product removed from wishlist",
          })
        }
      } else {
        const response = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: String(product.id) }),
        })
        if (response.ok) {
          setIsWishlisted(true)
          toast({
            title: language === "ar" ? "تم الإضافة" : "Added",
            description: language === "ar" ? "تم إضافة المنتج للمفضلة" : "Product added to wishlist",
          })
        }
      }
    } catch {
      setIsWishlisted(!isWishlisted)
    }
  }

  const totalPrice = product.sizes[selectedSize].price * quantity

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
          <button onClick={() => router.push("/")} className="hover:text-blue-600">
            {t("home")}
          </button>
          <ChevronRight className="w-4 h-4" />
          <button onClick={() => router.push("/products")} className="hover:text-blue-600">
            {t("products")}
          </button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900">{product.name[language]}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Product Images */}
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <CardContent className="p-0 relative">
                <div className="relative aspect-square">
                  <Image
                    src={product.images[selectedImage] || "/placeholder.svg"}
                    alt={product.name[language]}
                    fill
                    className="object-cover"
                  />
                  {showLogoOnProduct && logoPreview && (
                    <div className="absolute top-4 right-4 w-16 h-16 bg-white rounded-lg p-2 shadow-lg">
                      <Image
                        src={logoPreview || "/placeholder.svg"}
                        alt="Logo Preview"
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                </div>

                {/* Image Navigation */}
                {product.images.length > 1 && (
                  <>
                    <button
                      onClick={() => setSelectedImage((prev) => (prev > 0 ? prev - 1 : product.images.length - 1))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white hover:bg-white rounded-full p-2 shadow-lg"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setSelectedImage((prev) => (prev < product.images.length - 1 ? prev + 1 : 0))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white hover:bg-white rounded-full p-2 shadow-lg"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Thumbnail Images */}
            <div className="flex space-x-2 overflow-x-auto">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${selectedImage === index ? "border-blue-500" : "border-gray-200"
                    }`}
                >
                  <Image
                    src={image || "/placeholder.svg"}
                    alt={`${product.name[language]} ${index + 1}`}
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary">{product.category[language]}</Badge>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleToggleWishlist}
                    className={`p-2 rounded-full ${isWishlisted ? "text-red-500" : "text-gray-400"} hover:bg-gray-100`}
                  >
                    <Heart className={`w-5 h-5 ${isWishlisted ? "fill-current" : ""}`} />
                  </button>
                  <button className="p-2 rounded-full text-gray-400 hover:bg-gray-100">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name[language]}</h1>

              <div className="flex items-center space-x-2 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < Math.floor(product.rating) ? "text-yellow-400 fill-current" : "text-gray-300"
                        }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  {product.rating} ({product.reviewCount} {language === "ar" ? "تقييم" : "reviews"})
                </span>
              </div>

              <p className="text-gray-600 leading-relaxed">{product.description[language]}</p>
            </div>

            {/* Size Selection */}
            <div>
              <h3 className="text-lg font-semibold mb-3">{language === "ar" ? "اختر المقاس" : "Select Size"}</h3>
              <div className="grid grid-cols-2 gap-3">
                {product.sizes.map((size, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedSize(index)}
                    className={`p-3 rounded-lg border-2 text-left ${selectedSize === index ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                      }`}
                  >
                    <div className="font-medium">{size.name[language]}</div>
                    <div className="text-sm text-gray-600">{size.dimensions}</div>
                    <div className="text-sm font-semibold text-blue-600">${size.price.toFixed(2)}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Logo Upload */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Palette className="w-5 h-5 mr-2" />
                  {language === "ar" ? "إضافة اللوجو" : "Add Logo"}
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center space-x-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{language === "ar" ? "رفع اللوجو" : "Upload Logo"}</span>
                    </Button>

                    {logoPreview && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowLogoOnProduct(!showLogoOnProduct)}
                        className="flex items-center space-x-2"
                      >
                        <Eye className="w-4 h-4" />
                        <span>
                          {showLogoOnProduct
                            ? language === "ar"
                              ? "إخفاء"
                              : "Hide"
                            : language === "ar"
                              ? "عرض"
                              : "Show"}
                        </span>
                      </Button>
                    )}
                  </div>

                  {logoPreview && (
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 border rounded-lg overflow-hidden">
                        <Image
                          src={logoPreview || "/placeholder.svg"}
                          alt="Logo Preview"
                          width={48}
                          height={48}
                          className="object-contain w-full h-full"
                        />
                      </div>
                      <div className="text-sm text-gray-600">{logoFile?.name}</div>
                    </div>
                  )}
                </div>

                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </CardContent>
            </Card>

            {/* Quantity and Add to Cart */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-3">{language === "ar" ? "الكمية" : "Quantity"}</h3>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-2 border border-gray-300 rounded-lg min-w-[60px] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>{language === "ar" ? "الإجمالي:" : "Total:"}</span>
                  <span className="text-blue-600">${totalPrice.toFixed(2)}</span>
                </div>
              </div>

              <Button
                onClick={handleAddToCart}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                size="lg"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                {language === "ar" ? "إضافة للسلة" : "Add to Cart"}
              </Button>
            </div>

            {/* Product Features */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Award className="w-5 h-5 mr-2" />
                  {language === "ar" ? "المميزات" : "Features"}
                </h3>
                <ul className="space-y-2">
                  {product.features[language].map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-600">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Product Information Tabs */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <Tabs defaultValue="specifications" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="specifications">{language === "ar" ? "المواصفات" : "Specifications"}</TabsTrigger>
                <TabsTrigger value="reviews">{language === "ar" ? "التقييمات" : "Reviews"}</TabsTrigger>
                <TabsTrigger value="shipping">{language === "ar" ? "الشحن" : "Shipping"}</TabsTrigger>
              </TabsList>

              <TabsContent value="specifications" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(product.specifications[language]).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-700">{key}:</span>
                      <span className="text-gray-600">{value}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <div className="space-y-4">
                  {product.reviews.map((review, index) => (
                    <div key={index} className="border-b border-gray-100 pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{review.name}</span>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${i < review.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                                  }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">{review.date}</span>
                      </div>
                      <p className="text-gray-600">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="shipping" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center space-x-3">
                    <Truck className="w-8 h-8 text-blue-500" />
                    <div>
                      <h4 className="font-medium">{language === "ar" ? "شحن سريع" : "Fast Shipping"}</h4>
                      <p className="text-sm text-gray-600">
                        {language === "ar" ? "3-5 أيام عمل" : "3-5 business days"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Shield className="w-8 h-8 text-green-500" />
                    <div>
                      <h4 className="font-medium">{language === "ar" ? "ضمان الجودة" : "Quality Guarantee"}</h4>
                      <p className="text-sm text-gray-600">{language === "ar" ? "30 يوم ضمان" : "30-day warranty"}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Package className="w-8 h-8 text-purple-500" />
                    <div>
                      <h4 className="font-medium">{language === "ar" ? "تغليف آمن" : "Safe Packaging"}</h4>
                      <p className="text-sm text-gray-600">{language === "ar" ? "حماية كاملة" : "Full protection"}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Related Products */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-6 flex items-center">
              <Users className="w-6 h-6 mr-2" />
              {language === "ar" ? "منتجات مشابهة" : "Related Products"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.values(productData)
                .filter((p) => p.id !== product.id)
                .slice(0, 4)
                .map((relatedProduct) => (
                  <Card key={relatedProduct.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="aspect-square relative mb-3 rounded-lg overflow-hidden">
                        <Image
                          src={relatedProduct.images[0] || "/placeholder.svg"}
                          alt={relatedProduct.name[language]}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <h4 className="font-medium mb-2">{relatedProduct.name[language]}</h4>
                      <p className="text-sm text-gray-600 mb-2">{relatedProduct.category[language]}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-blue-600">${relatedProduct.sizes[0].price.toFixed(2)}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/products/${relatedProduct.id}`)}
                        >
                          {language === "ar" ? "عرض" : "View"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
