"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Star, ArrowLeft, Download, Share2 } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { getTemplateBySlug, addTemplateRating, getTemplateRatings } from "@/lib/editor/services/template-service"
import { Template, TemplateRating } from "@/lib/editor/types/template"
import Link from "next/link"

export default function TemplateDetailPage() {
  const { language } = useLanguage()
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [template, setTemplate] = useState<Template | null>(null)
  const [ratings, setRatings] = useState<TemplateRating[]>([])
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadTemplate()
  }, [slug])

  useEffect(() => {
    if (template) {
      loadRatings(template.id).catch(console.error)
    }
  }, [template])

  const loadTemplate = async () => {
    try {
      const data = await getTemplateBySlug(slug)
      setTemplate(data)
    } catch (error) {
      console.error("Error loading template:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadRatings = async (templateId: string) => {
    try {
      const data = await getTemplateRatings(templateId)
      setRatings(data)
    } catch (error) {
      console.error("Error loading ratings:", error)
    }
  }

  const handleUseTemplate = () => {
    if (template) {
      router.push(`/editor?templateId=${template.id}`)
    }
  }

  const handleSubmitRating = async () => {
    if (!template || rating === 0) {
      alert(language === "ar" ? "يرجى اختيار تقييم" : "Please select a rating")
      return
    }

    setSubmitting(true)
    try {
      await addTemplateRating(template.id, rating, comment)
      setRating(0)
      setComment("")
      await loadRatings(template.id)
      await loadTemplate() // Refresh to update avgRating
      alert(language === "ar" ? "تم إضافة التقييم بنجاح" : "Rating added successfully")
    } catch (error: any) {
      alert(language === "ar" ? `خطأ: ${error.message}` : `Error: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">
          {language === "ar" ? "جارٍ التحميل..." : "Loading..."}
        </p>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">
            {language === "ar" ? "القالب غير موجود" : "Template not found"}
          </p>
          <Link href="/templates">
            <Button variant="outline">
              {language === "ar" ? "العودة للقوالب" : "Back to Templates"}
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Link href="/templates">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {language === "ar" ? "العودة" : "Back"}
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Preview */}
            <Card>
              <CardHeader>
                <div className="aspect-video bg-slate-200 rounded-lg overflow-hidden">
                  {template.thumbnailUrl ? (
                    <img
                      src={template.thumbnailUrl}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      {language === "ar" ? "معاينة" : "Preview"}
                    </div>
                  )}
                </div>
              </CardHeader>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>{template.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 mb-4">{template.description}</p>
                <div className="flex gap-2 flex-wrap">
                  <Badge>{template.category}</Badge>
                  <Badge variant="outline">{template.style}</Badge>
                  {template.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Ratings/Reviews */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === "ar" ? "التقييمات والمراجعات" : "Ratings & Reviews"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Average Rating */}
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold">{template.avgRating.toFixed(1)}</div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-5 w-5 ${star <= Math.round(template.avgRating)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-slate-300"
                            }`}
                        />
                      ))}
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      {template.ratingsCount}{" "}
                      {language === "ar" ? "تقييم" : "ratings"}
                    </div>
                  </div>
                </div>

                {/* Add Rating */}
                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">
                    {language === "ar" ? "أضف تقييمك" : "Add Your Rating"}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        {language === "ar" ? "التقييم" : "Rating"}
                      </label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            className="focus:outline-none"
                          >
                            <Star
                              className={`h-6 w-6 ${star <= rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-slate-300 hover:text-yellow-300"
                                } transition-colors`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        {language === "ar" ? "تعليق" : "Comment"} (اختياري)
                      </label>
                      <Textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder={
                          language === "ar"
                            ? "اكتب تعليقك هنا..."
                            : "Write your comment here..."
                        }
                        rows={3}
                      />
                    </div>
                    <Button
                      onClick={handleSubmitRating}
                      disabled={submitting || rating === 0}
                      className="w-full"
                    >
                      {submitting
                        ? language === "ar"
                          ? "جارٍ الإرسال..."
                          : "Submitting..."
                        : language === "ar"
                          ? "إرسال التقييم"
                          : "Submit Rating"}
                    </Button>
                  </div>
                </div>

                {/* Reviews List */}
                {ratings.length > 0 && (
                  <div className="border-t pt-6 space-y-4">
                    <h3 className="font-semibold">
                      {language === "ar" ? "المراجعات" : "Reviews"}
                    </h3>
                    {ratings.map((r) => (
                      <div key={r.id} className="border-b pb-4 last:border-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium">{r.userName || "Anonymous"}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(r.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${star <= r.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-slate-300"
                                  }`}
                              />
                            ))}
                          </div>
                        </div>
                        {r.comment && <p className="text-sm text-slate-600 mt-2">{r.comment}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === "ar" ? "معلومات القالب" : "Template Info"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">
                    {language === "ar" ? "الفئة" : "Category"}
                  </p>
                  <Badge>{template.category}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">
                    {language === "ar" ? "النمط" : "Style"}
                  </p>
                  <Badge variant="outline">{template.style}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">
                    {language === "ar" ? "التقييم" : "Rating"}
                  </p>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{template.avgRating.toFixed(1)}</span>
                    <span className="text-sm text-slate-500">
                      ({template.ratingsCount})
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">
                    {language === "ar" ? "تاريخ الإنشاء" : "Created"}
                  </p>
                  <p className="text-sm">
                    {new Date(template.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Button
                onClick={handleUseTemplate}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                size="lg"
              >
                {language === "ar" ? "استخدام هذا القالب" : "Use This Template"}
              </Button>
              <Button variant="outline" className="w-full" size="lg">
                <Download className="h-4 w-4 mr-2" />
                {language === "ar" ? "تحميل" : "Download"}
              </Button>
              <Button variant="outline" className="w-full" size="lg">
                <Share2 className="h-4 w-4 mr-2" />
                {language === "ar" ? "مشاركة" : "Share"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

