"use client"

import { useState, useEffect } from "react"
import { ProjectService } from "@/lib/projects/project-service"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Star, Download } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { ProjectTemplate } from "@/lib/projects/types"
import Link from "next/link"

export function ProjectTemplates() {
  const { language } = useLanguage()
  const projectService = new ProjectService()
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [category, setCategory] = useState<string>("all")

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    // In production, fetch from API
    // const templates = await projectService.getTemplates()
    // For now, use mock data
    setTemplates([])
  }

  const filteredTemplates = templates.filter((template) => {
    if (category !== "all" && template.category !== category) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        template.name.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query) ||
        template.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder={language === "ar" ? "ابحث في القوالب..." : "Search templates..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {language === "ar" ? "الكل" : "All Categories"}
            </SelectItem>
            <SelectItem value="packaging">Packaging</SelectItem>
            <SelectItem value="boxes">Boxes</SelectItem>
            <SelectItem value="labels">Labels</SelectItem>
            <SelectItem value="bags">Bags</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-0">
              <div className="relative">
                {template.thumbnailUrl ? (
                  <img
                    src={template.thumbnailUrl}
                    alt={template.name}
                    className="w-full h-32 object-cover rounded-t-lg"
                  />
                ) : (
                  <div className="w-full h-32 bg-slate-200 rounded-t-lg flex items-center justify-center">
                    <span className="text-slate-400">Template</span>
                  </div>
                )}
                {template.isPremium && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-yellow-500">Premium</Badge>
                  </div>
                )}
                {template.rating && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 text-white px-2 py-1 rounded text-xs">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>{template.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-sm mb-1">{template.name}</h3>
                {template.description && (
                  <p className="text-xs text-slate-500 mb-2 line-clamp-2">{template.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {template.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/projects/new?template=${template.id}`}>
                      {language === "ar" ? "استخدام" : "Use"}
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500">
            {language === "ar" ? "لا توجد قوالب" : "No templates found"}
          </p>
        </div>
      )}
    </div>
  )
}

