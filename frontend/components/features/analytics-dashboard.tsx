"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { TrendingUp, ShoppingCart, Package, DollarSign, Loader2, AlertCircle } from "lucide-react"
import { analyticsApi, type ConversionFunnel, type ProductPopularity } from "@/lib/api/analytics"
import { financeApi, type FinancialReport } from "@/lib/api/finance"
import { useLanguage } from "@/providers/language-provider"

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"]

export function AnalyticsDashboard() {
  const { language } = useLanguage()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [funnel, setFunnel] = useState<ConversionFunnel | null>(null)
  const [report, setReport] = useState<FinancialReport | null>(null)
  const [products, setProducts] = useState<ProductPopularity[]>([])

  const fetchData = useCallback(async () => {
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const end = new Date().toISOString()
    const [funnelRes, reportRes, productsRes] = await Promise.allSettled([
      analyticsApi.getFunnel({ start, end }),
      financeApi.getReport({ start, end }),
      analyticsApi.getProductPopularity(),
    ])

    if (funnelRes.status === "fulfilled" && funnelRes.value.data) setFunnel(funnelRes.value.data)
    if (reportRes.status === "fulfilled" && reportRes.value.data) setReport(reportRes.value.data)
    if (productsRes.status === "fulfilled") setProducts(productsRes.value.data || [])
  }, [])

  useEffect(() => {
    setLoading(true)
    setLoadError(null)
    fetchData()
      .catch((err) => {
        console.error("Error loading analytics:", err)
        setLoadError(err.message || "Failed to load analytics")
      })
      .finally(() => setLoading(false))
  }, [fetchData])

  const salesData = funnel
    ? [
        {
          name: language === "ar" ? "تم إنشاؤها" : "Created",
          orders: funnel.ordersCreated,
        },
        {
          name: language === "ar" ? "مدفوعة" : "Paid",
          orders: funnel.ordersPaid,
        },
        {
          name: language === "ar" ? "معتمدة" : "Approved",
          orders: funnel.ordersApproved,
        },
        {
          name: language === "ar" ? "تم التسليم" : "Delivered",
          orders: funnel.ordersDelivered,
        },
      ]
    : []

  const productPie = products.map((p, index) => ({
    name: p.productType,
    value: p.totalQuantity || p.orderCount,
    color: COLORS[index % COLORS.length],
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (loadError && !funnel && !report && products.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <p className="text-red-600">
            {language === "ar"
              ? "تعذر تحميل التحليلات. تحقق من اتصال الخادم."
              : "Failed to load analytics. Check server connection."}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  {language === "ar" ? "الإيرادات (30 يوم)" : "Total Revenue (30 days)"}
                </p>
                <p className="text-2xl font-bold">
                  {report ? `${report.revenue.toLocaleString()} EGP` : "—"}
                </p>
                {report && report.orderCount > 0 && (
                  <p className="text-sm text-slate-500">
                    {report.orderCount} {language === "ar" ? "طلبات مكتملة" : "completed orders"}
                  </p>
                )}
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  {language === "ar" ? "إجمالي الطلبات" : "Total Orders"}
                </p>
                <p className="text-2xl font-bold">{funnel?.ordersCreated ?? "—"}</p>
                {funnel && (
                  <p className="text-sm text-slate-500 flex items-center">
                    <TrendingUp className="h-4 w-4 mr-1 text-green-600" />
                    {funnel.ordersPaid} {language === "ar" ? "مدفوعة" : "paid"}
                  </p>
                )}
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  {language === "ar" ? "الطلبات المُسلّمة" : "Delivered Orders"}
                </p>
                <p className="text-2xl font-bold">{funnel?.ordersDelivered ?? "—"}</p>
                {funnel && (
                  <p className="text-sm text-slate-500">
                    {((funnel.conversionRate ?? 0) * 100).toFixed(2)}%{" "}
                    {language === "ar" ? "معدل تحويل" : "conversion"}
                  </p>
                )}
              </div>
              <Package className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  {language === "ar" ? "الوحدات المباعة" : "Units Sold"}
                </p>
                <p className="text-2xl font-bold">
                  {products.reduce((sum, p) => sum + (p.totalQuantity || 0), 0)}
                </p>
                <p className="text-sm text-slate-500">
                  {language === "ar" ? "من طلبية الطلبات" : "from current orders"}
                </p>
              </div>
              <ShoppingCart className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">{language === "ar" ? "تحليلات المبيعات" : "Sales Analytics"}</TabsTrigger>
          <TabsTrigger value="products">{language === "ar" ? "أداء المنتجات" : "Product Performance"}</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{language === "ar" ? "مسار الطلبات" : "Order Funnel"}</CardTitle>
              <CardDescription>
                {language === "ar"
                  ? "الطلبات عبر مراحل الإنشاء والدفع والاعتماد والتسليم"
                  : "Orders across created, paid, approved and delivered stages"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {salesData.length === 0 ? (
                <p className="text-sm text-slate-500 py-16 text-center">
                  {language === "ar" ? "لا توجد بيانات بعد" : "No data yet"}
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="orders" name={language === "ar" ? "الطلبات" : "Orders"} fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          {products.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Package className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">
                  {language === "ar" ? "لا توجد مبيعات مسجلة بعد" : "No recorded sales yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{language === "ar" ? "توزيع المنتجات" : "Product Distribution"}</CardTitle>
                  <CardDescription>
                    {language === "ar" ? "الحصة حسب عدد الوحدات" : "Share by unit count"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={productPie}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        nameKey="name"
                        label
                      >
                        {productPie.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{language === "ar" ? "أفضل المنتجات" : "Top Products"}</CardTitle>
                  <CardDescription>
                    {language === "ar" ? "الأداء حسب عدد الطلبات" : "Performance by order count"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {products.map((product, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="font-medium">{product.productType}</span>
                        </div>
                        <Badge variant="secondary">
                          {product.orderCount} {language === "ar" ? "طلب" : "orders"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}