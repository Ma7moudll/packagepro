"use client"

import { useState, useMemo } from "react"
import { useDesignStore } from "@/lib/editor/state/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { 
  Search, 
  Sparkles, 
  Palette, 
  Leaf, 
  Crown, 
  PartyPopper, 
  Briefcase, 
  UtensilsCrossed, 
  Shirt,
  CalendarDays,
  Check,
  Star,
  Lock
} from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { 
  PRESET_TEMPLATES, 
  getTemplatesForProduct, 
  getTemplatesByCategory,
  searchTemplates,
  PresetTemplate 
} from "@/lib/editor/templates/preset-templates"
import { Layer } from "@/lib/editor/state/types"
import { v4 as uuidv4 } from "uuid"

const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; name: string; nameAr: string }> = {
  all: { icon: <Sparkles className="h-4 w-4" />, name: "All", nameAr: "الكل" },
  minimalist: { icon: <Palette className="h-4 w-4" />, name: "Minimal", nameAr: "بسيط" },
  bold: { icon: <Star className="h-4 w-4" />, name: "Bold", nameAr: "جريء" },
  eco: { icon: <Leaf className="h-4 w-4" />, name: "Eco", nameAr: "صديق للبيئة" },
  luxury: { icon: <Crown className="h-4 w-4" />, name: "Luxury", nameAr: "فاخر" },
  playful: { icon: <PartyPopper className="h-4 w-4" />, name: "Playful", nameAr: "مرح" },
  corporate: { icon: <Briefcase className="h-4 w-4" />, name: "Corporate", nameAr: "شركات" },
  food: { icon: <UtensilsCrossed className="h-4 w-4" />, name: "Food", nameAr: "طعام" },
  fashion: { icon: <Shirt className="h-4 w-4" />, name: "Fashion", nameAr: "أزياء" },
  seasonal: { icon: <CalendarDays className="h-4 w-4" />, name: "Seasonal", nameAr: "موسمي" },
}

