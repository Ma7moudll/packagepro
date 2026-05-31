"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/providers/auth-provider"
import { useLanguage } from "@/providers/language-provider"
import { Edit, ArrowLeft, Trash2, Package, PackageCheck } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function ViewProductPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const { language } = useLanguage()

  const productId = Array.isArray(params.id) ? params.id[0] : params.id
  const [loading, setLoading] = useState(true)
  interface Product {
    id: number
    name: string
    nameEn: string
    description: string
    descriptionEn: string
    price: number
    category: string
    material: string
    stock: number
    minQuantity: number
    customizable: boolean
    sustainableMaterial: boolean
    image: string
    sales: number
  }
  const [product, setProduct] = useState<Product | null>(null)

  useEffect(() => {
    if (!user || (user.role !== "MANUFACTURER" && user.role !== "ADMIN")) {
      router.push("/login")
      return
    }

    // Fetch product data
    const fetchProduct = async () => {
      try {
        setLoading(true)
        await new Promise((resolve) => setTimeout(resolve, 500))

        const mockProducts: Record<string, Product> = {
          "1": {
            id: 1,
            name: "علب كرتون مموج",
            nameEn: "Corrugated Boxes",
            description: "علب كرتون مموج عالية الجودة مناسبة للشحن والتخزين",
            descriptionEn: "High-quality corrugated boxes suitable for shipping and storage",
            price: 2.5,
            category: "food-packaging",
            material: "Corrugated Cardboard",
            stock: 5000,
            minQuantity: 100,
            customizable: true,
            sustainableMaterial: false,
            image: "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&h=600&fit=crop",
            sales: 1250,
          },
          "2": {
            id: 2,
            name: "أكياس ورق كرافت",
            nameEn: "Kraft Paper Bags",
            description: "أكياس ورق كرافت صديقة للبيئة",
            descriptionEn: "Eco-friendly kraft paper bags",
            price: 0.25,
            category: "bags-packaging",
            material: "Kraft Paper",
            stock: 10000,
            minQuantity: 500,
            customizable: true,
            sustainableMaterial: true,
            image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=600&fit=crop",
            sales: 875,
          },
        }

        setProduct(mockProducts[productId as string])
      } catch (error) {
        console.error("Error fetching product:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [user, router, productId])

  if (!user || (user.role !== "MANUFACTURER" && user.role !== "ADMIN")) {
    return null
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-slate-600">{language === "ar" ? "جاري التحميل..." : "Loading..."}</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-slate-600">{language === "ar" ? "المنتج غير موجود" : "Product not found"}</p>
          <Button asChild className="mt-4">
            <Link href="/manufacturer/products">
              {language === "ar" ? "العودة للمنتجات" : "Back to Products"}
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/manufacturer/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {language === "ar" ? product.name : product.nameEn}
            </h1>
            <p className="text-slate-600">
              {language === "ar" ? "تفاصيل المنتج" : "Product Details"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={`/manufacturer/products/${productId}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              {language === "ar" ? "تعديل" : "Edit"}
            </Link>
          </Button>
          <Button variant="destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            {language === "ar" ? "حذف" : "Delete"}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Image */}
          <Card>
            <CardContent className="p-0">
              <div className="relative aspect-video w-full overflow-hidden rounded-t-lg">
                <Image
                  src={product.image}
                  alt={language === "ar" ? product.name : product.nameEn}
                  fill
                  sizes="(max-width: 768px) 100vw, 66vw"
                  className="object-cover"
                />
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>{language === "ar" ? "الوصف" : "Description"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                {language === "ar" ? product.description : product.descriptionEn}
              </p>
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>{language === "ar" ? "التفاصيل" : "Details"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">{language === "ar" ? "الفئة" : "Category"}</p>
                  <p className="font-medium">{product.category}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">{language === "ar" ? "المادة" : "Material"}</p>
                  <p className="font-medium">{product.material}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">{language === "ar" ? "المخزون" : "Stock"}</p>
                  <p className="font-medium">{product.stock.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">
                    {language === "ar" ? "الحد الأدنى للطلب" : "Min. Quantity"}
                  </p>
                  <p className="font-medium">{product.minQuantity.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Price Card */}
          <Card>
            <CardHeader>
              <CardTitle>{language === "ar" ? "السعر" : "Pricing"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-500">{language === "ar" ? "السعر" : "Price"}</p>
                <p className="text-3xl font-bold text-emerald-600">
                  {product.price.toLocaleString()} {language === "ar" ? "جنيه" : "EGP"}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">{language === "ar" ? "المبيعات" : "Sales"}</p>
                <p className="text-xl font-semibold">{product.sales.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle>{language === "ar" ? "الخصائص" : "Features"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {product.customizable && (
                <Badge variant="secondary" className="w-full justify-start">
                  <Package className="h-4 w-4 mr-2" />
                  {language === "ar" ? "قابل للتخصيص" : "Customizable"}
                </Badge>
              )}
              {product.sustainableMaterial && (
                <Badge variant="secondary" className="w-full justify-start bg-green-100 text-green-800">
                  <PackageCheck className="h-4 w-4 mr-2" />
                  {language === "ar" ? "مادة مستدامة" : "Sustainable Material"}
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

