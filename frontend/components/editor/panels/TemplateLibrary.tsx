"use client"

import { useState, useMemo } from "react"
import { useDesignStore } from "@/lib/editor/state/store"
import { useLanguage } from "@/providers/language-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Search,
  Package,
  Loader2,
  Check,
  LayoutTemplate,
} from "lucide-react"
import { TEMPLATES, TEMPLATE_CATEGORIES, getTemplatesByCategory, searchTemplates, Template } from "@/lib/editor/data/templates-data"

// Map categories for the UI
const CATEGORIES = TEMPLATE_CATEGORIES

// Legacy templates kept for backward compatibility (merged into TEMPLATES now)
const LEGACY_TEMPLATES = [
  {
    id: "modern-minimal",
    name: { en: "Modern Minimal", ar: "عصري بسيط" },
    category: "minimal",
    description: { en: "Clean design with bold typography", ar: "تصميم نظيف مع خطوط عريضة" },
    thumbnail: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 150'%3E%3Crect fill='%23f8fafc' width='200' height='150'/%3E%3Crect x='40' y='50' width='120' height='8' fill='%23334155' rx='2'/%3E%3Crect x='60' y='70' width='80' height='4' fill='%2394a3b8' rx='1'/%3E%3Crect x='70' y='90' width='60' height='30' fill='%23e2e8f0' rx='4'/%3E%3C/svg%3E",
    tags: ["clean", "simple", "professional"],
    style: "modern",
    layers: [
      {
        type: "text",
        name: "Brand Name",
        textProperties: {
          content: "BRAND",
          fontFamily: "Inter",
          fontSize: 48,
          fontWeight: 700,
          align: "center",
          color: "#1e293b",
          lineHeight: 1.2,
          letterSpacing: 4,
        },
        position: { x: 400, y: 150 },
      },
      {
        type: "text",
        name: "Tagline",
        textProperties: {
          content: "Premium Quality",
          fontFamily: "Inter",
          fontSize: 16,
          fontWeight: 400,
          align: "center",
          color: "#64748b",
          lineHeight: 1.5,
          letterSpacing: 2,
        },
        position: { x: 400, y: 200 },
      },
    ],
  },
  {
    id: "eco-nature",
    name: { en: "Eco Nature", ar: "طبيعي صديق للبيئة" },
    category: "eco",
    description: { en: "Nature-inspired sustainable design", ar: "تصميم مستدام مستوحى من الطبيعة" },
    thumbnail: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 150'%3E%3Crect fill='%23ecfdf5' width='200' height='150'/%3E%3Ccircle cx='100' cy='60' r='25' fill='%2310b981' opacity='0.3'/%3E%3Cpath d='M100 45 L100 75 M90 55 L100 45 L110 55' stroke='%23059669' stroke-width='3' fill='none'/%3E%3Crect x='50' y='95' width='100' height='6' fill='%23047857' rx='2'/%3E%3Crect x='70' y='110' width='60' height='3' fill='%2310b981' rx='1'/%3E%3C/svg%3E",
    tags: ["eco", "green", "sustainable", "nature"],
    style: "eco",
    layers: [
      {
        type: "shape",
        name: "Leaf Icon BG",
        shapeProperties: {
          shape: "circle",
          fill: "#dcfce7",
          stroke: "#22c55e",
          strokeWidth: 2,
        },
        position: { x: 400, y: 120 },
        scale: { x: 0.8, y: 0.8 },
      },
      {
        type: "text",
        name: "Eco Brand",
        textProperties: {
          content: "NATURAL",
          fontFamily: "Montserrat",
          fontSize: 36,
          fontWeight: 600,
          align: "center",
          color: "#166534",
          lineHeight: 1.2,
          letterSpacing: 6,
        },
        position: { x: 400, y: 220 },
      },
    ],
  },
  {
    id: "luxury-gold",
    name: { en: "Luxury Gold", ar: "ذهبي فاخر" },
    category: "luxury",
    description: { en: "Elegant gold accent design", ar: "تصميم أنيق بلمسات ذهبية" },
    thumbnail: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 150'%3E%3Crect fill='%231e1e1e' width='200' height='150'/%3E%3Crect x='30' y='30' width='140' height='90' fill='none' stroke='%23d4af37' stroke-width='2'/%3E%3Crect x='60' y='60' width='80' height='6' fill='%23d4af37' rx='1'/%3E%3Crect x='70' y='80' width='60' height='3' fill='%23a08029' rx='1'/%3E%3C/svg%3E",
    tags: ["luxury", "gold", "elegant", "premium"],
    style: "luxury",
    layers: [
      {
        type: "shape",
        name: "Border",
        shapeProperties: {
          shape: "rect",
          fill: "transparent",
          stroke: "#d4af37",
          strokeWidth: 2,
        },
        position: { x: 400, y: 150 },
        scale: { x: 3, y: 2 },
      },
      {
        type: "text",
        name: "Luxury Name",
        textProperties: {
          content: "PRESTIGE",
          fontFamily: "Playfair Display",
          fontSize: 42,
          fontWeight: 400,
          align: "center",
          color: "#d4af37",
          lineHeight: 1.2,
          letterSpacing: 8,
        },
        position: { x: 400, y: 150 },
      },
    ],
  },
  {
    id: "coffee-shop",
    name: { en: "Coffee Shop", ar: "مقهى" },
    category: "food",
    description: { en: "Warm coffee shop branding", ar: "تصميم دافئ للمقاهي" },
    thumbnail: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 150'%3E%3Crect fill='%23fef3c7' width='200' height='150'/%3E%3Ccircle cx='100' cy='65' r='30' fill='%2392400e' opacity='0.2'/%3E%3Crect x='85' y='50' width='30' height='35' fill='%23451a03' rx='3'/%3E%3Crect x='80' y='45' width='40' height='8' fill='%2378350f' rx='2'/%3E%3Crect x='50' y='105' width='100' height='6' fill='%23451a03' rx='2'/%3E%3C/svg%3E",
    tags: ["coffee", "cafe", "warm", "cozy"],
    style: "warm",
    layers: [
      {
        type: "text",
        name: "Coffee Brand",
        textProperties: {
          content: "COFFEE CO.",
          fontFamily: "Merriweather",
          fontSize: 32,
          fontWeight: 700,
          align: "center",
          color: "#451a03",
          lineHeight: 1.3,
          letterSpacing: 2,
        },
        position: { x: 400, y: 180 },
      },
      {
        type: "text",
        name: "Est Date",
        textProperties: {
          content: "Est. 2024",
          fontFamily: "Inter",
          fontSize: 12,
          fontWeight: 400,
          align: "center",
          color: "#78350f",
          lineHeight: 1.5,
          letterSpacing: 4,
        },
        position: { x: 400, y: 220 },
      },
    ],
  },
  {
    id: "fashion-bold",
    name: { en: "Fashion Bold", ar: "أزياء جريئة" },
    category: "fashion",
    description: { en: "Bold fashion statement", ar: "بيان أزياء جريء" },
    thumbnail: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 150'%3E%3Crect fill='%23ffffff' width='200' height='150'/%3E%3Crect x='20' y='60' width='160' height='30' fill='%23000000'/%3E%3Ctext x='100' y='82' font-size='18' fill='white' text-anchor='middle' font-family='sans-serif' font-weight='bold'>STYLE</text>%3C/svg%3E",
    tags: ["fashion", "bold", "trendy", "stylish"],
    style: "bold",
    layers: [
      {
        type: "shape",
        name: "Black Bar",
        shapeProperties: {
          shape: "rect",
          fill: "#000000",
          stroke: "",
          strokeWidth: 0,
        },
        position: { x: 400, y: 150 },
        scale: { x: 4, y: 0.6 },
      },
      {
        type: "text",
        name: "Fashion Name",
        textProperties: {
          content: "STYLE",
          fontFamily: "Oswald",
          fontSize: 48,
          fontWeight: 700,
          align: "center",
          color: "#ffffff",
          lineHeight: 1,
          letterSpacing: 12,
        },
        position: { x: 400, y: 150 },
      },
    ],
  },
  {
    id: "cosmetics-elegant",
    name: { en: "Cosmetics Elegant", ar: "مستحضرات أنيقة" },
    category: "cosmetics",
    description: { en: "Soft elegant beauty design", ar: "تصميم جمال ناعم وأنيق" },
    thumbnail: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 150'%3E%3Crect fill='%23fdf4ff' width='200' height='150'/%3E%3Ccircle cx='100' cy='70' r='20' fill='%23f0abfc' opacity='0.5'/%3E%3Ccircle cx='85' cy='75' r='15' fill='%23e879f9' opacity='0.3'/%3E%3Crect x='50' y='105' width='100' height='5' fill='%23a855f7' rx='2'/%3E%3Crect x='65' y='118' width='70' height='3' fill='%23d8b4fe' rx='1'/%3E%3C/svg%3E",
    tags: ["beauty", "cosmetics", "elegant", "soft"],
    style: "elegant",
    layers: [
      {
        type: "text",
        name: "Beauty Brand",
        textProperties: {
          content: "BEAUTY",
          fontFamily: "Playfair Display",
          fontSize: 36,
          fontWeight: 400,
          align: "center",
          color: "#7c3aed",
          lineHeight: 1.2,
          letterSpacing: 6,
        },
        position: { x: 400, y: 160 },
      },
      {
        type: "text",
        name: "Subtitle",
        textProperties: {
          content: "skincare collection",
          fontFamily: "Inter",
          fontSize: 14,
          fontWeight: 300,
          align: "center",
          color: "#a78bfa",
          lineHeight: 1.5,
          letterSpacing: 3,
        },
        position: { x: 400, y: 200 },
      },
    ],
  },
]

