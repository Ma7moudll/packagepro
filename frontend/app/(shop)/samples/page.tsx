"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import Image from "next/image"
import { Package, ShoppingCart, CheckCircle, Leaf } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { useToast } from "@/hooks/use-toast"

interface SampleProduct {
  id: string
  name: string
  nameAr: string
  category: string
  categoryAr: string
  image: string
  price: number
  sustainable?: boolean
}

const sampleProducts: SampleProduct[] = [
  {
    id: "1",
    name: "Corrugated Mailer Box",
    nameAr: "علبة بريد مضلعة",
    category: "Boxes",
    categoryAr: "صناديق",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
    price: 25,
    sustainable: true,
  },
  {
    id: "2",
    name: "Paper Shopping Bag",
    nameAr: "حقيبة تسوق ورقية",
    category: "Bags",
    categoryAr: "أكياس",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
    price: 30,
    sustainable: true,
  },
  {
    id: "3",
    name: "Rigid Gift Box",
    nameAr: "علبة هدايا صلبة",
    category: "Boxes",
    categoryAr: "صناديق",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
    price: 35,
  },
  {
    id: "4",
    name: "Paper Cup",
    nameAr: "كوب ورقي",
    category: "Cups",
    categoryAr: "أكواب",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
    price: 20,
    sustainable: true,
  },
  {
    id: "5",
    name: "Mailing Tube",
    nameAr: "أنبوب بريد",
    category: "Tubes",
    categoryAr: "أنابيب",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
    price: 28,
  },
  {
    id: "6",
    name: "Kraft Paper Bag",
    nameAr: "كيس ورق كرافت",
    category: "Bags",
    categoryAr: "أكياس",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
    price: 22,
    sustainable: true,
  },
  {
    id: "7",
    name: "Folding Carton",
    nameAr: "علبة مطوية",
    category: "Boxes",
    categoryAr: "صناديق",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
    price: 32,
  },
  {
    id: "8",
    name: "Custom Sticker",
    nameAr: "ملصق مخصص",
    category: "Accessories",
    categoryAr: "إكسسوارات",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
    price: 15,
  },
]

const MAX_SAMPLES = 8
const SAMPLE_PACK_PRICE = 50

