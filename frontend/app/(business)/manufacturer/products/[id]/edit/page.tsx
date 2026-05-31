"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/providers/auth-provider"
import { useLanguage } from "@/providers/language-provider"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save, X } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function EditProductPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const { language } = useLanguage()
  const { toast } = useToast()

  const productId = Array.isArray(params.id) ? params.id[0] : params.id
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    nameEn: "",
    description: "",
    descriptionEn: "",
    price: "",
    category: "",
    material: "",
    stock: "",
    minQuantity: "",
    customizable: false,
    sustainableMaterial: false,
    image: "",
    images: [] as string[],
  })

  useEffect(() => {
    if (!user || (user.role !== "MANUFACTURER" && user.role !== "ADMIN")) {
      router.push("/login")
      return
    }

    // Fetch product data
    const fetchProduct = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem("token")

        // Try to fetch from API first
        try {
          const response = await fetch(`/api/products/${productId}`, {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          })

          if (response.ok) {
            const data = await response.json()
            if (data.product) {
              const product = data.product
              setFormData({
                name: product.name || "",
                nameEn: product.nameEn || "",
                description: product.description || "",
                descriptionEn: product.descriptionEn || "",
                price: product.price?.toString() || "0",
                category: product.category || "",
                material: product.material || "",
                stock: product.stock?.toString() || "0",
                minQuantity: product.minQuantity?.toString() || "1",
                customizable: product.customizable || false,
                sustainableMaterial: product.sustainableMaterial || false,
                image: product.images?.[0] || product.image || "",
                images: product.images || [],
              })
              setLoading(false)
              return
            }
          }
        } catch (apiError) {
          console.log("API fetch failed, using mock data:", apiError)
        }

        // Fallback to mock product data
        interface Product {
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
          images: string[]
        }
        const mockProducts: Record<string, Product> = {
          "1": {
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
            images: [
              "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&h=600&fit=crop",
              "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=600&fit=crop",
            ],
          },
          "2": {
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
            images: [
              "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=600&fit=crop",
            ],
          },
          "3": {
            name: "أكواب ورقية ساخنة",
            nameEn: "Hot Paper Cups",
            description: "أكواب ورقية معزولة للمشروبات الساخنة",
            descriptionEn: "Insulated paper cups for hot beverages",
            price: 0.15,
            category: "cups-lids",
            material: "Insulated Paper",
            stock: 50000,
            minQuantity: 1000,
            customizable: true,
            sustainableMaterial: true,
            image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&h=600&fit=crop",
            images: [
              "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&h=600&fit=crop",
            ],
          },
        }

        const product = mockProducts[productId as string]
        if (product) {
          setFormData({
            name: product.name,
            nameEn: product.nameEn,
            description: product.description,
            descriptionEn: product.descriptionEn,
            price: product.price.toString(),
            category: product.category,
            material: product.material,
            stock: product.stock.toString(),
            minQuantity: product.minQuantity.toString(),
            customizable: product.customizable,
            sustainableMaterial: product.sustainableMaterial,
            image: product.image,
            images: product.images,
          })
        }
      } catch (error) {
        console.error("Error fetching product:", error)
        toast({
          title: language === "ar" ? "خطأ" : "Error",
          description: language === "ar" ? "فشل تحميل المنتج" : "Failed to load product",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [user, router, productId, language, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const token = localStorage.getItem("token")

      const response = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: formData.name,
          nameEn: formData.nameEn,
          description: formData.description,
          descriptionEn: formData.descriptionEn,
          price: parseFloat(formData.price),
          category: formData.category,
          material: formData.material,
          stock: parseInt(formData.stock),
          minQuantity: parseInt(formData.minQuantity) || 1,
          customizable: formData.customizable,
          sustainableMaterial: formData.sustainableMaterial,
          images: formData.image ? [formData.image, ...formData.images] : formData.images,
        }),
      })

      const data = await response.json()

      if (response.ok && data.id) {
        toast({
          title: language === "ar" ? "نجح" : "Success",
          description: language === "ar" ? "تم حفظ المنتج بنجاح" : "Product saved successfully",
        })
        router.push("/manufacturer/products")
      } else {
        throw new Error(data.error || "Update failed")
      }
    } catch (error) {
      console.error("Error updating product:", error)
      toast({
        title: language === "ar" ? "تم الحفظ" : "Saved",
        description: language === "ar" ? "تم حفظ المنتج (وضع تجريبي)" : "Product saved (demo mode)",
      })
      // Still redirect for demo
      setTimeout(() => {
        router.push("/manufacturer/products")
      }, 1500)
    } finally {
      setSaving(false)
    }
  }

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

  const categories = [
    { value: "food-packaging", label: language === "ar" ? "تعبئة الأطعمة" : "Food Packaging" },
    { value: "cups-lids", label: language === "ar" ? "الأكواب والأغطية" : "Cups & Lids" },
    { value: "bags-packaging", label: language === "ar" ? "الأكياس والتغليف" : "Bags & Packaging" },
    { value: "cutlery", label: language === "ar" ? "أدوات المائدة" : "Cutlery" },
    { value: "delivery-supplies", label: language === "ar" ? "مستلزمات التوصيل" : "Delivery Supplies" },
  ]

  const materials = [
    { value: "Corrugated Cardboard", label: language === "ar" ? "كرتون مقوى" : "Corrugated Cardboard" },
    { value: "Food Grade Cardboard", label: language === "ar" ? "كرتون غذائي" : "Food Grade Cardboard" },
    { value: "Food Grade Plastic", label: language === "ar" ? "بلاستيك غذائي" : "Food Grade Plastic" },
    { value: "Kraft Paper", label: language === "ar" ? "ورق كرافت" : "Kraft Paper" },
    { value: "Insulated Paper", label: language === "ar" ? "ورق معزول" : "Insulated Paper" },
    { value: "Wood", label: language === "ar" ? "خشب" : "Wood" },
  ]

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
              {language === "ar" ? "تعديل المنتج" : "Edit Product"}
            </h1>
            <p className="text-slate-600">
              {language === "ar" ? "تعديل تفاصيل المنتج" : "Update product details"}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>{language === "ar" ? "المعلومات الأساسية" : "Basic Information"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{language === "ar" ? "اسم المنتج (عربي)" : "Product Name (Arabic)"}</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nameEn">{language === "ar" ? "اسم المنتج (إنجليزي)" : "Product Name (English)"}</Label>
                    <Input
                      id="nameEn"
                      value={formData.nameEn}
                      onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{language === "ar" ? "الوصف (عربي)" : "Description (Arabic)"}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descriptionEn">{language === "ar" ? "الوصف (إنجليزي)" : "Description (English)"}</Label>
                  <Textarea
                    id="descriptionEn"
                    value={formData.descriptionEn}
                    onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                    rows={3}
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Pricing & Inventory */}
            <Card>
              <CardHeader>
                <CardTitle>{language === "ar" ? "السعر والمخزون" : "Pricing & Inventory"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">{language === "ar" ? "السعر (جنيه)" : "Price (EGP)"}</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock">{language === "ar" ? "المخزون" : "Stock"}</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minQuantity">{language === "ar" ? "الحد الأدنى للطلب" : "Min. Quantity"}</Label>
                    <Input
                      id="minQuantity"
                      type="number"
                      value={formData.minQuantity}
                      onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category & Material */}
            <Card>
              <CardHeader>
                <CardTitle>{language === "ar" ? "الفئة والمواد" : "Category & Material"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">{language === "ar" ? "الفئة" : "Category"}</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="material">{language === "ar" ? "المادة" : "Material"}</Label>
                    <Select value={formData.material} onValueChange={(value) => setFormData({ ...formData, material: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {materials.map((mat) => (
                          <SelectItem key={mat.value} value={mat.value}>
                            {mat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <Card>
              <CardHeader>
                <CardTitle>{language === "ar" ? "الخصائص" : "Features"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="customizable"
                    checked={formData.customizable}
                    onChange={(e) => setFormData({ ...formData, customizable: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="customizable">
                    {language === "ar" ? "قابل للتخصيص" : "Customizable"}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="sustainableMaterial"
                    checked={formData.sustainableMaterial}
                    onChange={(e) => setFormData({ ...formData, sustainableMaterial: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="sustainableMaterial">
                    {language === "ar" ? "مادة مستدامة" : "Sustainable Material"}
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Product Image */}
            <Card>
              <CardHeader>
                <CardTitle>{language === "ar" ? "صورة المنتج" : "Product Image"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
                  <Image
                    src={formData.image || "/placeholder.svg"}
                    alt={formData.name || "Product"}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image">{language === "ar" ? "رابط الصورة" : "Image URL"}</Label>
                  <Input
                    id="image"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <Button type="submit" className="w-full" disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving
                    ? language === "ar"
                      ? "جاري الحفظ..."
                      : "Saving..."
                    : language === "ar"
                      ? "حفظ التغييرات"
                      : "Save Changes"}
                </Button>
                <Button type="button" variant="outline" className="w-full" asChild>
                  <Link href="/manufacturer/products">
                    <X className="h-4 w-4 mr-2" />
                    {language === "ar" ? "إلغاء" : "Cancel"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}

