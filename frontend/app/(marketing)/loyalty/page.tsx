"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/providers/auth-provider"
import { useLanguage } from "@/providers/language-provider"
import { Gift, Star, Zap, Crown, TrendingUp, History, Award } from "lucide-react"

interface LoyaltyTier {
  id: string
  name_ar: string
  name_en: string
  color: string
  icon: React.ReactNode
  minPoints: number
  maxPoints: number
  multiplier: number
  benefits: string[]
  badge: string
}

interface PointsTransaction {
  id: string
  type: "earned" | "redeemed" | "expired"
  points: number
  description: string
  date: Date
  orderId?: string
}

const LOYALTY_TIERS: LoyaltyTier[] = [
  {
    id: "bronze",
    name_ar: "البرونزي",
    name_en: "Bronze",
    color: "from-amber-700 to-amber-600",
    icon: <Award className="w-8 h-8 text-amber-700" />,
    minPoints: 0,
    maxPoints: 999,
    multiplier: 1,
    benefits: ["نقطة واحدة لكل جنيه", "خصم 5% على المنتجات المميزة", "دعم العملاء الأولوي"],
    badge: "🥉",
  },
  {
    id: "silver",
    name_ar: "الفضي",
    name_en: "Silver",
    color: "from-gray-400 to-gray-300",
    icon: <Star className="w-8 h-8 text-gray-400" />,
    minPoints: 1000,
    maxPoints: 4999,
    multiplier: 1.5,
    benefits: ["1.5 نقطة لكل جنيه", "خصم 10% على جميع المنتجات", "شحن مجاني", "وصول مبكر للعروض"],
    badge: "🥈",
  },
  {
    id: "gold",
    name_ar: "الذهبي",
    name_en: "Gold",
    color: "from-yellow-500 to-yellow-400",
    icon: <Zap className="w-8 h-8 text-yellow-500" />,
    minPoints: 5000,
    maxPoints: 14999,
    multiplier: 2,
    benefits: ["نقطتان لكل جنيه", "خصم 15% على جميع المنتجات", "شحن مجاني مع الأولوية", "هدايا شهرية", "حدث VIP سنوي"],
    badge: "🥇",
  },
  {
    id: "platinum",
    name_ar: "البلاتيني",
    name_en: "Platinum",
    color: "from-purple-600 to-purple-500",
    icon: <Crown className="w-8 h-8 text-purple-600" />,
    minPoints: 15000,
    maxPoints: Number.POSITIVE_INFINITY,
    multiplier: 3,
    benefits: [
      "3 نقاط لكل جنيه",
      "خصم 20% على جميع المنتجات",
      "شحن مجاني مع الأولوية العالية",
      "هدايا حصرية شهرية",
      "مديري حسابات مخصصين",
      "حدث VIP سنوي مع هدايا",
      "دعم 24/7 مخصص",
    ],
    badge: "💎",
  },
]

