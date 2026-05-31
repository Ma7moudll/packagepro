"use client"

import { useState, useCallback } from "react"
import { useDesignStore } from "@/lib/editor/state/store"
import { useLanguage } from "@/providers/language-provider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import {
  Search,
  Image as ImageIcon,
  Download,
  Loader2,
  ExternalLink,
  RefreshCw,
} from "lucide-react"

// Curated stock images for packaging (using placeholder services)
// In production, you would use Unsplash API or similar
const STOCK_CATEGORIES = [
  { id: "packaging", name: { en: "Packaging", ar: "تغليف" } },
  { id: "nature", name: { en: "Nature", ar: "طبيعة" } },
  { id: "food", name: { en: "Food", ar: "طعام" } },
  { id: "abstract", name: { en: "Abstract", ar: "مجرد" } },
  { id: "textures", name: { en: "Textures", ar: "قوام" } },
  { id: "patterns", name: { en: "Patterns", ar: "أنماط" } },
]

// Sample stock images (using placeholder images)
const STOCK_IMAGES = [
  // Packaging
  { id: "pkg1", category: "packaging", url: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400", credit: "Unsplash" },
  { id: "pkg2", category: "packaging", url: "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=400", credit: "Unsplash" },
  { id: "pkg3", category: "packaging", url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400", credit: "Unsplash" },
  
  // Nature
  { id: "nat1", category: "nature", url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400", credit: "Unsplash" },
  { id: "nat2", category: "nature", url: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=400", credit: "Unsplash" },
  { id: "nat3", category: "nature", url: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400", credit: "Unsplash" },
  { id: "nat4", category: "nature", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400", credit: "Unsplash" },
  
  // Food
  { id: "food1", category: "food", url: "https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=400", credit: "Unsplash" },
  { id: "food2", category: "food", url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400", credit: "Unsplash" },
  { id: "food3", category: "food", url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400", credit: "Unsplash" },
  { id: "food4", category: "food", url: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400", credit: "Unsplash" },
  
  // Abstract
  { id: "abs1", category: "abstract", url: "https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=400", credit: "Unsplash" },
  { id: "abs2", category: "abstract", url: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=400", credit: "Unsplash" },
  { id: "abs3", category: "abstract", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400", credit: "Unsplash" },
  
  // Textures
  { id: "tex1", category: "textures", url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400", credit: "Unsplash" },
  { id: "tex2", category: "textures", url: "https://images.unsplash.com/photo-1553356084-58ef4a67b2a7?w=400", credit: "Unsplash" },
  { id: "tex3", category: "textures", url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400", credit: "Unsplash" },
  
  // Patterns
  { id: "pat1", category: "patterns", url: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=400", credit: "Unsplash" },
  { id: "pat2", category: "patterns", url: "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400", credit: "Unsplash" },
  { id: "pat3", category: "patterns", url: "https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?w=400", credit: "Unsplash" },
]

// Popular search terms for packaging
const POPULAR_SEARCHES = [
  "kraft paper",
  "cardboard",
  "eco friendly",
  "minimal",
  "luxury",
  "organic",
  "coffee",
  "cosmetics",
]

export function StockImagesPanel() {
  const { language } = useLanguage()
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)

  const addLayer = useDesignStore((s) => s.addLayer)
  const selectedFace = useDesignStore((s) => s.ui.selectedFace)

  // Filter images
  const filteredImages = STOCK_IMAGES.filter((img) => {
    if (selectedCategory && img.category !== selectedCategory) return false
    if (search && !img.category.includes(search.toLowerCase())) return false
    return true
  })

  // Add image to canvas
  const handleAddImage = useCallback(
    async (image: (typeof STOCK_IMAGES)[0]) => {
      setAddingId(image.id)

      try {
        // In a real implementation, you would fetch the full-res image
        // For now, we'll use the thumbnail URL directly
        addLayer({
          type: "image",
          name: `Stock: ${image.category}`,
          faceId: selectedFace,
          imageProperties: {
            src: image.url,
            naturalWidth: 400,
            naturalHeight: 300,
          },
          scale: { x: 0.5, y: 0.5 },
        })

        // Simulate loading delay
        await new Promise((resolve) => setTimeout(resolve, 300))
      } catch (error) {
        console.error("Error adding stock image:", error)
      } finally {
        setAddingId(null)
      }
    },
    [addLayer, selectedFace]
  )

  const handleSearch = useCallback((term: string) => {
    setSearch(term)
    setSelectedCategory(null)
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-semibold">
            {language === "ar" ? "صور Stock" : "Stock Images"}
          </h3>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder={language === "ar" ? "بحث في الصور..." : "Search images..."}
            className="pl-8 text-xs h-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Popular searches */}
        <div className="space-y-1">
          <Label className="text-[10px] text-slate-400">
            {language === "ar" ? "بحث شائع" : "Popular"}
          </Label>
          <div className="flex flex-wrap gap-1">
            {POPULAR_SEARCHES.slice(0, 4).map((term) => (
              <Button
                key={term}
                variant="outline"
                size="sm"
                className="h-5 text-[9px] px-2"
                onClick={() => handleSearch(term)}
              >
                {term}
              </Button>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-1">
          <Button
            variant={selectedCategory === null ? "secondary" : "ghost"}
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={() => setSelectedCategory(null)}
          >
            {language === "ar" ? "الكل" : "All"}
          </Button>
          {STOCK_CATEGORIES.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "secondary" : "ghost"}
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => setSelectedCategory(category.id)}
            >
              {language === "ar" ? category.name.ar : category.name.en}
            </Button>
          ))}
        </div>
      </div>

      {/* Images Grid */}
      <ScrollArea className="flex-1">
        <div className="p-3 grid grid-cols-2 gap-2">
          {filteredImages.map((image) => (
            <button
              key={image.id}
              onClick={() => handleAddImage(image)}
              disabled={addingId === image.id}
              className="relative aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 hover:border-slate-400 hover:shadow-lg transition-all group bg-slate-100"
            >
              {/* Placeholder while loading */}
              <div className="absolute inset-0 bg-slate-200 animate-pulse" />

              {/* Image - using CSS background for better loading UX */}
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${image.url})` }}
              />

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {addingId === image.id ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Download className="h-5 w-5 text-white" />
                )}
              </div>

              {/* Credit */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5">
                <span className="text-[8px] text-white/80">{image.credit}</span>
              </div>
            </button>
          ))}
        </div>

        {filteredImages.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            <ImageIcon className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">
              {language === "ar" ? "لا توجد صور" : "No images found"}
            </p>
            <Button
              variant="link"
              size="sm"
              className="mt-2"
              onClick={() => {
                setSearch("")
                setSelectedCategory(null)
              }}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              {language === "ar" ? "إعادة ضبط" : "Reset filters"}
            </Button>
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t bg-slate-50">
        <p className="text-[10px] text-slate-500 text-center">
          {language === "ar"
            ? "صور مجانية من Unsplash"
            : "Free images from Unsplash"}
        </p>
        <a
          href="https://unsplash.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 mt-1"
        >
          <ExternalLink className="h-3 w-3" />
          unsplash.com
        </a>
      </div>
    </div>
  )
}
