"use client"

import { useState, useMemo } from "react"
import { useDesignStore } from "@/lib/editor/state/store"
import { useLanguage } from "@/providers/language-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Package } from "lucide-react"
import {
  ELEMENT_CATEGORIES,
  ECO_SYMBOLS,
  ECO_PROPERTIES,
  LOGISTICS_ICONS,
  GEOMETRIC_SHAPES,
  ABSTRACT_SHAPES,
  SOCIAL_RECTANGLE,
  SOCIAL_ROUNDED,
  SYMBOLS,
  searchElements,
  ElementItem,
} from "@/lib/editor/data/elements-data"

export function ElementsLibraryPanel() {
  const { language } = useLanguage()
  const addLayer = useDesignStore((s) => s.addLayer)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("eco")

  // Get elements based on category and search
  const getElements = (categoryId: string): ElementItem[] => {
    switch (categoryId) {
      case "eco":
        return ECO_SYMBOLS
      case "eco_properties":
        return ECO_PROPERTIES
      case "logistics":
        return LOGISTICS_ICONS
      case "geometric":
        return GEOMETRIC_SHAPES
      case "abstract":
        return ABSTRACT_SHAPES
      case "social_rectangle":
        return SOCIAL_RECTANGLE
      case "social_rounded":
        return SOCIAL_ROUNDED
      case "symbols":
        return SYMBOLS
      default:
        return []
    }
  }

  const filteredElements = useMemo(() => {
    if (search) {
      return searchElements(search)
    }
    return getElements(selectedCategory)
  }, [search, selectedCategory])

  // Add element as SVG image layer
  const handleAddElement = (element: ElementItem) => {
    // Convert SVG string to data URL
    const svgDataUrl = `data:image/svg+xml,${encodeURIComponent(element.svg)}`

    addLayer({
      type: "image",
      name: element.name.en,
      imageProperties: {
        src: svgDataUrl,
        naturalWidth: 100,
        naturalHeight: 100,
      },
      scale: { x: 1, y: 1 },
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Package className="h-4 w-4 text-slate-600" />
          {language === "ar" ? "مكتبة العناصر" : "Elements Library"}
        </h3>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder={language === "ar" ? "بحث عن عنصر..." : "Search elements..."}
            className="pl-8 text-xs h-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="flex-1 flex flex-col">
        <div className="border-b">
          <ScrollArea className="w-full">
            <TabsList className="flex w-max p-1 bg-transparent h-auto">
              {ELEMENT_CATEGORIES.map((cat) => (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id}
                  className="text-[10px] px-2 py-1.5 data-[state=active]:bg-slate-900 data-[state=active]:text-white rounded-md"
                >
                  <span className="mr-1">{cat.icon}</span>
                  {language === "ar" ? cat.name.ar : cat.name.en}
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>
        </div>

        {/* Elements Grid */}
        <ScrollArea className="flex-1">
          <div className="p-4 grid grid-cols-3 gap-3">
            {filteredElements.map((element) => (
              <button
                key={element.id}
                onClick={() => handleAddElement(element)}
                className="group relative aspect-square rounded-lg border border-slate-200 bg-white hover:border-slate-400 hover:shadow-lg transition-all overflow-hidden p-2"
                title={language === "ar" ? element.name.ar : element.name.en}
              >
                {/* SVG Preview */}
                <div
                  className="w-full h-full flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: element.svg }}
                />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-[9px] font-medium text-center px-1 leading-tight">
                    {language === "ar" ? element.name.ar : element.name.en}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {filteredElements.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">
                {language === "ar" ? "لا توجد عناصر" : "No elements found"}
              </p>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t bg-slate-50">
          <p className="text-[10px] text-slate-500 text-center">
            {filteredElements.length} {language === "ar" ? "عنصر" : "elements"}
          </p>
        </div>
      </Tabs>
    </div>
  )
}