export default function LoyaltyPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { language } = useLanguage()

  const [currentPoints] = useState(7500)
  const [totalEarned] = useState(12500)
  const [totalRedeemed] = useState(5000)
  const [transactions] = useState<PointsTransaction[]>([
    {
      id: "1",
      type: "earned",
      points: 500,
      description: language === "ar" ? "طلب رقم #ORD-2024-001" : "Order #ORD-2024-001",
      date: new Date("2024-01-15"),
      orderId: "ORD-2024-001",
    },
    {
      id: "2",
      type: "earned",
      points: 300,
      description: language === "ar" ? "تقييم المنتج" : "Product Review",
      date: new Date("2024-01-10"),
    },
    {
      id: "3",
      type: "redeemed",
      points: -200,
      description: language === "ar" ? "خصم على الطلب" : "Discount on Order",
      date: new Date("2024-01-08"),
      orderId: "ORD-2024-002",
    },
    {
      id: "4",
      type: "earned",
      points: 750,
      description: language === "ar" ? "طلب رقم #ORD-2024-003" : "Order #ORD-2024-003",
      date: new Date("2024-01-01"),
      orderId: "ORD-2024-003",
    },
  ])

  useEffect(() => {
    if (!user) {
      router.push("/login")
    }
  }, [user, router])

  const getCurrentTier = () => {
    return LOYALTY_TIERS.find((tier) => currentPoints >= tier.minPoints && currentPoints <= tier.maxPoints)
  }

  const getNextTier = () => {
    const currentTier = getCurrentTier()
    if (!currentTier || currentTier.id === "platinum") return null
    return LOYALTY_TIERS.find((tier) => tier.minPoints > currentTier.maxPoints)
  }

  const currentTier = getCurrentTier()
  const nextTier = getNextTier()
  const progressToNextTier = nextTier
    ? ((currentPoints - currentTier!.minPoints) / (nextTier.minPoints - currentTier!.minPoints)) * 100
    : 100

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center">
            <Gift className="w-10 h-10 mr-3 text-purple-400" />
            {language === "ar" ? "برنامج الولاء" : "Loyalty Program"}
          </h1>
          <p className="text-slate-400">
            {language === "ar"
              ? "اكسب نقاطاً مع كل عملية شراء وحول نقاطك إلى مكافآت حصرية"
              : "Earn points with every purchase and convert them into exclusive rewards"}
          </p>
        </div>

        {/* Current Tier Card */}
        {currentTier && (
          <Card
            className="mb-8 bg-gradient-to-r border-0 shadow-xl"
            style={{ background: `linear-gradient(135deg, var(--tw-gradient-stops))` }}
          >
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Tier Info */}
                <div className="flex flex-col justify-center">
                  <div className="flex items-center mb-4">
                    {currentTier.icon}
                    <h2 className="text-3xl font-bold text-white ml-3">{currentTier.badge}</h2>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {language === "ar" ? currentTier.name_ar : currentTier.name_en}
                  </h3>
                  <p className="text-slate-200 text-lg">
                    {language === "ar" ? "المستوى الحالي:" : "Current Tier:"}{" "}
                    <span className="font-bold">{currentPoints.toLocaleString()}</span>{" "}
                    {language === "ar" ? "نقطة" : "points"}
                  </p>
                </div>

                {/* Points Display */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm border border-white/20">
                    <p className="text-slate-300 text-sm mb-1">
                      {language === "ar" ? "النقاط الحالية" : "Current Points"}
                    </p>
                    <p className="text-3xl font-bold text-white">{currentPoints.toLocaleString()}</p>
                  </div>
                  <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm border border-white/20">
                    <p className="text-slate-300 text-sm mb-1">
                      {language === "ar" ? "إجمالي المكتسب" : "Total Earned"}
                    </p>
                    <p className="text-3xl font-bold text-green-400">{totalEarned.toLocaleString()}</p>
                  </div>
                  <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm border border-white/20">
                    <p className="text-slate-300 text-sm mb-1">{language === "ar" ? "المستبدل" : "Redeemed"}</p>
                    <p className="text-3xl font-bold text-red-400">{totalRedeemed.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Progress to Next Tier */}
              {nextTier && (
                <div className="mt-8 pt-8 border-t border-white/30">
                  <p className="text-sm text-slate-200 mb-2">
                    {language === "ar" ? "حتى الوصول إلى" : "Until reaching"}{" "}
                    <span className="font-bold">{language === "ar" ? nextTier.name_ar : nextTier.name_en}</span>
                  </p>
                  <Progress value={progressToNextTier} className="h-2 mb-2" />
                  <p className="text-xs text-slate-300">
                    {(nextTier.minPoints - currentPoints).toLocaleString()}{" "}
                    {language === "ar" ? "نقطة متبقية" : "points remaining"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tiers Overview */}
        <Card className="mb-8 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <TrendingUp className="w-5 h-5 mr-2" />
              {language === "ar" ? "مستويات الولاء" : "Loyalty Tiers"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {LOYALTY_TIERS.map((tier) => {
                const isCurrentTier = currentTier?.id === tier.id
                const isPastTier = currentPoints > tier.maxPoints
                return (
                  <div
                    key={tier.id}
                    className={`p-4 rounded-lg border-2 transition-all ${isCurrentTier
                      ? "border-purple-500 bg-purple-500 bg-opacity-10 ring-2 ring-purple-500 ring-opacity-50"
                      : isPastTier
                        ? "border-slate-600 bg-slate-700 bg-opacity-50"
                        : "border-slate-600 bg-slate-700 bg-opacity-30 opacity-60"
                      }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">{tier.badge}</span>
                      <span className="text-2xl font-bold">{tier.multiplier}x</span>
                    </div>
                    <h4 className="font-bold text-white mb-2">{language === "ar" ? tier.name_ar : tier.name_en}</h4>
                    <p className="text-xs text-slate-300 mb-3">
                      {tier.minPoints.toLocaleString()} {language === "ar" ? "حتى" : "to"}{" "}
                      {tier.maxPoints === Number.POSITIVE_INFINITY ? "∞" : tier.maxPoints.toLocaleString()}{" "}
                      {language === "ar" ? "نقطة" : "points"}
                    </p>
                    {isCurrentTier && (
                      <Badge className="w-full text-center justify-center bg-purple-600 hover:bg-purple-700">
                        {language === "ar" ? "مستواك الحالي" : "Your Current Level"}
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="benefits" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="benefits" className="text-white">
              {language === "ar" ? "المزايا" : "Benefits"}
            </TabsTrigger>
            <TabsTrigger value="transactions" className="text-white">
              {language === "ar" ? "السجل" : "History"}
            </TabsTrigger>
            <TabsTrigger value="redeem" className="text-white">
              {language === "ar" ? "استبدال النقاط" : "Redeem"}
            </TabsTrigger>
          </TabsList>

          {/* Benefits Tab */}
          <TabsContent value="benefits">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {LOYALTY_TIERS.map((tier) => (
                <Card key={tier.id} className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <div className="flex items-center">
                      <span className="text-4xl mr-3">{tier.badge}</span>
                      <div>
                        <CardTitle className="text-white">{language === "ar" ? tier.name_ar : tier.name_en}</CardTitle>
                        <CardDescription className="text-slate-400">
                          {tier.multiplier}x {language === "ar" ? "نقطة" : "points"}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {tier.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-center text-slate-300">
                          <Star className="w-4 h-4 mr-2 text-yellow-400" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <History className="w-5 h-5 mr-2" />
                  {language === "ar" ? "سجل النقاط" : "Points History"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                    >
                      <div className="flex items-center flex-1">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${transaction.type === "earned"
                            ? "bg-green-500 bg-opacity-20"
                            : transaction.type === "redeemed"
                              ? "bg-red-500 bg-opacity-20"
                              : "bg-gray-500 bg-opacity-20"
                            }`}
                        >
                          {transaction.type === "earned" ? (
                            <TrendingUp className="w-5 h-5 text-green-400" />
                          ) : transaction.type === "redeemed" ? (
                            <Gift className="w-5 h-5 text-red-400" />
                          ) : (
                            <Zap className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium">{transaction.description}</p>
                          <p className="text-xs text-slate-400">
                            {transaction.date.toLocaleDateString(language === "ar" ? "ar-SA" : "en-US")}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-lg font-bold ${transaction.type === "earned"
                          ? "text-green-400"
                          : transaction.type === "redeemed"
                            ? "text-red-400"
                            : "text-gray-400"
                          }`}
                      >
                        {transaction.type === "earned" ? "+" : transaction.type === "redeemed" ? "-" : ""}
                        {Math.abs(transaction.points)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Redeem Tab */}
          <TabsContent value="redeem">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">
                  {language === "ar" ? "استبدل نقاطك" : "Redeem Your Points"}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {language === "ar"
                    ? "استخدم نقاطك للحصول على خصومات وهدايا حصرية"
                    : "Use your points to get exclusive discounts and rewards"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    {
                      points: 100,
                      reward: language === "ar" ? "خصم 10 جنيه" : "10 EGP Discount",
                      description: language === "ar" ? "على أي طلب" : "On any order",
                    },
                    {
                      points: 250,
                      reward: language === "ar" ? "خصم 30 جنيه" : "30 EGP Discount",
                      description: language === "ar" ? "على الطلبات فوق 200 جنيه" : "On orders over 200 EGP",
                    },
                    {
                      points: 500,
                      reward: language === "ar" ? "شحن مجاني" : "Free Shipping",
                      description: language === "ar" ? "على جميع الطلبات" : "On all orders",
                    },
                    {
                      points: 750,
                      reward: language === "ar" ? "خصم 100 جنيه" : "100 EGP Discount",
                      description: language === "ar" ? "على الطلبات فوق 500 جنيه" : "On orders over 500 EGP",
                    },
                    {
                      points: 1000,
                      reward: language === "ar" ? "عينة مجانية" : "Free Sample",
                      description: language === "ar" ? "من أي منتج" : "From any product",
                    },
                    {
                      points: 1500,
                      reward: language === "ar" ? "خصم 250 جنيه" : "250 EGP Discount",
                      description: language === "ar" ? "على الطلبات فوق 1000 جنيه" : "On orders over 1000 EGP",
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="p-6 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors border border-slate-600"
                    >
                      <p className="text-2xl font-bold text-purple-400 mb-2">{item.points}</p>
                      <p className="text-sm text-slate-400 mb-3">{language === "ar" ? "نقطة" : "points"}</p>
                      <h4 className="text-lg font-bold text-white mb-2">{item.reward}</h4>
                      <p className="text-sm text-slate-400 mb-4">{item.description}</p>
                      <Button
                        className={`w-full ${currentPoints >= item.points
                          ? "bg-purple-600 hover:bg-purple-700"
                          : "bg-slate-600 hover:bg-slate-600 cursor-not-allowed opacity-50"
                          }`}
                        disabled={currentPoints < item.points}
                      >
                        {currentPoints >= item.points
                          ? language === "ar"
                            ? "استبدل الآن"
                            : "Redeem Now"
                          : language === "ar"
                            ? "غير كافٍ"
                            : "Insufficient"}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Tips Section */}
        <Card className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 border-0">
          <CardContent className="p-8">
            <h3 className="text-2xl font-bold text-white mb-4">
              {language === "ar" ? "نصائح لكسب نقاط أكثر" : "Tips to Earn More Points"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-white">
              <div>
                <p className="font-bold mb-2">✓ {language === "ar" ? "قيم المنتجات" : "Review Products"}</p>
                <p className="text-sm text-slate-100">
                  {language === "ar" ? "احصل على 50 نقطة لكل تقييم موثوق" : "Get 50 points for each verified review"}
                </p>
              </div>
              <div>
                <p className="font-bold mb-2">✓ {language === "ar" ? "شارك مع الأصدقاء" : "Share with Friends"}</p>
                <p className="text-sm text-slate-100">
                  {language === "ar"
                    ? "احصل على 100 نقطة لكل صديق يشتري"
                    : "Get 100 points for each friend who purchases"}
                </p>
              </div>
              <div>
                <p className="font-bold mb-2">✓ {language === "ar" ? "اشترِ أكثر" : "Shop More"}</p>
                <p className="text-sm text-slate-100">
                  {language === "ar"
                    ? "استمتع برسوم متضاعفة للمستويات العليا"
                    : "Enjoy multiplied rates for higher tiers"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
