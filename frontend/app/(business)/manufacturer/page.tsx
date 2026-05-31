"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/providers/auth-provider"
import { Package, ShoppingCart, DollarSign, TrendingUp, Plus, FileText, PackageCheck, Settings, BarChart3, Users, Bell, ArrowRight, AlertCircle, CheckCircle2, Eye } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/providers/language-provider"

export default function ManufacturerDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const { language } = useLanguage()
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeOrders: 0,
    pendingQuotes: 0,
    monthlyRevenue: 0,
    pendingSamples: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || (user.role !== "MANUFACTURER" && user.role !== "ADMIN")) {
      router.push("/login")
      return
    }

    // Fetch manufacturer stats
    const fetchStats = async () => {
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500))
        setStats({
          totalProducts: 24,
          activeOrders: 8,
          pendingQuotes: 5,
          monthlyRevenue: 45750,
          pendingSamples: 3,
        })
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user, router])

  if (!user || (user.role !== "MANUFACTURER" && user.role !== "ADMIN")) {
    return null
  }

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          {language === "ar" ? "لوحة تحكم المصنع" : "Manufacturer Dashboard"}
        </h1>
        <p className="text-slate-600">
          {language === "ar"
            ? "مرحباً بك، إدارة شاملة لمنتجاتك وطلباتك"
            : "Welcome, comprehensive management for your products and orders"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link href="/manufacturer/products">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                {language === "ar" ? "إجمالي المنتجات" : "Total Products"}
              </CardTitle>
              <Package className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-slate-500">
                  {language === "ar" ? "منتجات نشطة" : "Active products"}
                </p>
                <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/manufacturer/orders">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                {language === "ar" ? "الطلبات النشطة" : "Active Orders"}
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeOrders}</div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-slate-500">
                  {language === "ar" ? "في الانتظار" : "Pending processing"}
                </p>
                <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/manufacturer/quotes">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                {language === "ar" ? "عروض معلقة" : "Pending Quotes"}
              </CardTitle>
              <FileText className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingQuotes}</div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-slate-500">
                  {language === "ar" ? "تتطلب رد" : "Require response"}
                </p>
                <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              {language === "ar" ? "إيرادات الشهر" : "Monthly Revenue"}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.monthlyRevenue.toLocaleString()} {language === "ar" ? "جنيه" : "EGP"}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              {language === "ar" ? "+12% من الشهر الماضي" : "+12% from last month"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              {language === "ar" ? "إجراءات سريعة" : "Quick Actions"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Button asChild className="h-auto py-4 flex-col">
              <Link href="/manufacturer/products/new">
                <Plus className="h-5 w-5 mb-2" />
                {language === "ar" ? "إضافة منتج" : "Add Product"}
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col">
              <Link href="/manufacturer/products">
                <Package className="h-5 w-5 mb-2" />
                {language === "ar" ? "إدارة المنتجات" : "Manage Products"}
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col">
              <Link href="/manufacturer/orders">
                <ShoppingCart className="h-5 w-5 mb-2" />
                {language === "ar" ? "الطلبات" : "Orders"}
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col">
              <Link href="/manufacturer/quotes">
                <FileText className="h-5 w-5 mb-2" />
                {language === "ar" ? "العروض" : "Quotes"}
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col">
              <Link href="/manufacturer/samples">
                <PackageCheck className="h-5 w-5 mb-2" />
                {language === "ar" ? "طلبات العينات" : "Sample Requests"}
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col">
              <Link href="/manufacturer/custom-orders">
                <FileText className="h-5 w-5 mb-2" />
                {language === "ar" ? "طلبات مخصصة" : "Custom Orders"}
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col">
              <Link href="/manufacturer/analytics">
                <BarChart3 className="h-5 w-5 mb-2" />
                {language === "ar" ? "التحليلات" : "Analytics"}
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-4 flex-col">
              <Link href="/b2b">
                <Users className="h-5 w-5 mb-2" />
                {language === "ar" ? "بوابة B2B" : "B2B Portal"}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              {language === "ar" ? "إشعارات" : "Notifications"}
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/manufacturer/notifications">
                {language === "ar" ? "عرض الكل" : "View All"}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/manufacturer/quotes">
              <div className="flex items-start justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer group">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <p className="text-sm font-medium">
                      {language === "ar" ? "طلب عرض سعر جديد" : "New quote request"}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {language === "ar" ? "من: شركة الأهرام" : "From: Al-Ahram Company"}
                  </p>
                </div>
                <Badge variant="secondary" className="group-hover:bg-blue-200">
                  {language === "ar" ? "جديد" : "New"}
                </Badge>
              </div>
            </Link>
            <Link href="/manufacturer/samples">
              <div className="flex items-start justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer group">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <p className="text-sm font-medium">
                      {language === "ar" ? "طلب عينة جديد" : "New sample request"}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {language === "ar" ? "منتج: علب كرتون" : "Product: Cardboard Boxes"}
                  </p>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800 group-hover:bg-green-200">
                  {stats.pendingSamples}
                </Badge>
              </div>
            </Link>
            <Link href="/manufacturer/orders">
              <div className="flex items-start justify-between p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors cursor-pointer group">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <ShoppingCart className="h-4 w-4 text-orange-600" />
                    <p className="text-sm font-medium">
                      {language === "ar" ? "طلب جديد يحتاج مراجعة" : "New order requires review"}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {language === "ar" ? "رقم الطلب: #1005" : "Order #1005"}
                  </p>
                </div>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800 group-hover:bg-orange-200">
                  {language === "ar" ? "جديد" : "New"}
                </Badge>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{language === "ar" ? "الطلبات الأخيرة" : "Recent Orders"}</CardTitle>
            <CardDescription>
              {language === "ar" ? "آخر 5 طلبات" : "Last 5 orders"}
            </CardDescription>
          </div>
          <Button asChild variant="outline">
            <Link href="/manufacturer/orders">
              {language === "ar" ? "عرض الكل" : "View All"}
              <Eye className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((order) => (
              <Link key={order} href={`/manufacturer/orders/${1000 + order}`}>
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors group">
                  <div className="flex-1">
                    <p className="font-medium">#{1000 + order}</p>
                    <p className="text-sm text-slate-500">
                      {language === "ar" ? "علب كرتون × 500" : "Cardboard Boxes × 500"}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className="font-medium">{(1250 * order).toLocaleString()} {language === "ar" ? "جنيه" : "EGP"}</p>
                      <Badge variant="outline" className="mt-1">
                        {language === "ar" ? "قيد المعالجة" : "Processing"}
                      </Badge>
                    </div>
                    <Eye className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

