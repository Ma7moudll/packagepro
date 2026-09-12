"use client"

import { useState, useMemo } from "react"
import { useDesignStore } from "@/lib/editor/state/store"
import { useLanguage } from "@/providers/language-provider"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Package, Shapes } from "lucide-react"
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
import { SHAPE_CATEGORIES, getShapesByCategory, searchShapes, ShapeItem } from "@/lib/editor/data/shapes-library"

export function ElementsLibraryPanel() {
  const { language } = useLanguage()
  const addLayer = useDesignStore((s) => s.addLayer)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("eco")
  const [shapeSearch, setShapeSearch] = useState("")
  const [selectedShapeCategory, setSelectedShapeCategory] = useState("arrows")
  const [libraryMode, setLibraryMode] = useState<"elements" | "shapes">("elements")

  const getElements = (categoryId: string): ElementItem[] => {
    switch (categoryId) {
      case "eco": return ECO_SYMBOLS
      case "eco_properties": return ECO_PROPERTIES
      case "logistics": return LOGISTICS_ICONS
      case "geometric": return GEOMETRIC_SHAPES
      case "abstract": return ABSTRACT_SHAPES
      case "social_rectangle": return SOCIAL_RECTANGLE
      case "social_rounded": return SOCIAL_ROUNDED
      case "symbols": return SYMBOLS
      default: return []
    }
  }

  const filteredElements = useMemo(() => {
    if (search) return searchElements(search)
    return getElements(selectedCategory)
  }, [search, selectedCategory])

  const filteredShapes = useMemo(() => {
    if (shapeSearch) return searchShapes(shapeSearch)
    return getShapesByCategory(selectedShapeCategory)
  }, [shapeSearch, selectedShapeCategory])

  const handleAddElement = (element: ElementItem) => {
    const svgDataUrl = `data:image/svg+xml,${encodeURIComponent(element.svg)}`
    addLayer({
      type: "image",
      name: element.name.en,
      imageProperties: { src: svgDataUrl, naturalWidth: 100, naturalHeight: 100 },
      scale: { x: 1, y: 1 },
    })
  }

  const handleAddShape = (shape: ShapeItem) => {
    const svgDataUrl = `data:image/svg+xml,${encodeURIComponent(shape.svg)}`
    addLayer({
      type: "image",
      name: shape.name.en,
      imageProperties: { src: svgDataUrl, naturalWidth: 100, naturalHeight: 100 },
      scale: { x: 1, y: 1 },
    })
  }

  return (
    <div className="flex flex-col h-full">
      <Tabs value={libraryMode} onValueChange={(v) => setLibraryMode(v as "elements" | "shapes")}>
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-600" />
              {language === "ar" ? "المكتبة" : "Library"}
            </h3>
            <TabsList className="h-7">
              <TabsTrigger value="elements" className="text-[10px] px-2 py-1">
                {language === "ar" ? "عناصر" : "Elements"}
              </TabsTrigger>
              <TabsTrigger value="shapes" className="text-[10px] px-2 py-1">
                <Shapes className="h-3 w-3 mr-1" />
                {language === "ar" ? "أشكال" : "Shapes"}
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="elements" className="flex-1 flex flex-col mt-0">
          <div className="px-4 pb-3">
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

          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="flex-1 flex flex-col">
            <div className="border-b px-4">
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

            <ScrollArea className="flex-1">
              <div className="p-4 grid grid-cols-3 gap-3">
                {filteredElements.map((element) => (
                  <button
                    key={element.id}
                    onClick={() => handleAddElement(element)}
                    className="group relative aspect-square rounded-lg border border-slate-200 bg-white hover:border-slate-400 hover:shadow-lg transition-all overflow-hidden p-2"
                    title={language === "ar" ? element.name.ar : element.name.en}
                  >
                    <div
                      className="w-full h-full flex items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: element.svg }}
                    />
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
                  <p className="text-sm">{language === "ar" ? "لا توجد عناصر" : "No elements found"}</p>
                </div>
              )}
            </ScrollArea>
          </Tabs>
        </TabsContent>

        <TabsContent value="shapes" className="flex-1 flex flex-col mt-0">
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder={language === "ar" ? "بحث عن شكل..." : "Search shapes..."}
                className="pl-8 text-xs h-8"
                value={shapeSearch}
                onChange={(e) => setShapeSearch(e.target.value)}
              />
            </div>
          </div>

          <Tabs value={selectedShapeCategory} onValueChange={setSelectedShapeCategory} className="flex-1 flex flex-col">
            <div className="border-b px-4">
              <ScrollArea className="w-full">
                <TabsList className="flex w-max p-1 bg-transparent h-auto">
                  {SHAPE_CATEGORIES.map((cat) => (
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

            <ScrollArea className="flex-1">
              <div className="p-4 grid grid-cols-4 gap-2">
                {filteredShapes.map((shape) => (
                  <button
                    key={shape.id}
                    onClick={() => handleAddShape(shape)}
                    className="group relative aspect-square rounded-lg border border-slate-200 bg-white hover:border-slate-900 hover:shadow-lg transition-all overflow-hidden p-1.5"
                    title={language === "ar" ? shape.name.ar : shape.name.en}
                  >
                    <div
                      className="w-full h-full flex items-center justify-center text-slate-700"
                      dangerouslySetInnerHTML={{ __html: shape.svg }}
                    />
                  </button>
                ))}
              </div>
              {filteredShapes.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  <Shapes className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">{language === "ar" ? "لا توجد أشكال" : "No shapes found"}</p>
                </div>
              )}
            </ScrollArea>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  )
}
