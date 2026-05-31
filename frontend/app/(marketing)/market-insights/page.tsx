"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { TrendingUp, TrendingDown, ShoppingBag, Users, DollarSign, Package } from "lucide-react"

export default function MarketInsightsPage() {
  const { language } = useLanguage()

  const priceData = [
    { product: language === "ar" ? "علب بيتزا" : "Pizza Boxes", minPrice: 2.5, avgPrice: 3.2, maxPrice: 4.0 },
    { product: language === "ar" ? "أكواب ساخنة" : "Hot Cups", minPrice: 1.8, avgPrice: 2.4, maxPrice: 3.2 },
    { product: language === "ar" ? "أكياس ورق" : "Paper Bags", minPrice: 0.9, avgPrice: 1.4, maxPrice: 2.0 },
    { product: language === "ar" ? "علب برجر" : "Burger Boxes", minPrice: 1.5, avgPrice: 2.1, maxPrice: 2.8 },
    {
      product: language === "ar" ? "حاويات بلاستيك" : "Plastic Containers",
      minPrice: 0.8,
      avgPrice: 1.2,
      maxPrice: 1.8,
    },
  ]

  const demandData = [
    { month: "Jan", demand: 65, supply: 58, exports: 45 },
    { month: "Feb", demand: 72, supply: 68, exports: 52 },
    { month: "Mar", demand: 81, supply: 75, exports: 61 },
    { month: "Apr", demand: 88, supply: 82, exports: 68 },
    { month: "May", demand: 95, supply: 89, exports: 75 },
    { month: "Jun", demand: 102, supply: 96, exports: 82 },
  ]

  const categoryData = [
    { name: language === "ar" ? "علب ومجلدات" : "Boxes & Folders", value: 28, color: "#3b82f6" },
    { name: language === "ar" ? "أكواب وأدوات" : "Cups & Utensils", value: 24, color: "#10b981" },
    { name: language === "ar" ? "أكياس وأغلفة" : "Bags & Films", value: 22, color: "#f59e0b" },
    { name: language === "ar" ? "حاويات" : "Containers", value: 15, color: "#8b5cf6" },
    { name: language === "ar" ? "أخرى" : "Others", value: 11, color: "#ec4899" },
  ]

  const materialTrends = [
    { material: language === "ar" ? "كرتون مقوى" : "Corrugated Cardboard", trend: "up", change: "12%", market: 35 },
    { material: language === "ar" ? "ورق كرافت" : "Kraft Paper", trend: "up", change: "8%", market: 28 },
    { material: language === "ar" ? "بلاستيك" : "Plastic", trend: "down", change: "-5%", market: 22 },
    { material: language === "ar" ? "زجاج" : "Glass", trend: "up", change: "15%", market: 10 },
    { material: language === "ar" ? "معادن" : "Metals", trend: "stable", change: "0%", market: 5 },
  ]

  const topManufacturers = [
    { rank: 1, name: language === "ar" ? "مصنع النيل" : "Nile Factory", market: 22, growth: "8%" },
    { rank: 2, name: language === "ar" ? "مصنع الأهرام" : "Pyramid Factory", market: 18, growth: "5%" },
    { rank: 3, name: language === "ar" ? "مصنع الدلتا" : "Delta Factory", market: 15, growth: "12%" },
    { rank: 4, name: language === "ar" ? "مصنع الشرق" : "East Factory", market: 12, growth: "3%" },
    { rank: 5, name: language === "ar" ? "مصنع الغرب" : "West Factory", market: 10, growth: "7%" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            {language === "ar" ? "رؤى السوق" : "Market Insights"}
          </h1>
          <p className="text-slate-600">
            {language === "ar"
              ? "تحليل شامل لاتجاهات السوق والأسعار والطلب"
              : "Comprehensive analysis of market trends, prices, and demand"}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">{language === "ar" ? "حجم السوق" : "Market Size"}</p>
                  <p className="text-2xl font-bold text-slate-900">$2.8B</p>
                  <p className="text-xs text-green-600 mt-1">
                    <TrendingUp className="w-3 h-3 inline mr-1" />
                    {language === "ar" ? "نمو 15% سنوي" : "+15% YoY"}
                  </p>
                </div>
                <ShoppingBag className="w-10 h-10 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">{language === "ar" ? "عدد المصانع" : "Manufacturers"}</p>
                  <p className="text-2xl font-bold text-slate-900">1,250+</p>
                  <p className="text-xs text-green-600 mt-1">
                    <TrendingUp className="w-3 h-3 inline mr-1" />
                    {language === "ar" ? "زيادة 8% هذا العام" : "+8% This Year"}
                  </p>
                </div>
                <Users className="w-10 h-10 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">{language === "ar" ? "متوسط السعر" : "Avg. Price"}</p>
                  <p className="text-2xl font-bold text-slate-900">$2.15</p>
                  <p className="text-xs text-red-600 mt-1">
                    <TrendingDown className="w-3 h-3 inline mr-1" />
                    {language === "ar" ? "انخفاض 3% الربع الماضي" : "-3% Last Quarter"}
                  </p>
                </div>
                <DollarSign className="w-10 h-10 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">{language === "ar" ? "حجم الطلب" : "Demand Volume"}</p>
                  <p className="text-2xl font-bold text-slate-900">102M</p>
                  <p className="text-xs text-green-600 mt-1">
                    <TrendingUp className="w-3 h-3 inline mr-1" />
                    {language === "ar" ? "زيادة 12% هذا الشهر" : "+12% This Month"}
                  </p>
                </div>
                <Package className="w-10 h-10 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="demand" className="space-y-6">
          <TabsList className="bg-slate-200">
            <TabsTrigger value="demand">{language === "ar" ? "الطلب والعرض" : "Demand"}</TabsTrigger>
            <TabsTrigger value="prices">{language === "ar" ? "الأسعار" : "Prices"}</TabsTrigger>
            <TabsTrigger value="categories">{language === "ar" ? "الفئات" : "Categories"}</TabsTrigger>
            <TabsTrigger value="materials">{language === "ar" ? "المواد" : "Materials"}</TabsTrigger>
            <TabsTrigger value="manufacturers">{language === "ar" ? "المصانع" : "Manufacturers"}</TabsTrigger>
          </TabsList>

          {/* Demand Tab */}
          <TabsContent value="demand">
            <Card>
              <CardHeader>
                <CardTitle>{language === "ar" ? "اتجاهات الطلب والعرض" : "Demand & Supply Trends"}</CardTitle>
                <CardDescription>{language === "ar" ? "الستة أشهر الماضية" : "Last 6 Months"}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={demandData}>
                    <defs>
                      <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorSupply" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="demand" stroke="#3b82f6" fillOpacity={1} fill="url(#colorDemand)" />
                    <Area type="monotone" dataKey="supply" stroke="#10b981" fillOpacity={1} fill="url(#colorSupply)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prices Tab */}
          <TabsContent value="prices">
            <Card>
              <CardHeader>
                <CardTitle>{language === "ar" ? "نطاقات الأسعار" : "Price Ranges"}</CardTitle>
                <CardDescription>
                  {language === "ar" ? "تحليل الأسعار الدنيا والعليا والمتوسطة" : "Min, Avg, and Max prices analysis"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={priceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="product" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="minPrice" fill="#ef4444" />
                    <Bar dataKey="avgPrice" fill="#f59e0b" />
                    <Bar dataKey="maxPrice" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle>{language === "ar" ? "توزيع الفئات" : "Market Share by Category"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="space-y-4">
                    {categoryData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: item.color }} />
                          <span className="font-medium text-slate-900">{item.name}</span>
                        </div>
                        <span className="font-bold text-slate-900">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Materials Tab */}
          <TabsContent value="materials">
            <Card>
              <CardHeader>
                <CardTitle>{language === "ar" ? "اتجاهات المواد الخام" : "Raw Material Trends"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {materialTrends.map((item) => (
                    <div key={item.material} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 mb-1">{item.material}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-600">
                            {language === "ar" ? "نصيب السوق:" : "Market Share:"}
                          </span>
                          <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${item.market}%` }} />
                          </div>
                          <span className="text-sm font-medium text-slate-900">{item.market}%</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`flex items-center gap-1 ${item.trend === "up" ? "text-green-600" : item.trend === "down" ? "text-red-600" : "text-gray-600"}`}
                        >
                          {item.trend === "up" && <TrendingUp className="w-4 h-4" />}
                          {item.trend === "down" && <TrendingDown className="w-4 h-4" />}
                          <span className="font-bold">{item.change}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manufacturers Tab */}
          <TabsContent value="manufacturers">
            <Card>
              <CardHeader>
                <CardTitle>{language === "ar" ? "أكبر المصانع" : "Top Manufacturers"}</CardTitle>
                <CardDescription>
                  {language === "ar" ? "حسب حصتهم في السوق والنمو" : "By market share and growth"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topManufacturers.map((item) => (
                    <div
                      key={item.rank}
                      className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">{item.rank}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900">{item.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                              style={{ width: `${item.market * 2}%` }}
                            />
                          </div>
                          <span className="text-sm text-slate-600">{item.market}%</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-green-100 text-green-800">
                          <TrendingUp className="w-3 h-3 mr-1 inline" />
                          {item.growth}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Insights Section */}
        <Card className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">{language === "ar" ? "الرؤى الرئيسية" : "Key Insights"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold text-blue-900 mb-2">
                  {language === "ar" ? "نمو الطلب" : "Demand Growth"}
                </h4>
                <p className="text-sm text-blue-700">
                  {language === "ar"
                    ? "الطلب على منتجات التعبئة يشهد نمواً ثابتاً بنسبة 12% شهرياً، مع تركيز على المنتجات المستدامة."
                    : "Packaging demand shows steady growth of 12% monthly, with focus on sustainable products."}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-blue-900 mb-2">
                  {language === "ar" ? "ضغط الأسعار" : "Price Pressure"}
                </h4>
                <p className="text-sm text-blue-700">
                  {language === "ar"
                    ? "انخفاض الأسعار بمعدل 3-5% كل ربع سنة مع زيادة المنافسة والكفاءة الإنتاجية."
                    : "Prices declining 3-5% quarterly due to increased competition and production efficiency."}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-blue-900 mb-2">
                  {language === "ar" ? "الفرص المستقبلية" : "Future Opportunities"}
                </h4>
                <p className="text-sm text-blue-700">
                  {language === "ar"
                    ? "فرص كبيرة في المنتجات البيئية والمخصصة مع هوامش ربح أعلى (20-30%)."
                    : "Strong opportunities in eco-friendly and custom products with higher margins (20-30%)."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
