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
import { productsApi } from "@/lib/api/products"
import { ArrowLeft, Save, X, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface FormData {
  name: string
  nameEn: string
  description: string
  descriptionEn: string
  price: string
  category: string
  material: string
  stock: string
  minQuantity: string
  customizable: boolean
  sustainableMaterial: boolean
  image: string
  images: string[]
}

export default function EditProductPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const { language } = useLanguage()
  const { toast } = useToast()

  const productId = Array.isArray(params.id) ? params.id[0] : params.id
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    name: "", nameEn: "", description: "", descriptionEn: "", price: "",
    category: "", material: "", stock: "", minQuantity: "",
    customizable: false, sustainableMaterial: false, image: "", images: [],
  })

  useEffect(() => {
    if (!user || (user.role !== "MANUFACTURER" && user.role !== "ADMIN")) {
      router.push("/login")
      return
    }

    const fetchProduct = async () => {
      try {
        setLoading(true)
        const res = await productsApi.getById(productId!)
        if (res.success && res.data) {
          const p = res.data
          setFormData({
            name: p.name || "", nameEn: p.nameEn || "",
            description: p.description || "", descriptionEn: p.descriptionEn || "",
            price: p.price?.toString() || "0", category: p.category || "",
            material: p.material || "", stock: p.stock?.toString() || "0",
            minQuantity: p.minQuantity?.toString() || "1",
            customizable: p.customizable || false, sustainableMaterial: p.sustainableMaterial || false,
            image: p.images?.[0] || p.image || "", images: p.images || [],
          })
          setLoading(false)
          return
        }
        setLoading(false)
      } catch (err: any) {
        console.error("Error fetching product:", err)
        setLoading(false)
      }
    }

    fetchProduct()
  }, [user, router, productId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await productsApi.update(productId!, {
        name: formData.name, nameEn: formData.nameEn,
        description: formData.description, descriptionEn: formData.descriptionEn,
        price: parseFloat(formData.price), category: formData.category,
        material: formData.material, stock: parseInt(formData.stock),
        minQuantity: parseInt(formData.minQuantity) || 1,
        customizable: formData.customizable, sustainableMaterial: formData.sustainableMaterial,
        images: formData.image ? [formData.image, ...formData.images] : formData.images,
      })

      if (res.success && res.data) {
        toast({
          title: language === "ar" ? "نجح" : "Success",
          description: language === "ar" ? "تم حفظ المنتج بنجاح" : "Product saved successfully",
        })
        router.push("/manufacturer/products")
        setSaving(false)
        return
      }

      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" ? "تعذر تحديث المنتج" : "Failed to update product",
        variant: "destructive",
      })
      setSaving(false)
    } catch (err: any) {
      console.error("Error updating product:", err)
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: err.message || (language === "ar"
          ? "كتالوج المنتجات غير متصل بالخادم بعد"
          : "Product catalog is not connected to the backend yet"),
        variant: "destructive",
      })
      setSaving(false)
    }
  }

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
            <p className="text-slate-600">{language === "ar" ? "تعديل تفاصيل المنتج" : "Update product details"}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{language === "ar" ? "المعلومات الأساسية" : "Basic Information"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{language === "ar" ? "اسم المنتج (عربي)" : "Product Name (Arabic)"}</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nameEn">{language === "ar" ? "اسم المنتج (إنجليزي)" : "Product Name (English)"}</Label>
                    <Input id="nameEn" value={formData.nameEn} onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">{language === "ar" ? "الوصف (عربي)" : "Description (Arabic)"}</Label>
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descriptionEn">{language === "ar" ? "الوصف (إنجليزي)" : "Description (English)"}</Label>
                  <Textarea id="descriptionEn" value={formData.descriptionEn} onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })} rows={3} required />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{language === "ar" ? "السعر والمخزون" : "Pricing & Inventory"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">{language === "ar" ? "السعر (جنيه)" : "Price (EGP)"}</Label>
                    <Input id="price" type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock">{language === "ar" ? "المخزون" : "Stock"}</Label>
                    <Input id="stock" type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minQuantity">{language === "ar" ? "الحد الأدنى للطلب" : "Min. Quantity"}</Label>
                    <Input id="minQuantity" type="number" value={formData.minQuantity} onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })} required />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{language === "ar" ? "الفئة والمواد" : "Category & Material"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">{language === "ar" ? "الفئة" : "Category"}</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="material">{language === "ar" ? "المادة" : "Material"}</Label>
                    <Select value={formData.material} onValueChange={(value) => setFormData({ ...formData, material: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {materials.map((mat) => (<SelectItem key={mat.value} value={mat.value}>{mat.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{language === "ar" ? "الخصائص" : "Features"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="customizable" checked={formData.customizable} onChange={(e) => setFormData({ ...formData, customizable: e.target.checked })} className="rounded" />
                  <Label htmlFor="customizable">{language === "ar" ? "قابل للتخصيص" : "Customizable"}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="sustainableMaterial" checked={formData.sustainableMaterial} onChange={(e) => setFormData({ ...formData, sustainableMaterial: e.target.checked })} className="rounded" />
                  <Label htmlFor="sustainableMaterial">{language === "ar" ? "مادة مستدامة" : "Sustainable Material"}</Label>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{language === "ar" ? "صورة المنتج" : "Product Image"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
                  <Image src={formData.image || "/placeholder.svg"} alt={formData.name || "Product"} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image">{language === "ar" ? "رابط الصورة" : "Image URL"}</Label>
                  <Input id="image" value={formData.image} onChange={(e) => setFormData({ ...formData, image: e.target.value })} placeholder="https://..." />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {saving ? (language === "ar" ? "جاري الحفظ..." : "Saving...") : (language === "ar" ? "حفظ التغييرات" : "Save Changes")}
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
