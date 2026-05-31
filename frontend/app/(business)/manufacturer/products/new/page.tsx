"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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

export default function NewProductPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { language } = useLanguage()
  const { toast } = useToast()

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
  })

  useEffect(() => {
    if (!user || (user.role !== "MANUFACTURER" && user.role !== "ADMIN")) {
      router.push("/login")
      return
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const token = localStorage.getItem("token")

      const response = await fetch("/api/manufacturer/products", {
        method: "POST",
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
          image: formData.image,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: language === "ar" ? "نجح" : "Success",
          description: language === "ar" ? "تم إضافة المنتج بنجاح" : "Product added successfully",
        })
        router.push("/manufacturer/products")
      } else {
        throw new Error(data.error || "Create failed")
      }
    } catch (error) {
      console.error("Error creating product:", error)
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" ? "فشل إضافة المنتج. جاري استخدام وضع التجربة." : "Failed to add product. Using demo mode.",
        variant: "destructive",
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
              {language === "ar" ? "إضافة منتج جديد" : "Add New Product"}
            </h1>
            <p className="text-slate-600">
              {language === "ar" ? "أضف منتج جديد إلى متجرك" : "Add a new product to your store"}
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
                        <SelectValue placeholder={language === "ar" ? "اختر الفئة" : "Select category"} />
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
                        <SelectValue placeholder={language === "ar" ? "اختر المادة" : "Select material"} />
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
                {formData.image && (
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
                    <Image
                      src={formData.image}
                      alt="Product preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="image">{language === "ar" ? "رابط الصورة" : "Image URL"}</Label>
                  <Input
                    id="image"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://..."
                  />
                  <p className="text-xs text-slate-500">
                    {language === "ar"
                      ? "يمكنك استخدام رابط من Unsplash أو أي مصدر آخر"
                      : "You can use a link from Unsplash or any other source"}
                  </p>
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
                      ? "إضافة المنتج"
                      : "Add Product"}
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

