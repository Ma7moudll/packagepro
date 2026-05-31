"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, X } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import {
  PANTONE_COLORS,
  searchPantoneColors,
  getPantoneColorsByCategory,
  rgbToPantone,
  hexToPantone,
} from "@/lib/printing/pantone-colors"
import { PantoneColor } from "@/lib/printing/types"

interface PantoneColorPickerProps {
  selectedColors?: string[]
  onColorSelect?: (color: PantoneColor) => void
  onColorRemove?: (colorCode: string) => void
}

export function PantoneColorPicker({
  selectedColors = [],
  onColorSelect,
  onColorRemove,
}: PantoneColorPickerProps) {
  const { language } = useLanguage()
  const [searchQuery, setSearchQuery] = useState("")
  const [category, setCategory] = useState<string>("all")
  const [selectedColor, setSelectedColor] = useState<PantoneColor | null>(null)

  const filteredColors =
    category === "all"
      ? searchQuery
        ? searchPantoneColors(searchQuery)
        : PANTONE_COLORS
      : getPantoneColorsByCategory(category)

  const handleColorClick = (color: PantoneColor) => {
    setSelectedColor(color)
    onColorSelect?.(color)
  }

  const handleRGBInput = (r: string, g: string, b: string) => {
    const rNum = parseInt(r) || 0
    const gNum = parseInt(g) || 0
    const bNum = parseInt(b) || 0
    const closest = rgbToPantone(rNum, gNum, bNum)
    if (closest) {
      setSelectedColor(closest)
      onColorSelect?.(closest)
    }
  }

  const handleHEXInput = (hex: string) => {
    if (hex.length === 7 && hex.startsWith("#")) {
      const closest = hexToPantone(hex)
      if (closest) {
        setSelectedColor(closest)
        onColorSelect?.(closest)
      }
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            {language === "ar" ? "نظام ألوان Pantone" : "Pantone Color Matching"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search & Filter */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>
                {language === "ar" ? "بحث" : "Search"}
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={language === "ar" ? "ابحث عن لون..." : "Search for color..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Label>
                {language === "ar" ? "الفئة" : "Category"}
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {language === "ar" ? "الكل" : "All"}
                  </SelectItem>
                  <SelectItem value="Coated">Coated</SelectItem>
                  <SelectItem value="Uncoated">Uncoated</SelectItem>
                  <SelectItem value="Metallic">Metallic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* RGB/HEX Input */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>
                {language === "ar" ? "RGB إلى Pantone" : "RGB to Pantone"}
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="R"
                  min={0}
                  max={255}
                  onChange={(e) => {
                    const g = (document.getElementById("pantone-g") as HTMLInputElement)?.value || "0"
                    const b = (document.getElementById("pantone-b") as HTMLInputElement)?.value || "0"
                    handleRGBInput(e.target.value, g, b)
                  }}
                />
                <Input
                  id="pantone-g"
                  type="number"
                  placeholder="G"
                  min={0}
                  max={255}
                  onChange={(e) => {
                    const r = (document.getElementById("pantone-r") as HTMLInputElement)?.value || "0"
                    const b = (document.getElementById("pantone-b") as HTMLInputElement)?.value || "0"
                    handleRGBInput(r, e.target.value, b)
                  }}
                />
                <Input
                  id="pantone-b"
                  type="number"
                  placeholder="B"
                  min={0}
                  max={255}
                  onChange={(e) => {
                    const r = (document.getElementById("pantone-r") as HTMLInputElement)?.value || "0"
                    const g = (document.getElementById("pantone-g") as HTMLInputElement)?.value || "0"
                    handleRGBInput(r, g, e.target.value)
                  }}
                />
              </div>
            </div>
            <div>
              <Label>
                {language === "ar" ? "HEX إلى Pantone" : "HEX to Pantone"}
              </Label>
              <Input
                type="text"
                placeholder="#000000"
                maxLength={7}
                onChange={(e) => handleHEXInput(e.target.value)}
              />
            </div>
          </div>

          {/* Selected Color Display */}
          {selectedColor && (
            <div className="p-4 bg-slate-50 rounded-lg space-y-2">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded border-2 border-slate-300"
                  style={{ backgroundColor: selectedColor.hex }}
                />
                <div className="flex-1">
                  <p className="font-semibold">{selectedColor.name}</p>
                  <p className="text-sm text-slate-600">{selectedColor.code}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{selectedColor.category}</Badge>
                    <Badge variant="outline">
                      RGB: {selectedColor.rgb.r}, {selectedColor.rgb.g}, {selectedColor.rgb.b}
                    </Badge>
                    <Badge variant="outline">
                      CMYK: {selectedColor.cmyk.c}%, {selectedColor.cmyk.m}%, {selectedColor.cmyk.y}%, {selectedColor.cmyk.k}%
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Color Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-96 overflow-y-auto">
            {filteredColors.map((color) => {
              const isSelected = selectedColors.includes(color.code)
              return (
                <button
                  key={color.code}
                  onClick={() => handleColorClick(color)}
                  className={`relative p-2 rounded border-2 transition-all ${
                    isSelected
                      ? "border-emerald-500 ring-2 ring-emerald-200"
                      : "border-slate-200 hover:border-slate-400"
                  }`}
                  title={`${color.name} - ${color.code}`}
                >
                  <div
                    className="w-full h-16 rounded mb-1"
                    style={{ backgroundColor: color.hex }}
                  />
                  <p className="text-xs text-center truncate">{color.code}</p>
                  {isSelected && (
                    <div className="absolute top-1 right-1">
                      <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Selected Colors List */}
          {selectedColors.length > 0 && (
            <div className="space-y-2">
              <Label>
                {language === "ar" ? "الألوان المختارة" : "Selected Colors"}
              </Label>
              <div className="flex flex-wrap gap-2">
                {selectedColors.map((code) => {
                  const color = PANTONE_COLORS.find((c) => c.code === code)
                  if (!color) return null
                  return (
                    <Badge
                      key={code}
                      variant="secondary"
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: color.hex }}
                      />
                      {color.code}
                      <button
                        onClick={() => onColorRemove?.(code)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