export default function SamplesPage() {
  const { language } = useLanguage()
  const { toast } = useToast()
  const [selectedSamples, setSelectedSamples] = useState<Set<string>>(new Set())
  const [showCart, setShowCart] = useState(false)

  const toggleSample = (id: string) => {
    const newSelected = new Set(selectedSamples)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      if (newSelected.size < MAX_SAMPLES) {
        newSelected.add(id)
      } else {
        toast({
          title: language === "ar" ? "الحد الأقصى" : "Maximum Reached",
          description:
            language === "ar"
              ? `يمكنك اختيار حتى ${MAX_SAMPLES} عينات فقط`
              : `You can select up to ${MAX_SAMPLES} samples only`,
          variant: "destructive",
        })
        return
      }
    }
    setSelectedSamples(newSelected)
  }

  const handleOrderSamples = async () => {
    if (selectedSamples.size === 0) {
      toast({
        title: language === "ar" ? "لم يتم اختيار عينات" : "No Samples Selected",
        description:
          language === "ar" ? "يرجى اختيار عينة واحدة على الأقل" : "Please select at least one sample",
        variant: "destructive",
      })
      return
    }

    try {
      // Here you would send the order to backend
      toast({
        title: language === "ar" ? "تم إرسال الطلب" : "Order Submitted",
        description:
          language === "ar"
            ? "سيتم إرسال عينة التعبئة خلال 3-5 أيام عمل"
            : "Your sample pack will be shipped within 3-5 business days",
      })
      setSelectedSamples(new Set())
    } catch (error) {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" ? "حدث خطأ في إرسال الطلب" : "Failed to submit order",
        variant: "destructive",
      })
    }
  }

  const selectedCount = selectedSamples.size
  const canSelectMore = selectedCount < MAX_SAMPLES

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <Badge className="mb-4 bg-emerald-100 text-emerald-800">
          {language === "ar" ? "جرب قبل الشراء" : "Try Before You Buy"}
        </Badge>
        <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
          {language === "ar" ? "طلب عينة التعبئة" : "Order Sample Pack"}
        </h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
          {language === "ar"
            ? "اختر حتى 8 منتجات لعينة التعبئة مقابل 50 جنيه فقط. احصل على استرداد نقدي عند طلبك التالي!"
            : "Select up to 8 products for your sample pack for just 50 EGP. Get cashback on your next order!"}
        </p>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <Package className="h-8 w-8 text-emerald-600 mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              {language === "ar" ? "اختر حتى 8 عينات" : "Select up to 8 samples"}
            </h3>
            <p className="text-sm text-slate-600">
              {language === "ar"
                ? "اختر من مجموعة واسعة من المنتجات"
                : "Choose from our wide range of products"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <CheckCircle className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              {language === "ar" ? "استرداد نقدي" : "Cashback"}
            </h3>
            <p className="text-sm text-slate-600">
              {language === "ar"
                ? "احصل على استرداد قيمة العينة عند طلبك التالي"
                : "Get cashback on the sample price on your next order"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Leaf className="h-8 w-8 text-green-600 mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              {language === "ar" ? "شحن سريع" : "Fast Shipping"}
            </h3>
            <p className="text-sm text-slate-600">
              {language === "ar"
                ? "احصل على عيناتك خلال 3-5 أيام عمل"
                : "Receive your samples within 3-5 business days"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Selection Counter */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-emerald-900">
              {language === "ar" ? `تم الاختيار: ${selectedCount} من ${MAX_SAMPLES}` : `Selected: ${selectedCount} of ${MAX_SAMPLES}`}
            </p>
            <p className="text-sm text-emerald-700">
              {canSelectMore
                ? language === "ar"
                  ? `يمكنك اختيار ${MAX_SAMPLES - selectedCount} عينات أخرى`
                  : `You can select ${MAX_SAMPLES - selectedCount} more samples`
                : language === "ar"
                  ? "لقد وصلت للحد الأقصى"
                  : "Maximum samples selected"}
            </p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {language === "ar" ? `${SAMPLE_PACK_PRICE} جنيه` : `${SAMPLE_PACK_PRICE} EGP`}
          </Badge>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {sampleProducts.map((product) => {
          const isSelected = selectedSamples.has(product.id)
          const isDisabled = !isSelected && !canSelectMore

          return (
            <Card
              key={product.id}
              className={`cursor-pointer transition-all ${
                isSelected ? "ring-2 ring-emerald-600 border-emerald-600" : ""
              } ${isDisabled ? "opacity-50" : "hover:shadow-lg"}`}
              onClick={() => !isDisabled && toggleSample(product.id)}
            >
              <div className="relative">
                <div className="relative h-48">
                  <Image
                    src={product.image}
                    alt={language === "ar" ? product.nameAr : product.name}
                    fill
                    className="object-cover"
                  />
                  {product.sustainable && (
                    <Badge className="absolute top-2 right-2 bg-green-600">
                      <Leaf className="h-3 w-3 mr-1" />
                      {language === "ar" ? "مستدام" : "Sustainable"}
                    </Badge>
                  )}
                  <div className="absolute top-2 left-2">
                    <Checkbox checked={isSelected} onCheckedChange={() => !isDisabled && toggleSample(product.id)} />
                  </div>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-1">{language === "ar" ? product.nameAr : product.name}</h3>
                <p className="text-xs text-slate-500 mb-2">
                  {language === "ar" ? product.categoryAr : product.category}
                </p>
                <p className="text-sm font-medium text-emerald-600">
                  {language === "ar" ? `${product.price} جنيه` : `${product.price} EGP`}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Order Button */}
      {selectedCount > 0 && (
        <div className="sticky bottom-0 bg-white border-t shadow-lg p-6 rounded-t-lg">
          <div className="container mx-auto max-w-4xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">
                  {language === "ar"
                    ? `${selectedCount} عينة محددة - ${SAMPLE_PACK_PRICE} جنيه`
                    : `${selectedCount} samples selected - ${SAMPLE_PACK_PRICE} EGP`}
                </p>
                <p className="text-sm text-slate-600">
                  {language === "ar"
                    ? "ستحصل على استرداد نقدي عند طلبك التالي"
                    : "You'll get cashback on your next order"}
                </p>
              </div>
              <Button onClick={handleOrderSamples} size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                <ShoppingCart className="mr-2 h-5 w-5" />
                {language === "ar" ? "طلب عينة التعبئة" : "Order Sample Pack"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

