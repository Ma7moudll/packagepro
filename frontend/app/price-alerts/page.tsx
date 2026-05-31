"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLanguage } from "@/providers/language-provider"
import { Bell, Trash2, Check, Clock, Plus } from "lucide-react"

interface PriceAlert {
  id: string
  productName: string
  productId: number
  currentPrice: number
  targetPrice: number
  savedAmount: number
  status: "active" | "triggered" | "expired"
  createdDate: Date
  triggeredDate?: Date
  notificationCount: number
}

export default function PriceAlertsPage() {
  const { language } = useLanguage()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([
    {
      id: "1",
      productName: language === "ar" ? "علب بيتزا كرتونية" : "Pizza Boxes",
      productId: 1,
      currentPrice: 3.2,
      targetPrice: 2.8,
      savedAmount: 0.4,
      status: "active",
      createdDate: new Date("2024-01-15"),
      notificationCount: 0,
    },
    {
      id: "2",
      productName: language === "ar" ? "أكواب ورقية ساخنة" : "Hot Paper Cups",
      productId: 2,
      currentPrice: 2.4,
      targetPrice: 2.0,
      savedAmount: 0.4,
      status: "triggered",
      createdDate: new Date("2024-01-10"),
      triggeredDate: new Date("2024-01-20"),
      notificationCount: 1,
    },
    {
      id: "3",
      productName: language === "ar" ? "أكياس ورق كرافت" : "Kraft Paper Bags",
      productId: 3,
      currentPrice: 1.4,
      targetPrice: 1.1,
      savedAmount: 0.3,
      status: "active",
      createdDate: new Date("2024-01-08"),
      notificationCount: 2,
    },
  ])

  const activeAlerts = priceAlerts.filter((a) => a.status === "active")
  const triggeredAlerts = priceAlerts.filter((a) => a.status === "triggered")
  const totalSavings = priceAlerts.filter((a) => a.status === "triggered").reduce((sum, a) => sum + a.savedAmount, 0)

  const handleDeleteAlert = (id: string) => {
    setPriceAlerts(priceAlerts.filter((a) => a.id !== id))
  }

  const handleTriggerAlert = (id: string) => {
    setPriceAlerts(
      priceAlerts.map((a) =>
        a.id === id
          ? {
              ...a,
              status: "triggered",
              triggeredDate: new Date(),
              notificationCount: a.notificationCount + 1,
            }
          : a,
      ),
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2 flex items-center">
            <Bell className="w-10 h-10 mr-3 text-yellow-500" />
            {language === "ar" ? "تنبيهات الأسعار" : "Price Alerts"}
          </h1>
          <p className="text-slate-600">
            {language === "ar"
              ? "تلقي إشعارات فورية عند انخفاض أسعار المنتجات"
              : "Get instant notifications when product prices drop"}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-slate-600 mb-1">
                  {language === "ar" ? "التنبيهات النشطة" : "Active Alerts"}
                </p>
                <p className="text-3xl font-bold text-slate-900">{activeAlerts.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-slate-600 mb-1">
                  {language === "ar" ? "التنبيهات المفعلة" : "Triggered Alerts"}
                </p>
                <p className="text-3xl font-bold text-green-600">{triggeredAlerts.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-slate-600 mb-1">{language === "ar" ? "إجمالي التوفير" : "Total Savings"}</p>
                <p className="text-3xl font-bold text-green-600">${totalSavings.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowCreateForm(!showCreateForm)}
              >
                <Plus className="w-4 h-4 mr-2" />
                {language === "ar" ? "إضافة تنبيه جديد" : "Add New Alert"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Create Alert Form */}
        {showCreateForm && (
          <Card className="mb-8 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900">
                {language === "ar" ? "إنشاء تنبيه جديد" : "Create New Alert"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-900 block mb-2">
                    {language === "ar" ? "المنتج" : "Product"}
                  </label>
                  <Input placeholder={language === "ar" ? "اختر منتج" : "Select product"} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-900 block mb-2">
                    {language === "ar" ? "السعر الحالي" : "Current Price"}
                  </label>
                  <Input type="number" placeholder="3.50" disabled />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-900 block mb-2">
                    {language === "ar" ? "السعر المستهدف" : "Target Price"}
                  </label>
                  <Input type="number" placeholder="2.50" />
                </div>
                <div className="flex items-end">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    {language === "ar" ? "إنشاء التنبيه" : "Create Alert"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="bg-slate-200">
            <TabsTrigger value="active" className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              {language === "ar" ? "النشطة" : "Active"} ({activeAlerts.length})
            </TabsTrigger>
            <TabsTrigger value="triggered" className="flex items-center">
              <Check className="w-4 h-4 mr-2" />
              {language === "ar" ? "المفعلة" : "Triggered"} ({triggeredAlerts.length})
            </TabsTrigger>
          </TabsList>

          {/* Active Alerts */}
          <TabsContent value="active">
            <div className="space-y-4">
              {activeAlerts.length > 0 ? (
                activeAlerts.map((alert) => (
                  <Card key={alert.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                        <div>
                          <h3 className="font-semibold text-slate-900">{alert.productName}</h3>
                          <p className="text-sm text-slate-600 mt-1">
                            {language === "ar" ? "تم الإنشاء:" : "Created:"}{" "}
                            {alert.createdDate.toLocaleDateString(language === "ar" ? "ar-SA" : "en-US")}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-slate-600 mb-1">
                            {language === "ar" ? "السعر الحالي" : "Current Price"}
                          </p>
                          <p className="text-lg font-bold text-slate-900">${alert.currentPrice.toFixed(2)}</p>
                        </div>

                        <div>
                          <p className="text-sm text-slate-600 mb-1">
                            {language === "ar" ? "السعر المستهدف" : "Target Price"}
                          </p>
                          <p className="text-lg font-bold text-blue-600">${alert.targetPrice.toFixed(2)}</p>
                        </div>

                        <div>
                          <p className="text-sm text-slate-600 mb-1">
                            {language === "ar" ? "المدخرات المتوقعة" : "Expected Savings"}
                          </p>
                          <p className="text-lg font-bold text-green-600">${alert.savedAmount.toFixed(2)}</p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTriggerAlert(alert.id)}
                            className="flex-1"
                          >
                            {language === "ar" ? "اختبر" : "Test"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAlert(alert.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="text-center py-12">
                  <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">
                    {language === "ar"
                      ? "لا توجد تنبيهات نشطة. أضف تنبيهاً جديداً."
                      : "No active alerts. Create one now!"}
                  </p>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Triggered Alerts */}
          <TabsContent value="triggered">
            <div className="space-y-4">
              {triggeredAlerts.length > 0 ? (
                triggeredAlerts.map((alert) => (
                  <Card key={alert.id} className="border-green-200 bg-green-50">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                        <div>
                          <h3 className="font-semibold text-slate-900">{alert.productName}</h3>
                          <p className="text-sm text-green-600 mt-1 flex items-center">
                            <Check className="w-4 h-4 mr-1" />
                            {language === "ar" ? "تم تفعيل التنبيه" : "Price alert triggered"}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-slate-600 mb-1">
                            {language === "ar" ? "السعر الحالي" : "Current Price"}
                          </p>
                          <p className="text-lg font-bold text-slate-900">${alert.currentPrice.toFixed(2)}</p>
                        </div>

                        <div>
                          <p className="text-sm text-slate-600 mb-1">
                            {language === "ar" ? "السعر المستهدف" : "Target Price"}
                          </p>
                          <p className="text-lg font-bold text-green-600">${alert.targetPrice.toFixed(2)}</p>
                        </div>

                        <div>
                          <p className="text-sm text-slate-600 mb-1">{language === "ar" ? "المدخرات" : "Savings"}</p>
                          <p className="text-lg font-bold text-green-600">${alert.savedAmount.toFixed(2)}</p>
                        </div>

                        <div className="flex gap-2">
                          <Button variant="default" size="sm" className="flex-1 bg-green-600 hover:bg-green-700">
                            {language === "ar" ? "اشتري الآن" : "Buy Now"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAlert(alert.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="text-center py-12">
                  <Check className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">
                    {language === "ar" ? "لم يتم تفعيل أي تنبيهات حتى الآن" : "No triggered alerts yet"}
                  </p>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Tips Section */}
        <Card className="mt-8 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="text-yellow-900">
              {language === "ar" ? "نصائح لاستخدام التنبيهات" : "Tips for Using Alerts"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-yellow-900">
              <li className="flex items-start">
                <span className="mr-3 font-bold">✓</span>
                <span>
                  {language === "ar"
                    ? "اضبط السعر المستهدف بحوالي 10-15% أقل من السعر الحالي"
                    : "Set target price 10-15% lower than current price"}
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 font-bold">✓</span>
                <span>
                  {language === "ar"
                    ? "تفقد التنبيهات المفعلة يومياً لعدم فقدان الفرص"
                    : "Check triggered alerts daily to not miss opportunities"}
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 font-bold">✓</span>
                <span>
                  {language === "ar"
                    ? "يمكنك إنشاء عدة تنبيهات لنفس المنتج بأسعار مختلفة"
                    : "You can create multiple alerts for same product at different prices"}
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
