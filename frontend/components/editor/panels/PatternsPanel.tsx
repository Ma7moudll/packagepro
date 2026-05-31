"use client"

import { useDesignStore } from "@/lib/editor/state/store"
import { useLanguage } from "@/providers/language-provider"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Grid2X2 } from "lucide-react"
import { useState } from "react"

const SVG_PATTERNS: Record<string, string> = {
  "Dots": `data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='3' cy='3' r='1' fill='%23000'/%3E%3C/svg%3E`,
  "Diagonal": `data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 10 10' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M-1,1 l2,-2 M0,10 l10,-10 M9,11 l2,-2' stroke='%23000' stroke-width='1'/%3E%3C/svg%3E`,
  "Grid": `data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0H0v20h20V0zM1 19V1h18v18H1z' fill='%23000' fill-opacity='.1'/%3E%3C/svg%3E`,
  "Waves": `data:image/svg+xml,%3Csvg width='50' height='20' viewBox='0 0 50 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,10 Q12.5,0 25,10 T50,10' fill='none' stroke='%23000' stroke-width='1'/%3E%3C/svg%3E`,
  "Luxury": `data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0l20 20-20 20L0 20z' fill='none' stroke='%23000' stroke-width='0.5'/%3E%3C/svg%3E`,
  "Floral": `data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0c5 10 15 10 15 20s-10 15-15 15-15-5-15-15 10-10 15-20z' fill='%23000' fill-opacity='.1'/%3E%3C/svg%3E`,
  "Leaves": `data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 10c0 40-40 40-40 80 40 0 40-40 80-40 0-40-40-40-40-80z' fill='%23000' fill-opacity='.05'/%3E%3C/svg%3E`,
  "Hexagon": `data:image/svg+xml,%3Csvg width='28' height='49' viewBox='0 0 28 49' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9l11-6.35 11 6.35v12.7l-11 6.35-11-6.35V17.9z' fill='%23000' fill-opacity='.1'/%3E%3C/svg%3E`,
  "Modern": `data:image/svg+xml,%3Csvg width='40' height='12' viewBox='0 0 40 12' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 6.172L6.172 0h12.344L30.86 12.344h12.344L49.376 6.172' fill='none' stroke='%23000' stroke-width='1'/%3E%3C/svg%3E`,
  "Stars": `data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 0l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z' fill='%23000' fill-opacity='.1'/%3E%3C/svg%3E`,
  "Carbon": `data:image/svg+xml,%3Csvg width='6' height='10' viewBox='0 0 6 10' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 5h3v5H0zM3 0h3v5H3z' fill='%23000' fill-opacity='.05'/%3E%3C/svg%3E`,
  "Polka": `data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='10' cy='10' r='5' fill='%23000' fill-opacity='.05'/%3E%3C/svg%3E`,
  "Zigzag": `data:image/svg+xml,%3Csvg width='40' height='10' viewBox='0 0 40 10' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 5l5-5 10 10 10-10 10 10 5-5' fill='none' stroke='%23000' stroke-width='1'/%3E%3C/svg%3E`
}

const PATTERN_CATEGORIES = [
  {
    id: "minimal",
    name: { en: "Minimal", ar: "بسيط" },
    patterns: ["Dots", "Diagonal", "Grid", "Waves"]
  },
  {
    id: "artistic",
    name: { en: "Artistic", ar: "فني" },
    patterns: ["Luxury", "Floral", "Leaves", "Hexagon", "Modern", "Stars", "Carbon", "Polka", "Zigzag"]
  }
]

export function PatternsPanel() {
  const { language } = useLanguage()
  const [search, setSearch] = useState("")
  const addLayer = useDesignStore((s) => s.addLayer)
  const selectedFace = useDesignStore((s) => s.ui.selectedFace)

  const applyPattern = (name: string) => {
    const src = SVG_PATTERNS[name]
    addLayer({
      type: "image",
      name: `${name} Pattern`,
      visible: true,
      locked: false,
      opacity: 0.15,
      blendMode: "multiply",
      rotation: 0,
      scale: { x: 10, y: 10 }, // Scale up to cover most of the face
      faceId: selectedFace,
      imageProperties: { src }
    })
  }

  const filteredCategories = PATTERN_CATEGORIES.map(cat => ({
    ...cat,
    patterns: cat.patterns.filter(p => p.toLowerCase().includes(search.toLowerCase()))
  })).filter(cat => cat.patterns.length > 0)

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b">
        <h3 className="text-sm font-black mb-1 uppercase tracking-tighter">
          {language === "ar" ? "الأنماط والقوام" : "Patterns & Textures"}
        </h3>
        <p className="text-[10px] text-slate-400 mb-4">{language === "ar" ? "أضف بضغطة واحدة نمطاً متكرراً" : "Add professional seamless patterns"}</p>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder={language === "ar" ? "ابحث عن نمط..." : "Search patterns..."}
            className="pl-8 text-xs h-9 bg-slate-50 border-none focus-visible:ring-slate-900"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-6">
          {filteredCategories.map((category) => (
            <div key={category.id}>
              <h4 className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-slate-900" />
                {language === "ar" ? category.name.ar : category.name.en}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {category.patterns.map((pattern) => (
                  <button
                    key={pattern}
                    onClick={() => applyPattern(pattern)}
                    className="group relative aspect-square bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-900 hover:shadow-2xl hover:shadow-slate-200 transition-all overflow-hidden flex flex-col items-center justify-center p-2"
                  >
                    <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity" style={{ backgroundImage: `url(${SVG_PATTERNS[pattern]})`, backgroundSize: '20px' }} />
                    <Grid2X2 className="w-5 h-5 text-slate-300 group-hover:text-slate-900 mb-2 transition-colors relative z-10" />
                    <span className="text-[10px] font-bold text-slate-600 relative z-10">
                      {pattern}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
