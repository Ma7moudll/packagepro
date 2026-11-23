"use client"
import { FinanceSummary } from "@/components/admin/finance-summary";
import { MoneySummary } from "@/components/admin/money";

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/providers/auth-provider"
import { useLanguage } from "@/providers/language-provider"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  TrendingUp,
  ShoppingCart,
  Package,
  Banknote,
  Activity,
  AlertCircle,
  Loader2,
  LucideIcon,
} from "lucide-react"
import { analyticsApi, type ConversionFunnel, type ProductPopularity } from "@/lib/api/analytics"
import { financeApi, type FinancialReport } from "@/lib/api/finance"

export default function AdminDashboard() {
  const { user } = useAuth()
  const { language, isRTL } = useLanguage()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [funnel, setFunnel] = useState<ConversionFunnel | null>(null)
  const [report, setReport] = useState<FinancialReport | null>(null)
  const [popularity, setPopularity] = useState<ProductPopularity[]>([])

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
    if (productsRes.status === "fulfilled") setPopularity(productsRes.value.data || [])
  }, [])

  useEffect(() => {
    if (!user || user.role !== "ADMIN") {
      router.push("/login")
      return
    }

    setLoading(true)
    setLoadError(null)
    fetchData()
      .catch((err) => {
        console.error("Error loading admin dashboard:", err)
        setLoadError(err.message || "Failed to load dashboard data")
      })
      .finally(() => setLoading(false))
  }, [user, router, fetchData])

  if (!user || user.role !== "ADMIN") {
    return null
  }

  const COLORS = ["#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0"]

  const StatCard = ({
    icon: Icon,
    title,
    value,
    hint,
  }: {
    icon: LucideIcon
    title: string
    value: React.ReactNode;
    hint?: string
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-2">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {hint && <p className="text-xs text-gray-500 mt-2">{hint}</p>}
          </div>
          <div className="p-3 rounded-lg bg-green-100">
            <Icon className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const funnelData = funnel
    ? [
        {
          name: language === "ar" ? "تم إنشاء الطلبات" : "Orders Created",
          count: funnel.ordersCreated,
        },
        {
          name: language === "ar" ? "مدفوعة" : "Paid",
          count: funnel.ordersPaid,
        },
        {
          name: language === "ar" ? "معتمدة" : "Approved",
          count: funnel.ordersApproved,
        },
        {
          name: language === "ar" ? "تم التسليم" : "Delivered",
          count: funnel.ordersDelivered,
        },
      ]
    : []

  if (loading) {
    return (
      <div className={`min-h-screen bg-gray-50 p-8 ${isRTL ? "font-cairo" : ""}`}>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gray-50 p-8 ${isRTL ? "font-cairo" : ""}`}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {language === "ar" ? "لوحة تحكم الإدارة" : "Admin Dashboard"}
        </h1>
        <p className="text-gray-600">
          {language === "ar" ? "رؤية شاملة لأداء العمل" : "Comprehensive overview of business performance"}
        </p>
      </div>

      {loadError && !report && !funnel && (
        <Card className="mb-8">
          <CardContent className="p-6 flex items-center gap-3 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <p>
              {language === "ar"
                ? "تعذر الاتصال بخادم البيانات. تحقق من حالة الخادم."
                : "Failed to reach the data server. Check that the backend is running."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Banknote}
          title={language === "ar" ? "الإيرادات (30 يوم)" : "Revenue (30 days)"}
          value={
            report
              ? (
              <MoneySummary
                groups={report.byCurrency?.map((g) => ({
                  currency: g.currency,
                  amount: g.revenue,
                }))}
              />
            ) : (
              "—"
            )
          }
          hint={report ?.unclassifiedOrderCount
              ? language === "ar"
                ? "توجد طلبات مستبعدة بعملة غير معروفة"
                : "Unknown-currency orders excluded"
              : undefined}
        />
        <StatCard
          icon={TrendingUp}
          title={language === "ar" ? "الهامش المسجل" : "Recorded margin"}
          value={
            report
              ? (
              <span>
                {language === "ar"
                  ? "راجع التفصيل حسب العملة"
                  : "See currency breakdown"}
              </span>
            ) : (
              "—"
            )
          }
        />
        <StatCard
          icon={ShoppingCart}
          title={language === "ar" ? "الطلبات" : "Orders"}
          value={funnel ? funnel.ordersCreated : "—"}
          hint={funnel ? `${funnel.ordersPaid.toLocaleString()} ${language === "ar" ? "مدفوعة" : "paid"}` : undefined}
        />
        <StatCard
          icon={Package}
          title={language === "ar" ? "منتجات مباعة" : "Products Sold"}
          value={popularity.reduce((sum, p) => sum + (p.totalQuantity || 0), 0)}
        />
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="funnel" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="funnel">{language === "ar" ? "مسار التحويل" : "Funnel"}</TabsTrigger>
          <TabsTrigger value="finance">{language === "ar" ? "المالية" : "Finance"}</TabsTrigger>
          <TabsTrigger value="products">{language === "ar" ? "المنتجات" : "Products"}</TabsTrigger>
        </TabsList>

        {/* Funnel Chart */}
        <TabsContent value="funnel">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{language === "ar" ? "مسار التحويل" : "Conversion Funnel"}</CardTitle>
              <CardDescription>
                {language === "ar"
                  ? "رحلة الطلب من الإنشاء حتى التسليم (30 يوم)"
                  : "Order journey from creation to delivery (30 days)"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {funnelData.length === 0 ? (
                <p className="text-sm text-gray-500 py-16 text-center">
                  {language === "ar" ? "لا توجد بيانات بعد" : "No data yet"}
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={funnelData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" name={language === "ar" ? "العدد" : "Count"} fill="#059669" />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {funnel && (
                <p className="text-sm text-gray-600 mt-4 text-center">
                  {language === "ar"
                    ? `معدل التحويل: ${((funnel.conversionRate ?? 0) * 100).toFixed(2)}%`
                    : `Conversion rate: ${((funnel.conversionRate ?? 0) * 100).toFixed(2)}%`}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Finance Chart */}
        <TabsContent value="finance">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{language === "ar" ? "توزيع الإيرادات" : "Revenue Allocation"}</CardTitle>
              <CardDescription>
                {language === "ar"
                  ? "المبالغ المسجلة حسب العملة (30 يوم)"
                  : "Currency-separated recorded amounts (30 days)"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FinanceSummary report={report} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products */}
        <TabsContent value="products">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{language === "ar" ? "شعبية المنتجات" : "Product Popularity"}</CardTitle>
              <CardDescription>
                {language === "ar"
                  ? "المنتجات حسب عدد الطلبات والكمية"
                  : "Products by order count and quantity"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {popularity.length === 0 ? (
                <div className="py-16 text-center">
                  <Activity className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    {language === "ar" ? "لا توجد مبيعات مسجلة بعد" : "No recorded sales yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {popularity.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{product.productType}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">
                          {product.orderCount} {" "}
                          {language === "ar" ? "طلب" : "orders"}
                        </p>
                        <p className="text-xs text-gray-600">
                          {product.totalQuantity || 0}{" "} {language === "ar" ? "قطعة" : "units"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {!report && !funnel && !loadError && (
        <div className="grid grid-cols-1 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2 text-blue-600" />
                {language === "ar" ? "النشاط" : "Activity"}
              </CardTitle>
              <CardDescription>
                {language === "ar" ? "آخر التحديثات والطلبات" : "Latest updates and orders"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center py-10 text-center">
                <Activity className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">
                  {language === "ar"
                    ? "لا توجد بيانات متاحة بعد. سجل الطلبات والمدفوعات سوف يظهر هنا."
                    : "No data available yet. Orders and payments will appear here."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}