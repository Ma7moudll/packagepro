"use client"

import { useEffect, useState } from "react"
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
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"
import {
  TrendingUp,
  ShoppingCart,
  Users,
  Package,
  DollarSign,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  LucideIcon,
} from "lucide-react"

interface DashboardStats {
  revenue: number
  revenueChange: number
  orders: number
  ordersChange: number
  users: number
  usersChange: number
  products: number
  productsChange: number
}

interface ChartData {
  date: string
  revenue: number
  orders: number
  users: number
}

interface TopProduct {
  id: number
  name: string
  sales: number
  revenue: number
  trend: number
}

interface OrderStatus {
  status: string
  count: number
  percentage: number
  [key: string]: any
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const { language, isRTL } = useLanguage()
  const router = useRouter()

  const [stats] = useState<DashboardStats>({
    revenue: 124500,
    revenueChange: 12.5,
    orders: 1234,
    ordersChange: 8.2,
    users: 5678,
    usersChange: 15.3,
    products: 890,
    productsChange: 5.1,
  })

  const [chartData] = useState<ChartData[]>([
    { date: "Jan", revenue: 45000, orders: 120, users: 850 },
    { date: "Feb", revenue: 52000, orders: 145, users: 920 },
    { date: "Mar", revenue: 48000, orders: 135, users: 890 },
    { date: "Apr", revenue: 61000, orders: 180, users: 1050 },
    { date: "May", revenue: 58000, orders: 165, users: 1120 },
    { date: "Jun", revenue: 124500, orders: 289, users: 1296 },
  ])

  const [topProducts] = useState<TopProduct[]>([
    { id: 1, name: "علب البيتزا", sales: 456, revenue: 12500, trend: 15 },
    { id: 2, name: "علب البرجر", sales: 389, revenue: 10800, trend: -5 },
    { id: 3, name: "أكواب ورقية", sales: 345, revenue: 9200, trend: 22 },
    { id: 4, name: "أكياس ورقية", sales: 298, revenue: 8500, trend: 8 },
    { id: 5, name: "علب هدايا", sales: 267, revenue: 7800, trend: 18 },
  ])

  const [orderStatus] = useState<OrderStatus[]>([
    { status: language === "ar" ? "قيد المعالجة" : "Processing", count: 234, percentage: 19 },
    { status: language === "ar" ? "مشحونة" : "Shipped", count: 567, percentage: 46 },
    { status: language === "ar" ? "تم التسليم" : "Delivered", count: 412, percentage: 33 },
    { status: language === "ar" ? "ملغاة" : "Cancelled", count: 21, percentage: 2 },
  ])

  const [revenueByRegion] = useState([
    { name: language === "ar" ? "القاهرة" : "Cairo", value: 45000 },
    { name: language === "ar" ? "الإسكندرية" : "Alexandria", value: 28000 },
    { name: language === "ar" ? "الرياض" : "Riyadh", value: 35000 },
    { name: language === "ar" ? "جدة" : "Jeddah", value: 16500 },
  ])

  const COLORS = ["#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0"]

  useEffect(() => {
    if (!user || user.role !== "ADMIN") {
      router.push("/login")
    }
  }, [user, router])

  if (!user || user.role !== "ADMIN") {
    return null
  }

