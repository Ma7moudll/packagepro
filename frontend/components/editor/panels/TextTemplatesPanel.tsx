"use client"

import { useState, useMemo } from "react"
import { useDesignStore } from "@/lib/editor/state/store"
import { useLanguage } from "@/providers/language-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Type } from "lucide-react"
import {
  TEXT_TEMPLATE_CATEGORIES,
  TEXT_TEMPLATES,
  getTextTemplatesByCategory,
  searchTextTemplates,
  TextTemplate,
} from "@/lib/editor/data/text-templates-data"

export function TextTemplatesPanel() {
  const { language } = useLanguage()
  const addLayer = useDesignStore((s) => s.addLayer)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  // Get templates based on category and search
  const filteredTemplates = useMemo(() => {
    if (search) {
      return searchTextTemplates(search)
    }
    return getTextTemplatesByCategory(selectedCategory)
  }, [search, selectedCategory])

  // Add text template as layer
  const handleAddTemplate = (template: TextTemplate) => {
    addLayer({
      type: "text",
      name: template.name.en,
      textProperties: { ...template.textProperties },
      scale: { x: 1, y: 1 },
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Type className="h-4 w-4 text-slate-600" />
          {language === "ar" ? "قوالب النصوص" : "Text Templates"}
        </h3>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder={language === "ar" ? "بحث عن نص..." : "Search text templates..."}
            className="pl-8 text-xs h-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-1">
          {TEXT_TEMPLATE_CATEGORIES.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? "secondary" : "ghost"}
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => setSelectedCategory(cat.id)}
            >
              <span className="mr-1">{cat.icon}</span>
              {language === "ar" ? cat.name.ar : cat.name.en}
            </Button>
          ))}
        </div>
      </div>

      {/* Templates List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {filteredTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => handleAddTemplate(template)}
              className="w-full text-left p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-400 hover:shadow-md transition-all"
            >
              {/* Preview */}
              <div
                className="whitespace-pre-wrap mb-2"
                style={{
                  fontFamily: template.textProperties.fontFamily,
                  fontSize: Math.min(template.textProperties.fontSize, 16),
                  fontWeight: template.textProperties.fontWeight,
                  color: template.textProperties.color,
                  letterSpacing: template.textProperties.letterSpacing > 2 ? 2 : template.textProperties.letterSpacing,
                  lineHeight: template.textProperties.lineHeight,
                  textAlign: template.textProperties.align,
                }}
              >
                {template.preview}
              </div>

              {/* Label */}
              <p className="text-[10px] text-slate-500 truncate">
                {language === "ar" ? template.name.ar : template.name.en}
              </p>
            </button>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            <Type className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">
              {language === "ar" ? "لا توجد قوالب نصية" : "No text templates found"}
            </p>
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t bg-slate-50">
        <p className="text-[10px] text-slate-500 text-center">
          {filteredTemplates.length} {language === "ar" ? "قالب" : "templates"}
        </p>
      </div>
    </div>
  )
}
