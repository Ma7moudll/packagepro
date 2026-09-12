"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/providers/auth-provider"
import { useLanguage } from "@/providers/language-provider"
import { productsApi } from "@/lib/api/products"
import { Edit, ArrowLeft, Package, PackageCheck, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import type { VendorProduct } from "@/lib/api/products"

export default function ViewProductPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const { language } = useLanguage()

  const productId = Array.isArray(params.id) ? params.id[0] : params.id
  const [loading, setLoading] = useState(true)
  const [product, setProduct] = useState<VendorProduct | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || (user.role !== "MANUFACTURER" && user.role !== "ADMIN")) {
      router.push("/login")
      return
    }

    const fetchProduct = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await productsApi.getById(productId!)
        if (res.success && res.data) {
          setProduct(res.data)
          setLoading(false)
          return
        }
        setError(language === "ar" ? "المنتج غير موجود" : "Product not found")
        setLoading(false)
      } catch (err: any) {
        console.error("Error fetching product:", err)
        setError(err.message || (language === "ar" ? "المنتج غير موجود" : "Product not found"))
        setLoading(false)
      }
    }

    fetchProduct()
  }, [user, router, productId, language])

  if (!user || (user.role !== "MANUFACTURER" && user.role !== "ADMIN")) {
    return null
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-slate-600">{error || (language === "ar" ? "المنتج غير موجود" : "Product not found")}</p>
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
            <p className="text-slate-600">{language === "ar" ? "تفاصيل المنتج" : "Product Details"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={`/manufacturer/products/${productId}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              {language === "ar" ? "تعديل" : "Edit"}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-0">
              <div className="relative aspect-video w-full overflow-hidden rounded-t-lg">
                <Image
                  src={product.image || "/placeholder.svg"}
                  alt={language === "ar" ? product.name : product.nameEn}
                  fill
                  sizes="(max-width: 768px) 100vw, 66vw"
                  className="object-cover"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{language === "ar" ? "الوصف" : "Description"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                {language === "ar" ? product.description || product.name : product.descriptionEn || product.nameEn}
              </p>
            </CardContent>
          </Card>

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
                  <p className="text-sm text-slate-500">{language === "ar" ? "الحد الأدنى للطلب" : "Min. Quantity"}</p>
                  <p className="font-medium">{product.minQuantity.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
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
                <p className="text-xl font-semibold">{product.sales?.toLocaleString() || "0"}</p>
              </div>
            </CardContent>
          </Card>

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