  const StatCard = ({
    icon: Icon,
    title,
    value,
    change,
    isPositive,
  }: {
    icon: LucideIcon
    title: string
    value: string | number
    change: number
    isPositive: boolean
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-2">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <div className="flex items-center mt-2">
              {isPositive ? (
                <ArrowUpRight className="w-4 h-4 text-green-600 mr-1" />
              ) : (
                <ArrowDownLeft className="w-4 h-4 text-red-600 mr-1" />
              )}
              <span className={`text-sm font-semibold ${isPositive ? "text-green-600" : "text-red-600"}`}>
                {Math.abs(change)}%
              </span>
            </div>
          </div>
          <div className={`p-3 rounded-lg ${isPositive ? "bg-green-100" : "bg-red-100"}`}>
            <Icon className={`w-6 h-6 ${isPositive ? "text-green-600" : "text-red-600"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )

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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={DollarSign}
          title={language === "ar" ? "الإيرادات الكلية" : "Total Revenue"}
          value={`$${stats.revenue.toLocaleString()}`}
          change={stats.revenueChange}
          isPositive={stats.revenueChange > 0}
        />
        <StatCard
          icon={ShoppingCart}
          title={language === "ar" ? "الطلبات" : "Orders"}
          value={stats.orders}
          change={stats.ordersChange}
          isPositive={stats.ordersChange > 0}
        />
        <StatCard
          icon={Users}
          title={language === "ar" ? "المستخدمين" : "Users"}
          value={stats.users}
          change={stats.usersChange}
          isPositive={stats.usersChange > 0}
        />
        <StatCard
          icon={Package}
          title={language === "ar" ? "المنتجات" : "Products"}
          value={stats.products}
          change={stats.productsChange}
          isPositive={stats.productsChange > 0}
        />
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="revenue" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="revenue">{language === "ar" ? "الإيرادات" : "Revenue"}</TabsTrigger>
          <TabsTrigger value="orders">{language === "ar" ? "الطلبات" : "Orders"}</TabsTrigger>
          <TabsTrigger value="status">{language === "ar" ? "الحالة" : "Status"}</TabsTrigger>
          <TabsTrigger value="regional">{language === "ar" ? "الإقليمي" : "Regional"}</TabsTrigger>
        </TabsList>

        {/* Revenue Chart */}
        <TabsContent value="revenue">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{language === "ar" ? "الإيرادات الشهرية" : "Monthly Revenue"}</CardTitle>
              <CardDescription>
                {language === "ar" ? "اتجاه الإيرادات خلال الأشهر الماضية" : "Revenue trend over recent months"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="revenue" stroke="#059669" fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Chart */}
        <TabsContent value="orders">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{language === "ar" ? "عدد الطلبات" : "Order Volume"}</CardTitle>
              <CardDescription>
                {language === "ar" ? "عدد الطلبات الشهرية" : "Number of orders per month"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="orders" fill="#059669" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Order Status */}
        <TabsContent value="status">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{language === "ar" ? "توزيع حالات الطلبات" : "Order Status Distribution"}</CardTitle>
              <CardDescription>
                {language === "ar" ? "تصنيف الطلبات حسب الحالة" : "Breakdown of orders by status"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={orderStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${percent}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {orderStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-3">
                  {orderStatus.map((status, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-3"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></div>
                        <span className="text-sm font-medium">{status.status}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{status.count}</p>
                        <p className="text-xs text-gray-600">{status.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Regional Analysis */}
        <TabsContent value="regional">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{language === "ar" ? "الإيرادات حسب المنطقة" : "Revenue by Region"}</CardTitle>
              <CardDescription>
                {language === "ar" ? "توزيع الإيرادات الجغرافي" : "Geographic revenue distribution"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={revenueByRegion}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Top Products and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
              {language === "ar" ? "أفضل المنتجات" : "Top Products"}
            </CardTitle>
            <CardDescription>{language === "ar" ? "المنتجات الأكثر مبيعاً" : "Best selling products"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-gray-600">
                      {product.sales} {language === "ar" ? "مبيعة" : "sales"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">${product.revenue}</p>
                    <p className={`text-xs ${product.trend > 0 ? "text-green-600" : "text-red-600"}`}>
                      {product.trend > 0 ? "+" : ""}
                      {product.trend}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2 text-blue-600" />
              {language === "ar" ? "النشاط الأخير" : "Recent Activity"}
            </CardTitle>
            <CardDescription>
              {language === "ar" ? "آخر التحديثات والطلبات" : "Latest updates and orders"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  icon: CheckCircle,
                  title: language === "ar" ? "طلب جديد #12450" : "New Order #12450",
                  time: language === "ar" ? "منذ 5 دقائق" : "5 minutes ago",
                  color: "green",
                },
                {
                  icon: Clock,
                  title: language === "ar" ? "طلب قيد المعالجة #12449" : "Order Processing #12449",
                  time: language === "ar" ? "منذ 15 دقيقة" : "15 minutes ago",
                  color: "blue",
                },
                {
                  icon: CheckCircle,
                  title: language === "ar" ? "تم تسليم #12448" : "Delivered #12448",
                  time: language === "ar" ? "منذ ساعة" : "1 hour ago",
                  color: "green",
                },
                {
                  icon: AlertCircle,
                  title: language === "ar" ? "مشكلة في المخزون #12447" : "Stock Issue #12447",
                  time: language === "ar" ? "منذ ساعتين" : "2 hours ago",
                  color: "red",
                },
              ].map((activity, index) => {
                const ActivityIcon = activity.icon
                return (
                  <div key={index} className="flex items-start space-x-3 pb-3 border-b last:border-b-0">
                    <div className={`p-2 rounded-full bg-${activity.color}-100`}>
                      <ActivityIcon className={`w-4 h-4 text-${activity.color}-600`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