export function TemplateLibrary() {
  const { language } = useLanguage()
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)

  const addLayer = useDesignStore((s) => s.addLayer)
  const selectedFace = useDesignStore((s) => s.ui.selectedFace)
  const applyCoreState = useDesignStore((s) => s.applyCoreState)

  const filteredTemplates = useMemo(() => {
    if (search) {
      return searchTemplates(search).filter(t => 
        selectedCategory === "all" || t.category === selectedCategory
      )
    }
    return getTemplatesByCategory(selectedCategory)
  }, [search, selectedCategory])

  const applyTemplate = async (template: Template) => {
    setApplyingId(template.id)

    // Clear existing layers for current face and add template layers
    applyCoreState((core) => {
      // Remove layers from current face
      const otherLayers = core.layers.filter((l) => l.faceId !== selectedFace)

      // Add template layers
      const newLayers = template.layers.map((layer, idx) => ({
        id: `template-${template.id}-${idx}-${Date.now()}`,
        type: layer.type as any,
        name: layer.name,
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: "normal" as const,
        position: layer.position || { x: 400, y: 150 },
        rotation: 0,
        scale: layer.scale || { x: 1, y: 1 },
        faceId: selectedFace,
        textProperties: layer.textProperties,
        shapeProperties: layer.shapeProperties,
        imageProperties: layer.imageProperties,
      }))

      return {
        ...core,
        layers: [...otherLayers, ...newLayers],
      }
    })

    // Simulate loading
    await new Promise((resolve) => setTimeout(resolve, 500))
    setApplyingId(null)
    setPreviewTemplate(null)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-semibold">
            {language === "ar" ? "مكتبة القوالب" : "Template Library"}
          </h3>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder={language === "ar" ? "بحث..." : "Search templates..."}
            className="pl-8 text-xs h-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.slice(0, 8).map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "secondary" : "ghost"}
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => setSelectedCategory(category.id)}
            >
              <span className="mr-1">{category.icon}</span>
              {language === "ar" ? category.name.ar : category.name.en}
            </Button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <ScrollArea className="flex-1">
        <div className="p-4 grid grid-cols-2 gap-3">
          {filteredTemplates.map((template) => (
            <Dialog key={template.id}>
              <DialogTrigger asChild>
                <button
                  className="group relative rounded-lg overflow-hidden border border-slate-200 hover:border-slate-400 hover:shadow-lg transition-all bg-white"
                  onClick={() => setPreviewTemplate(template)}
                >
                  {/* Thumbnail */}
                  <div className="aspect-[4/3] bg-slate-50">
                    <img
                      src={template.thumbnail}
                      alt={template.name.en}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="p-2 text-left">
                    <h4 className="text-xs font-semibold truncate">
                      {language === "ar" ? template.name.ar : template.name.en}
                    </h4>
                    <p className="text-[10px] text-slate-500 truncate">
                      {language === "ar" ? template.description.ar : template.description.en}
                    </p>
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {language === "ar" ? "معاينة" : "Preview"}
                    </span>
                  </div>
                </button>
              </DialogTrigger>

              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {language === "ar" ? template.name.ar : template.name.en}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Large Preview */}
                  <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden border">
                    <img
                      src={template.thumbnail}
                      alt={template.name.en}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Description */}
                  <p className="text-sm text-slate-600">
                    {language === "ar" ? template.description.ar : template.description.en}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {template.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Apply Button */}
                  <Button
                    onClick={() => applyTemplate(template)}
                    disabled={applyingId === template.id}
                    className="w-full"
                  >
                    {applyingId === template.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {language === "ar" ? "جارٍ التطبيق..." : "Applying..."}
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        {language === "ar" ? "تطبيق القالب" : "Apply Template"}
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">
              {language === "ar" ? "لا توجد قوالب" : "No templates found"}
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
