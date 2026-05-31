"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Sparkles, Filter } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { api } from "@/lib/api"

interface Template {
  id: string
  name: string
  description?: string
  category: string
  thumbnail: string
  designData: any
  productType: string
  boxType?: string
  tags: string[]
  usageCount: number
}

interface TemplateLibraryProps {
  onSelectTemplate: (template: Template) => void
  productType?: string
}

export function TemplateLibrary({ onSelectTemplate, productType }: TemplateLibraryProps) {
  const { language, t } = useLanguage()
  const [templates, setTemplates] = useState<Template[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  const categories = [
    { value: "all", label: language === "ar" ? "الكل" : "All" },
    { value: "business", label: language === "ar" ? "أعمال" : "Business" },
    { value: "event", label: language === "ar" ? "مناسبات" : "Event" },
    { value: "celebration", label: language === "ar" ? "احتفالي" : "Celebration" },
    { value: "industry-specific", label: language === "ar" ? "خاص بالصناعة" : "Industry" },
  ]

  useEffect(() => {
    loadTemplates()
  }, [productType])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const response = await api.get("/templates", {
        params: {
          productType: productType,
          isPublic: true,
        },
      })
      setTemplates(response.data || [])
      setFilteredTemplates(response.data || [])
    } catch (error) {
      console.error("Failed to load templates:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let filtered = templates

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((t) => t.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Filter by product type
    if (productType) {
      filtered = filtered.filter((t) => !t.productType || t.productType === productType)
    }

    setFilteredTemplates(filtered)
  }, [templates, selectedCategory, searchQuery, productType])

  const handleApplyTemplate = (template: Template) => {
    onSelectTemplate(template)
  }

  if (loading) {
    return (
      <div className="p-4 text-center text-slate-500">
        {language === "ar" ? "جاري تحميل القوالب..." : "Loading templates..."}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={language === "ar" ? "بحث في القوالب..." : "Search templates..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
        {filteredTemplates.length === 0 ? (
          <div className="col-span-2 text-center text-slate-500 py-8">
            {language === "ar" ? "لا توجد قوالب" : "No templates found"}
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleApplyTemplate(template)}
            >
              <CardContent className="p-3">
                <div className="aspect-square bg-slate-100 rounded mb-2 flex items-center justify-center">
                  {template.thumbnail ? (
                    <img
                      src={template.thumbnail}
                      alt={template.name}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <Sparkles className="h-8 w-8 text-slate-400" />
                  )}
                </div>
                <h4 className="text-sm font-semibold mb-1 truncate">{template.name}</h4>
                {template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

