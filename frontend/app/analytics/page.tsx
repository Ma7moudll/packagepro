"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLanguage } from "@/providers/language-provider"
import { useAuth } from "@/providers/auth-provider"
import { analyticsApi, funnelWindow, ConversionFunnel, ProductPopularity } from "@/lib/api/analytics"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

export default function AnalyticsDashboard() {
  const { language } = useLanguage()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [funnel, setFunnel] = useState<ConversionFunnel | null>(null)
  const [products, setProducts] = useState<ProductPopularity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }
    if (!user) return
    // Platform funnel metrics are ADMIN-gated on the backend.
    if (user.role !== "ADMIN") {
      router.push("/dashboard")
      return
    }

    const load = async () => {
      try {
        const [funnelRes, productsRes] = await Promise.all([
          analyticsApi.getFunnel(funnelWindow),
          analyticsApi.getProductPopularity(),
        ])
        if (funnelRes.success) setFunnel(funnelRes.data)
        if (productsRes.success) setProducts(productsRes.data)
      } catch (error: any) {
        if (error?.status === 401) {
          router.push("/login")
          return
        }
        console.error("Error loading dashboard:", error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user, authLoading, router])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">
          {language === "ar" ? "جارٍ التحميل..." : "Loading..."}
        </p>
      </div>
    )
  }

  if (!user) return null

  if (!funnel) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">
          {language === "ar" ? "لا توجد بيانات" : "No data available"}
        </p>
      </div>
    )
  }

  const productData = products.map((p) => ({
    name: p.productType,
    value: p.orderCount,
  }))

  const funnelCards = [
    { key: "visitors", label: language === "ar" ? "الزوار" : "Visitors", value: funnel.visitors },
    { key: "ordersCreated", label: language === "ar" ? "طلبات تم إنشاؤها" : "Orders Created", value: funnel.ordersCreated },
    { key: "ordersPaid", label: language === "ar" ? "طلبات مدفوعة" : "Orders Paid", value: funnel.ordersPaid },
    { key: "ordersApproved", label: language === "ar" ? "طلبات معتمدة" : "Orders Approved", value: funnel.ordersApproved },
    { key: "ordersDelivered", label: language === "ar" ? "طلبات تم تسليمها" : "Orders Delivered", value: funnel.ordersDelivered },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">
          {language === "ar" ? "لوحة التحليلات" : "Analytics Dashboard"}
        </h1>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">
              {language === "ar" ? "نظرة عامة" : "Overview"}
            </TabsTrigger>
            <TabsTrigger value="products">
              {language === "ar" ? "شعبية المنتجات" : "Product Popularity"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {funnelCards.map((card) => (
                <Card key={card.key}>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{card.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-slate-500">
                  {language === "ar"
                    ? `معدل التحويل: ${(funnel.conversionRate * 100).toFixed(2)}%`
                    : `Conversion rate: ${(funnel.conversionRate * 100).toFixed(2)}%`}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === "ar" ? "شعبية المنتجات" : "Product Popularity"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {productData.length === 0 ? (
                  <p className="text-slate-500 py-12 text-center">
                    {language === "ar" ? "لا توجد بيانات بعد" : "No data available yet"}
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={productData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name={language === "ar" ? "عدد الطلبات" : "Orders"} fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}