"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/providers/language-provider"
import { Star, ThumbsUp, MessageSquare, Search } from "lucide-react"

interface Review {
  id: string
  productName: string
  productId: number
  rating: number
  title: string
  comment: string
  author: string
  date: Date
  verified: boolean
  helpful: number
  images?: string[]
  status: "approved" | "pending" | "rejected"
}

export default function ReviewsPage() {
  const { language } = useLanguage()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterRating, setFilterRating] = useState<number | "all">("all")
  const [filterStatus, setFilterStatus] = useState<"all" | "approved" | "pending">("approved")
  const [sortBy, setSortBy] = useState<"recent" | "helpful" | "rating">("recent")

  const [reviews] = useState<Review[]>([
    {
      id: "1",
      productName: language === "ar" ? "علب بيتزا كرتونية" : "Pizza Boxes",
      productId: 1,
      rating: 5,
      title: language === "ar" ? "جودة ممتازة" : "Excellent Quality",
      comment:
        language === "ar"
          ? "علب بيتزا عالية الجودة جداً. الطباعة واضحة والمتانة ممتازة. توصيل سريع. سأطلب مرة أخرى بالتأكيد."
          : "Excellent quality pizza boxes. Print is very clear and durability is great. Fast delivery. Will order again definitely.",
      author: language === "ar" ? "أحمد محمد" : "Ahmad Mohammed",
      date: new Date("2024-01-20"),
      verified: true,
      helpful: 23,
      status: "approved",
    },
    {
      id: "2",
      productName: language === "ar" ? "أكواب ورقية ساخنة" : "Hot Paper Cups",
      productId: 2,
      rating: 4,
      title: language === "ar" ? "جيد جداً" : "Very Good",
      comment:
        language === "ar"
          ? "الأكواب جيدة لكن التسليم كان متأخر قليلاً. الجودة عالية والسعر مناسب."
          : "Good cups but delivery was a bit late. High quality and reasonable price.",
      author: language === "ar" ? "فاطمة علي" : "Fatima Ali",
      date: new Date("2024-01-18"),
      verified: true,
      helpful: 15,
      status: "approved",
    },
    {
      id: "3",
      productName: language === "ar" ? "أكياس ورق كرافت" : "Kraft Paper Bags",
      productId: 3,
      rating: 5,
      title: language === "ar" ? "منتج ممتاز وخدمة رائعة" : "Excellent Product and Service",
      comment:
        language === "ar"
          ? "أفضل من المتوقع! الأكياس قوية جداً والتصميم احترافي. دعم العملاء رائع جداً."
          : "Better than expected! Very strong bags and professional design. Excellent customer support.",
      author: language === "ar" ? "محمود حسن" : "Mahmoud Hassan",
      date: new Date("2024-01-15"),
      verified: true,
      helpful: 34,
      status: "approved",
    },
    {
      id: "4",
      productName: language === "ar" ? "علب برجر كرتونية" : "Burger Boxes",
      productId: 4,
      rating: 3,
      title: language === "ar" ? "مقبول لكن يحتاج تحسن" : "Acceptable but Needs Improvement",
      comment:
        language === "ar"
          ? "الكمية صحيحة لكن جودة الطباعة كان فيها بعض المشاكل. أتوقع أفضل من هذا."
          : "Correct quantity but printing had some issues. Expected better quality.",
      author: language === "ar" ? "سارة أحمد" : "Sarah Ahmed",
      date: new Date("2024-01-12"),
      verified: true,
      helpful: 8,
      status: "approved",
    },
    {
      id: "5",
      productName: language === "ar" ? "أكواس بلاستيك" : "Plastic Cups",
      productId: 5,
      rating: 4,
      title: language === "ar" ? "جودة جيدة" : "Good Quality",
      comment:
        language === "ar"
          ? "الأكواس آمنة وعملية. المظهر احترافي والسعر تنافسي جداً. يستحق الشراء."
          : "Safe and practical cups. Professional appearance and very competitive price. Worth buying.",
      author: language === "ar" ? "علي كريم" : "Ali Kareem",
      date: new Date("2024-01-10"),
      verified: true,
      helpful: 19,
      status: "approved",
    },
  ])

  const filteredReviews = reviews
    .filter((review) => {
      const matchSearch =
        review.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.author.toLowerCase().includes(searchTerm.toLowerCase())

      const matchRating = filterRating === "all" || review.rating === filterRating
      const matchStatus = filterStatus === "all" || review.status === filterStatus

      return matchSearch && matchRating && matchStatus
    })
    .sort((a, b) => {
      if (sortBy === "recent") return new Date(b.date).getTime() - new Date(a.date).getTime()
      if (sortBy === "helpful") return b.helpful - a.helpful
      if (sortBy === "rating") return b.rating - a.rating
      return 0
    })

  const averageRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
  const ratingDistribution = [
    { stars: 5, count: reviews.filter((r) => r.rating === 5).length },
    { stars: 4, count: reviews.filter((r) => r.rating === 4).length },
    { stars: 3, count: reviews.filter((r) => r.rating === 3).length },
    { stars: 2, count: reviews.filter((r) => r.rating === 2).length },
    { stars: 1, count: reviews.filter((r) => r.rating === 1).length },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            {language === "ar" ? "تقييمات العملاء" : "Customer Reviews"}
          </h1>
          <p className="text-slate-600">
            {language === "ar"
              ? "اقرأ آراء العملاء حول منتجاتنا وخدماتنا"
              : "Read customer opinions about our products and services"}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-5xl font-bold text-yellow-500 mb-2">{averageRating}</div>
                <div className="flex justify-center mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${i < Math.floor(Number(averageRating)) ? "text-yellow-500 fill-current" : "text-gray-300"}`}
                    />
                  ))}
                </div>
                <p className="text-slate-600">
                  {language === "ar" ? "من" : "out of"} {reviews.length} {language === "ar" ? "تقييم" : "reviews"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-slate-900 mb-4">
                {language === "ar" ? "توزيع التقييمات" : "Rating Distribution"}
              </h3>
              <div className="space-y-2">
                {ratingDistribution.reverse().map((item) => (
                  <div key={item.stars} className="flex items-center">
                    <span className="text-sm font-medium text-slate-600 w-8">{item.stars}★</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full mx-2 overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 rounded-full"
                        style={{ width: `${(item.count / reviews.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-600 w-8">{item.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-slate-900 mb-4">{language === "ar" ? "الإحصائيات" : "Statistics"}</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-slate-600">
                    {language === "ar" ? "التقييمات الموثقة" : "Verified Reviews"}
                  </p>
                  <p className="text-2xl font-bold text-green-600">{reviews.filter((r) => r.verified).length}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">{language === "ar" ? "متوسط الفائدة" : "Avg. Helpfulness"}</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {Math.round(reviews.reduce((sum, r) => sum + r.helpful, 0) / reviews.length)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-900 block mb-2">
                  {language === "ar" ? "البحث" : "Search"}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder={language === "ar" ? "ابحث في التقييمات" : "Search reviews..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-900 block mb-2">
                  {language === "ar" ? "التقييم" : "Rating"}
                </label>
                <Select
                  value={filterRating.toString()}
                  onValueChange={(v) => setFilterRating(v === "all" ? "all" : Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === "ar" ? "الكل" : "All"}</SelectItem>
                    <SelectItem value="5">★★★★★ 5</SelectItem>
                    <SelectItem value="4">★★★★ 4</SelectItem>
                    <SelectItem value="3">★★★ 3</SelectItem>
                    <SelectItem value="2">★★ 2</SelectItem>
                    <SelectItem value="1">★ 1</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-900 block mb-2">
                  {language === "ar" ? "الحالة" : "Status"}
                </label>
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as "all" | "approved" | "pending")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === "ar" ? "الكل" : "All"}</SelectItem>
                    <SelectItem value="approved">{language === "ar" ? "موثوق" : "Verified"}</SelectItem>
                    <SelectItem value="pending">{language === "ar" ? "قيد المراجعة" : "Pending"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-900 block mb-2">
                  {language === "ar" ? "الترتيب" : "Sort By"}
                </label>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as "recent" | "helpful" | "rating")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">{language === "ar" ? "الأحدث" : "Most Recent"}</SelectItem>
                    <SelectItem value="helpful">{language === "ar" ? "الأكثر فائدة" : "Most Helpful"}</SelectItem>
                    <SelectItem value="rating">{language === "ar" ? "الأعلى تقييماً" : "Highest Rated"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reviews List */}
        <div className="space-y-4">
          {filteredReviews.length > 0 ? (
            filteredReviews.map((review) => (
              <Card key={review.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-slate-900">{review.title}</h3>
                          {review.verified && (
                            <Badge className="bg-green-100 text-green-800">
                              {language === "ar" ? "موثوق" : "Verified"}
                            </Badge>
                          )}
                          {review.status === "pending" && (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              {language === "ar" ? "قيد المراجعة" : "Pending"}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${i < review.rating ? "text-yellow-500 fill-current" : "text-gray-300"
                                  }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-slate-600">
                            {review.author} • {review.date.toLocaleDateString(language === "ar" ? "ar-SA" : "en-US")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div>
                      <p className="text-slate-700 mb-2">{review.comment}</p>
                      <p className="text-sm text-slate-500">
                        {language === "ar" ? "المنتج:" : "Product:"}{" "}
                        <span className="font-medium">{review.productName}</span>
                      </p>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                      <div className="flex items-center gap-4">
                        <button className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
                          <ThumbsUp className="w-4 h-4" />
                          <span className="text-sm">{review.helpful}</span>
                        </button>
                        <button className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
                          <MessageSquare className="w-4 h-4" />
                          <span className="text-sm">{language === "ar" ? "رد" : "Reply"}</span>
                        </button>
                      </div>
                      <Button variant="outline" size="sm">
                        {language === "ar" ? "إبلاغ" : "Report"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">{language === "ar" ? "لا توجد تقييمات" : "No reviews found"}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