export function TemplatesPanel() {
  const { language } = useLanguage()
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [previewTemplate, setPreviewTemplate] = useState<PresetTemplate | null>(null)
  const [applyDialogOpen, setApplyDialogOpen] = useState(false)
  
  const addLayer = useDesignStore((s) => s.addLayer)
  const clearLayers = useDesignStore((s) => s.clearLayers)
  const model = useDesignStore((s) => s.model)
  const layers = useDesignStore((s) => s.layers)
  
  // Get product type from model
  const productType = model.type.replace(/_/g, "-")
  
  // Filter templates
  const filteredTemplates = useMemo(() => {
    let templates = PRESET_TEMPLATES
    
    // Filter by search
    if (search) {
      templates = searchTemplates(search)
    }
    
    // Filter by category
    if (selectedCategory !== "all") {
      templates = templates.filter(t => t.category === selectedCategory)
    }
    
    // Sort: product-compatible first, then by premium status
    templates = [...templates].sort((a, b) => {
      const aCompatible = a.productTypes.includes(productType) ? 1 : 0
      const bCompatible = b.productTypes.includes(productType) ? 1 : 0
      if (aCompatible !== bCompatible) return bCompatible - aCompatible
      if (a.isPremium !== b.isPremium) return a.isPremium ? 1 : -1
      return 0
    })
    
    return templates
  }, [search, selectedCategory, productType])
  
  // Get compatible templates count
  const compatibleCount = useMemo(() => {
    return getTemplatesForProduct(productType).length
  }, [productType])
  
  // Apply template to editor
  const applyTemplate = (template: PresetTemplate, replaceAll: boolean = false) => {
    if (replaceAll) {
      // Clear existing layers
      clearLayers()
    }
    
    // Add template layers with new IDs
    template.layers.forEach((layer) => {
      const newLayer: Omit<Layer, "id"> & { id?: string } = {
        ...layer,
        id: uuidv4(),
      }
      addLayer(newLayer as Layer)
    })
    
    setApplyDialogOpen(false)
    setPreviewTemplate(null)
  }
  
  const handleTemplateClick = (template: PresetTemplate) => {
    if (layers.length > 0) {
      setPreviewTemplate(template)
      setApplyDialogOpen(true)
    } else {
      applyTemplate(template)
    }
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-slate-100 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={language === "ar" ? "ابحث عن قوالب..." : "Search templates..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        
        {/* Compatible badge */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <Check className="h-3 w-3 mr-1" />
            {compatibleCount} {language === "ar" ? "قالب متوافق" : "compatible"}
          </Badge>
        </div>
      </div>
      
      {/* Category Tabs */}
      <div className="p-2 border-b border-slate-100">
        <ScrollArea className="w-full">
          <div className="flex gap-1 pb-1">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <Button
                key={key}
                variant={selectedCategory === key ? "default" : "ghost"}
                size="sm"
                className={`h-7 px-2.5 text-xs shrink-0 ${
                  selectedCategory === key 
                    ? "bg-emerald-600 hover:bg-emerald-700" 
                    : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setSelectedCategory(key)}
              >
                {config.icon}
                <span className="mr-1">{language === "ar" ? config.nameAr : config.name}</span>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>
      
      {/* Templates Grid */}
      <ScrollArea className="flex-1">
        <div className="p-3 grid grid-cols-2 gap-3">
          {filteredTemplates.map((template) => {
            const isCompatible = template.productTypes.includes(productType)
            
            return (
              <div
                key={template.id}
                onClick={() => handleTemplateClick(template)}
                className={`group relative rounded-lg border overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                  isCompatible 
                    ? "border-slate-200 hover:border-emerald-400" 
                    : "border-slate-100 opacity-60 hover:opacity-80"
                }`}
              >
                {/* Template Preview */}
                <div className="aspect-square bg-gradient-to-br from-slate-50 to-slate-100 relative">
                  {/* Render preview based on first few layers */}
                  <TemplatePreview template={template} />
                  
                  {/* Premium badge */}
                  {template.isPremium && (
                    <div className="absolute top-1.5 right-1.5">
                      <Badge className="bg-amber-500 text-white text-[9px] px-1 py-0 h-4">
                        <Crown className="h-2.5 w-2.5 mr-0.5" />
                        PRO
                      </Badge>
                    </div>
                  )}
                  
                  {/* Compatible badge */}
                  {isCompatible && (
                    <div className="absolute top-1.5 left-1.5">
                      <Badge className="bg-emerald-500 text-white text-[9px] px-1 py-0 h-4">
                        <Check className="h-2.5 w-2.5" />
                      </Badge>
                    </div>
                  )}
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-emerald-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="secondary" className="text-xs h-7">
                      {language === "ar" ? "تطبيق القالب" : "Apply Template"}
                    </Button>
                  </div>
                </div>
                
                {/* Template info */}
                <div className="p-2 bg-white border-t border-slate-100">
                  <h4 className="text-xs font-medium text-slate-900 truncate">
                    {language === "ar" ? template.nameAr : template.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    {language === "ar" ? template.descriptionAr : template.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Empty state */}
        {filteredTemplates.length === 0 && (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Search className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">
              {language === "ar" ? "لا توجد قوالب مطابقة" : "No matching templates"}
            </p>
          </div>
        )}
      </ScrollArea>
      
      {/* Apply Dialog */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === "ar" ? "تطبيق القالب" : "Apply Template"}
            </DialogTitle>
            <DialogDescription>
              {language === "ar" 
                ? "لديك طبقات موجودة. كيف تريد تطبيق هذا القالب؟"
                : "You have existing layers. How would you like to apply this template?"}
            </DialogDescription>
          </DialogHeader>
          
          {previewTemplate && (
            <div className="my-4 p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 overflow-hidden">
                  <TemplatePreview template={previewTemplate} />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">
                    {language === "ar" ? previewTemplate.nameAr : previewTemplate.name}
                  </h4>
                  <p className="text-sm text-slate-500">
                    {previewTemplate.layers.length} {language === "ar" ? "طبقات" : "layers"}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => previewTemplate && applyTemplate(previewTemplate, false)}
              className="flex-1"
            >
              {language === "ar" ? "إضافة للتصميم الحالي" : "Add to Current Design"}
            </Button>
            <Button
              onClick={() => previewTemplate && applyTemplate(previewTemplate, true)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {language === "ar" ? "استبدال الكل" : "Replace All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Simple template preview component
function TemplatePreview({ template }: { template: PresetTemplate }) {
  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
      {/* Render a simplified preview of the template */}
      {template.layers.slice(0, 5).map((layer, index) => {
        if (layer.type === "shape" && layer.shapeProperties) {
          const { shape, fill, stroke, strokeWidth } = layer.shapeProperties
          const { x, y } = layer.position
          const { x: scaleX, y: scaleY } = layer.scale
          
          // Scale down for preview
          const scale = 0.3
          const previewX = x * scale
          const previewY = y * scale
          const previewScaleX = scaleX * scale
          const previewScaleY = scaleY * scale
          
          if (shape === "rect") {
            return (
              <div
                key={index}
                style={{
                  position: "absolute",
                  left: `${previewX}px`,
                  top: `${previewY}px`,
                  width: `${previewScaleX}px`,
                  height: `${previewScaleY}px`,
                  backgroundColor: fill,
                  border: stroke !== "transparent" ? `${strokeWidth}px solid ${stroke}` : undefined,
                  borderRadius: layer.shapeProperties?.cornerRadius ? `${layer.shapeProperties.cornerRadius * scale}px` : undefined,
                  opacity: layer.opacity,
                }}
              />
            )
          }
          
          if (shape === "circle") {
            return (
              <div
                key={index}
                style={{
                  position: "absolute",
                  left: `${previewX - previewScaleX / 2}px`,
                  top: `${previewY - previewScaleY / 2}px`,
                  width: `${previewScaleX}px`,
                  height: `${previewScaleY}px`,
                  backgroundColor: fill,
                  border: stroke !== "transparent" ? `${strokeWidth}px solid ${stroke}` : undefined,
                  borderRadius: "50%",
                  opacity: layer.opacity,
                }}
              />
            )
          }
        }
        
        if (layer.type === "text" && layer.textProperties) {
          const { content, fontSize, fontWeight, color, fontFamily } = layer.textProperties
          const { x, y } = layer.position
          
          // Scale down for preview
          const scale = 0.25
          const previewX = x * scale
          const previewY = y * scale
          const previewFontSize = Math.max(6, fontSize * scale)
          
          return (
            <div
              key={index}
              style={{
                position: "absolute",
                left: `${previewX}px`,
                top: `${previewY}px`,
                transform: "translate(-50%, -50%)",
                fontSize: `${previewFontSize}px`,
                fontWeight,
                fontFamily,
                color,
                whiteSpace: "nowrap",
                opacity: layer.opacity,
              }}
            >
              {content}
            </div>
          )
        }
        
        return null
      })}
    </div>
  )
}

