"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ArrowRight, Download, Share2 } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { useToast } from "@/hooks/use-toast"
import { getTemplateBySlug } from "@/lib/editor/services/template-service"
import { Template } from "@/lib/editor/types/template"
import Link from "next/link"

export default function TemplateDetailPage() {
  const { language, isRTL } = useLanguage()
  const { toast } = useToast()
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTemplate()
  }, [slug])

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

  const handleUseTemplate = () => {
    if (template) {
      router.push(`/editor?templateId=${template.id}`)
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
            {isRTL ? <ArrowRight className="h-4 w-4 ml-2" /> : <ArrowLeft className="h-4 w-4 mr-2" />}
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
                    {language === "ar" ? "تاريخ الإنشاء" : "Created"}
                  </p>
                  <p className="text-sm">
                    {new Date(template.createdAt).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US")}
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
                <Download className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                {language === "ar" ? "تحميل" : "Download"}
              </Button>
              <Button variant="outline" className="w-full" size="lg">
                <Share2 className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                {language === "ar" ? "مشاركة" : "Share"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

