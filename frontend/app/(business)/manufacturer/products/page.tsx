"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/providers/auth-provider"
import { useLanguage } from "@/providers/language-provider"
import { productsApi } from "@/lib/api/products"
import { Package, Plus, Search, Edit, Trash2, Eye, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import type { VendorProduct } from "@/lib/api/products"

export default function ManufacturerProductsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { language } = useLanguage()
  const { toast } = useToast()
  const [products, setProducts] = useState<VendorProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (!user || (user.role !== "MANUFACTURER" && user.role !== "ADMIN")) {
      router.push("/login")
      return
    }

    const fetchProducts = async () => {
      try {
        setLoading(true)
        setLoadError(null)
        const res = await productsApi.list()
        if (res.success && res.data) {
          setProducts(res.data)
          setLoading(false)
          return
        }
      } catch (err: any) {
        console.error("Error fetching products:", err)
        setLoadError(err.message || "Failed to fetch products")
      }
      setProducts([])
      setLoading(false)
    }

    fetchProducts()
  }, [user, router])

  if (!user || (user.role !== "MANUFACTURER" && user.role !== "ADMIN")) {
    return null
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nameEn.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm(language === "ar" ? "هل أنت متأكد من حذف هذا المنتج؟" : "Are you sure you want to delete this product?")) {
      return
    }

    try {
      const res = await productsApi.delete(productId)
      if (res.success) {
        setProducts((prev) => prev.filter((p) => p.id !== productId))
        toast({
          title: language === "ar" ? "تم الحذف" : "Deleted",
          description: language === "ar" ? "تم حذف المنتج بنجاح" : "Product deleted successfully",
        })
      }
    } catch (err: any) {
      console.error("Error deleting product:", err)
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: err.message || "Failed to delete product",
        variant: "destructive",
      })
    }
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {language === "ar" ? "إدارة المنتجات" : "Product Management"}
          </h1>
          <p className="text-slate-600">
            {language === "ar" ? "إدارة منتجاتك وعرضها" : "Manage and view your products"}
          </p>
        </div>
        <Button asChild>
          <Link href="/manufacturer/products/new">
            <Plus className="h-4 w-4 mr-2" />
            {language === "ar" ? "إضافة منتج جديد" : "Add New Product"}
          </Link>
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={language === "ar" ? "بحث في المنتجات..." : "Search products..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product.id}>
            <div className="relative aspect-video w-full overflow-hidden rounded-t-lg">
              <Image
                src={product.image || "/placeholder.svg"}
                alt={language === "ar" ? product.name : product.nameEn}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover"
              />
            </div>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    {language === "ar" ? product.name : product.nameEn}
                  </CardTitle>
                  <p className="text-2xl font-bold text-emerald-600 mt-2">
                    {product.price.toLocaleString()} {language === "ar" ? "جنيه" : "EGP"}
                  </p>
                </div>
                <Badge variant={product.status === "active" ? "default" : "secondary"}>
                  {product.status === "active"
                    ? language === "ar" ? "نشط" : "Active"
                    : language === "ar" ? "غير نشط" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">{language === "ar" ? "المخزون:" : "Stock:"}</span>
                  <p className="font-medium">{product.stock.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-slate-500">{language === "ar" ? "المبيعات:" : "Sales:"}</span>
                  <p className="font-medium">{product.sales?.toLocaleString() || "0"}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" className="flex-1">
                  <Link href={`/manufacturer/products/${product.id}`}>
                    <Eye className="h-4 w-4 mr-2" />
                    {language === "ar" ? "عرض" : "View"}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link href={`/manufacturer/products/${product.id}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    {language === "ar" ? "تعديل" : "Edit"}
                  </Link>
                </Button>
                <Button variant="destructive" size="icon" onClick={() => handleDeleteProduct(product.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && !loading && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">
            {language === "ar"
              ? loadError
                ? "تعذر تحميل المنتجات"
                : "لا توجد منتجات في كتالوجك بعد"
              : loadError
                ? "Failed to load products"
                : "No products in your catalog yet"}
          </p>
        </div>
      )}
    </div>
  )
}
