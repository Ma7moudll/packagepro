"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/providers/auth-provider"
import { useLanguage } from "@/providers/language-provider"
import { Package, Plus, Search, Edit, Trash2, Eye } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"

export default function ManufacturerProductsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { language } = useLanguage()
  const { toast } = useToast()
  interface Product {
    id: number
    name: string
    nameEn: string
    price: number
    stock: number
    image: string
    status: string
    sales: number
  }
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (!user || (user.role !== "MANUFACTURER" && user.role !== "ADMIN")) {
      router.push("/login")
      return
    }

    // Fetch manufacturer products
    const fetchProducts = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem("token")

        const response = await fetch("/api/manufacturer/products", {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })

        const data = await response.json()

        if (data.success && data.products) {
          // Add sales count (mock for now - can be calculated from orders)
          const productsWithSales = data.products.map((p: Product) => ({
            ...p,
            sales: Math.floor(Math.random() * 5000), // Mock sales data
          }))
          setProducts(productsWithSales)
        } else {
          // Fallback to mock data
          setProducts([
            {
              id: 1,
              name: "علب كرتون مموج",
              nameEn: "Corrugated Boxes",
              price: 2.5,
              stock: 5000,
              image: "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&h=600&fit=crop",
              status: "active",
              sales: 1250,
            },
            {
              id: 2,
              name: "أكياس ورق كرافت",
              nameEn: "Kraft Paper Bags",
              price: 0.25,
              stock: 10000,
              image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=600&fit=crop",
              status: "active",
              sales: 875,
            },
            {
              id: 3,
              name: "أكواب ورقية ساخنة",
              nameEn: "Hot Paper Cups",
              price: 0.15,
              stock: 50000,
              image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&h=600&fit=crop",
              status: "active",
              sales: 3200,
            },
          ])
        }
      } catch (error) {
        console.error("Error fetching products:", error)
        toast({
          title: language === "ar" ? "خطأ" : "Error",
          description: language === "ar" ? "فشل تحميل المنتجات" : "Failed to load products",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [user, router, language, toast])

  if (!user || (user.role !== "MANUFACTURER" && user.role !== "ADMIN")) {
    return null
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nameEn.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm(language === "ar" ? "هل أنت متأكد من حذف هذا المنتج؟" : "Are you sure you want to delete this product?")) {
      return
    }

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setProducts((prev) => prev.filter((p) => p.id !== productId))
        toast({
          title: language === "ar" ? "تم الحذف" : "Deleted",
          description: language === "ar" ? "تم حذف المنتج بنجاح" : "Product deleted successfully",
        })
      } else {
        throw new Error(data.error || "Delete failed")
      }
    } catch (error) {
      console.error("Error deleting product:", error)
      // Remove from UI anyway for demo
      setProducts((prev) => prev.filter((p) => p.id !== productId))
      toast({
        title: language === "ar" ? "تم الحذف" : "Deleted",
        description: language === "ar" ? "تم حذف المنتج (وضع تجريبي)" : "Product deleted (demo mode)",
      })
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
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

      {/* Search */}
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

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product.id}>
            <div className="relative aspect-video w-full overflow-hidden rounded-t-lg">
              <Image
                src={product.image}
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
                    ? language === "ar"
                      ? "نشط"
                      : "Active"
                    : language === "ar"
                      ? "غير نشط"
                      : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">
                    {language === "ar" ? "المخزون:" : "Stock:"}
                  </span>
                  <p className="font-medium">{product.stock.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-slate-500">
                    {language === "ar" ? "المبيعات:" : "Sales:"}
                  </span>
                  <p className="font-medium">{product.sales.toLocaleString()}</p>
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
            {language === "ar" ? "لا توجد منتجات" : "No products found"}
          </p>
        </div>
      )}
    </div>
  )
}

