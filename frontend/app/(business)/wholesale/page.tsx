"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TrendingDown, Package, DollarSign, CheckCircle, Calculator, ArrowRight } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { useToast } from "@/hooks/use-toast"

const pricingTiers = [
  { minQty: 1000, maxQty: 5000, discount: 5, label: "1K - 5K", labelAr: "1 ألف - 5 آلاف" },
  { minQty: 5000, maxQty: 10000, discount: 10, label: "5K - 10K", labelAr: "5 آلاف - 10 آلاف" },
  { minQty: 10000, maxQty: 25000, discount: 15, label: "10K - 25K", labelAr: "10 آلاف - 25 ألف" },
  { minQty: 25000, maxQty: 50000, discount: 20, label: "25K - 50K", labelAr: "25 ألف - 50 ألف" },
  { minQty: 50000, maxQty: null, discount: 25, label: "50K+", labelAr: "50 ألف+" },
]

export default function WholesalePage() {
  const { language } = useLanguage()
  const { toast } = useToast()
  const [quantity, setQuantity] = useState("")
  const [basePrice, setBasePrice] = useState("")
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null)

  const calculateWholesalePrice = () => {
    const qty = Number.parseInt(quantity)
    const base = Number.parseFloat(basePrice)

    if (!qty || !base || qty < 1000) {
      toast({
        title: language === "ar" ? "خطأ في الإدخال" : "Invalid Input",
        description:
          language === "ar"
            ? "يرجى إدخال كمية لا تقل عن 1000 وسعر أساسي"
            : "Please enter a quantity of at least 1000 and a base price",
        variant: "destructive",
      })
      return
    }

    let discount = 0
    for (const tier of pricingTiers) {
      if (tier.maxQty === null) {
        if (qty >= tier.minQty) {
          discount = tier.discount
          break
        }
      } else {
        if (qty >= tier.minQty && qty < tier.maxQty) {
          discount = tier.discount
          break
        }
      }
    }

    const discountedPrice = base * (1 - discount / 100)
    const totalPrice = discountedPrice * qty
    const savings = base * qty - totalPrice

    setCalculatedPrice(totalPrice)
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge className="mb-4 bg-blue-100 text-blue-800">
          <TrendingDown className="h-4 w-4 mr-2" />
          {language === "ar" ? "تسعير الجملة" : "Wholesale Pricing"}
        </Badge>
        <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
          {language === "ar" ? "خفض التكاليف مع تسعير الجملة" : "Lower Your Costs with Wholesale Packaging"}
        </h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
          {language === "ar"
            ? "اشترِ المزيد ووفّر المزيد - كلما كان الطلب أكبر، استفدت من المدخرات المضمونة"
            : "Buy more, save more - the bigger order you make, the more you benefit from guaranteed savings"}
        </p>
      </div>

      {/* Benefits Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <Card>
          <CardContent className="pt-6">
            <TrendingDown className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              {language === "ar" ? "توفير يصل إلى 25%" : "Save up to 25%"}
            </h3>
            <p className="text-sm text-slate-600">
              {language === "ar"
                ? "خصومات أكبر للطلبات الكبيرة"
                : "Bigger discounts for larger orders"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Package className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              {language === "ar" ? "حد أدنى 1000 قطعة" : "Minimum 1000 units"}
            </h3>
            <p className="text-sm text-slate-600">
              {language === "ar"
                ? "ابدأ بكميات صغيرة وزد تدريجياً"
                : "Start small and scale up gradually"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <DollarSign className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              {language === "ar" ? "تسعير شفاف" : "Transparent Pricing"}
            </h3>
            <p className="text-sm text-slate-600">
              {language === "ar"
                ? "أسعار واضحة بدون مفاجآت"
                : "Clear prices with no surprises"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Table */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle>{language === "ar" ? "جدول الخصومات" : "Discount Table"}</CardTitle>
          <CardDescription>
            {language === "ar"
              ? "خصومات مضمونة حسب حجم الطلب"
              : "Guaranteed discounts based on order size"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === "ar" ? "الكمية" : "Quantity"}</TableHead>
                <TableHead>{language === "ar" ? "الخصم" : "Discount"}</TableHead>
                <TableHead>{language === "ar" ? "مثال" : "Example"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricingTiers.map((tier, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    {language === "ar" ? tier.labelAr : tier.label}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      {tier.discount}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {language === "ar"
                      ? `سعر القطعة الواحدة: 10 جنيه → ${(10 * (1 - tier.discount / 100)).toFixed(2)} جنيه`
                      : `Unit price: 539 EGP → ${(539 * (1 - tier.discount / 100)).toFixed(2)} EGP`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Price Calculator */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {language === "ar" ? "حاسبة السعر" : "Price Calculator"}
          </CardTitle>
          <CardDescription>
            {language === "ar"
              ? "احسب سعر الجملة لطلبك"
              : "Calculate wholesale price for your order"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <Label htmlFor="quantity">
                {language === "ar" ? "الكمية" : "Quantity"} *
              </Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={language === "ar" ? "أدخل الكمية (حد أدنى 1000)" : "Enter quantity (min 1000)"}
                className="mt-2"
                min={1000}
              />
            </div>
            <div>
              <Label htmlFor="basePrice">
                {language === "ar" ? "السعر الأساسي (للقطعة الواحدة)" : "Base Price (per unit)"} *
              </Label>
              <Input
                id="basePrice"
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder={language === "ar" ? "أدخل السعر الأساسي" : "Enter base price"}
                className="mt-2"
                step="0.01"
              />
            </div>
          </div>
          <Button onClick={calculateWholesalePrice} className="w-full mb-6">
            {language === "ar" ? "احسب السعر" : "Calculate Price"}
          </Button>

          {calculatedPrice !== null && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">
                    {language === "ar" ? "السعر الإجمالي" : "Total Price"}
                  </h3>
                  <p className="text-3xl font-bold text-green-600 mb-2">
                    {calculatedPrice.toFixed(2)} {language === "ar" ? "جنيه" : "EGP"}
                  </p>
                  <p className="text-sm text-slate-600">
                    {language === "ar"
                      ? "يتضمن خصم الجملة المطبق"
                      : "Includes applied wholesale discount"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>{language === "ar" ? "متطلبات تسعير الجملة" : "Wholesale Pricing Requirements"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">
                  {language === "ar" ? "حد أدنى للطلب: 1000 قطعة" : "Minimum Order: 1000 units"}
                </h4>
                <p className="text-sm text-slate-600">
                  {language === "ar"
                    ? "يجب أن يكون الطلب لا يقل عن 1000 قطعة للحصول على تسعير الجملة"
                    : "Order must be at least 1000 units to qualify for wholesale pricing"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">
                  {language === "ar" ? "حساب تجاري" : "Business Account"}
                </h4>
                <p className="text-sm text-slate-600">
                  {language === "ar"
                    ? "يجب أن يكون لديك حساب تجاري نشط"
                    : "You must have an active business account"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">
                  {language === "ar" ? "دفع مسبق" : "Prepayment"}
                </h4>
                <p className="text-sm text-slate-600">
                  {language === "ar"
                    ? "يُطلب دفع مسبق للطلبات الكبيرة"
                    : "Prepayment required for large orders"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Card className="mt-12 bg-gradient-to-r from-blue-50 to-emerald-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {language === "ar" ? "جاهز للبدء؟" : "Ready to Get Started?"}
            </h2>
            <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
              {language === "ar"
                ? "تواصل معنا للحصول على عرض سعر مخصص لتسعير الجملة"
                : "Contact us to get a custom quote for wholesale pricing"}
            </p>
            <div className="flex justify-center gap-4">
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href="/contact">
                  {language === "ar" ? "طلب عرض سعر" : "Request Quote"}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/products">
                  {language === "ar" ? "تصفح المنتجات" : "Browse Products"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

