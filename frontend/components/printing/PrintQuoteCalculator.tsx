"use client"

import { useState } from "react"
import { calculatePrintQuote, getMaterialOptions, getFinishOptions } from "@/lib/printing/quote-calculator"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Calculator, Download } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { PrintQuote } from "@/lib/printing/types"

export function PrintQuoteCalculator() {
  const { language } = useLanguage()
  const [quote, setQuote] = useState<PrintQuote | null>(null)

  const [formData, setFormData] = useState({
    quantity: 100,
    width: 200,
    height: 150,
    depth: 50,
    unit: "mm" as "mm" | "cm" | "inch",
    material: "cardboard-250",
    finish: [] as string[],
    colorsFront: 4,
    colorsBack: 4,
    colorsSides: 0,
    dieCutLines: 0,
    foldLines: 0,
    spotUV: 0,
    embossing: 0,
    debossing: 0,
    pantoneColors: [] as string[],
    rushOrder: false,
  })

  const handleCalculate = () => {
    const result = calculatePrintQuote({
      quantity: formData.quantity,
      dimensions: {
        width: formData.width,
        height: formData.height,
        depth: formData.depth,
        unit: formData.unit,
      },
      material: formData.material,
      finish: formData.finish,
      colors: {
        front: formData.colorsFront,
        back: formData.colorsBack,
        sides: formData.colorsSides,
      },
      dieCutLines: formData.dieCutLines,
      foldLines: formData.foldLines,
      spotUV: formData.spotUV,
      embossing: formData.embossing,
      debossing: formData.debossing,
      pantoneColors: formData.pantoneColors,
      rushOrder: formData.rushOrder,
    })

    setQuote(result)
  }

  const handleDownload = () => {
    if (!quote) return

    const content = `
Print Quote
===========

Quantity: ${quote.quantity}
Dimensions: ${quote.dimensions.width}x${quote.dimensions.height}${quote.dimensions.depth ? `x${quote.dimensions.depth}` : ""} ${quote.dimensions.unit}
Material: ${quote.material}
Finish: ${quote.finish.join(", ")}

Colors:
  Front: ${quote.colors.front}
  Back: ${quote.colors.back}
  Sides: ${quote.colors.sides}

Special Effects:
  Die-cut lines: ${quote.dieCutLines}
  Fold lines: ${quote.foldLines}
  Spot UV: ${quote.spotUV}
  Embossing: ${quote.embossing}
  Debossing: ${quote.debossing}
  Pantone colors: ${quote.pantoneColors.length}

Breakdown:
  Base Price: ${quote.basePrice.toFixed(2)} ${quote.currency}
  Material Cost: ${quote.materialCost.toFixed(2)} ${quote.currency}
  Color Cost: ${quote.colorCost.toFixed(2)} ${quote.currency}
  Finish Cost: ${quote.finishCost.toFixed(2)} ${quote.currency}
  Special Effects: ${quote.specialEffectsCost.toFixed(2)} ${quote.currency}
  ${quote.rushCost > 0 ? `Rush Cost: ${quote.rushCost.toFixed(2)} ${quote.currency}` : ""}

Subtotal: ${(quote.total - quote.tax).toFixed(2)} ${quote.currency}
Tax (15%): ${quote.tax.toFixed(2)} ${quote.currency}
Total: ${quote.total.toFixed(2)} ${quote.currency}
    `.trim()

    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `print-quote-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {language === "ar" ? "حاسبة أسعار الطباعة" : "Print Quote Calculator"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quantity & Dimensions */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>
                {language === "ar" ? "الكمية" : "Quantity"} *
              </Label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })
                }
                min={1}
              />
            </div>
            <div>
              <Label>
                {language === "ar" ? "الوحدة" : "Unit"}
              </Label>
              <Select
                value={formData.unit}
                onValueChange={(v) => setFormData({ ...formData, unit: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mm">mm</SelectItem>
                  <SelectItem value="cm">cm</SelectItem>
                  <SelectItem value="inch">inch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>
                {language === "ar" ? "العرض" : "Width"} *
              </Label>
              <Input
                type="number"
                value={formData.width}
                onChange={(e) =>
                  setFormData({ ...formData, width: parseFloat(e.target.value) || 0 })
                }
                min={0}
              />
            </div>
            <div>
              <Label>
                {language === "ar" ? "الارتفاع" : "Height"} *
              </Label>
              <Input
                type="number"
                value={formData.height}
                onChange={(e) =>
                  setFormData({ ...formData, height: parseFloat(e.target.value) || 0 })
                }
                min={0}
              />
            </div>
            <div>
              <Label>
                {language === "ar" ? "العمق" : "Depth"} (اختياري)
              </Label>
              <Input
                type="number"
                value={formData.depth}
                onChange={(e) =>
                  setFormData({ ...formData, depth: parseFloat(e.target.value) || 0 })
                }
                min={0}
              />
            </div>
          </div>

          {/* Material & Finish */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>
                {language === "ar" ? "المادة" : "Material"} *
              </Label>
              <Select
                value={formData.material}
                onValueChange={(v) => setFormData({ ...formData, material: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getMaterialOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>
                {language === "ar" ? "اللمسة النهائية" : "Finish"}
              </Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {getFinishOptions().map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.finish.includes(option.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({
                            ...formData,
                            finish: [...formData.finish, option.value],
                          })
                        } else {
                          setFormData({
                            ...formData,
                            finish: formData.finish.filter((f) => f !== option.value),
                          })
                        }
                      }}
                    />
                    <Label className="text-sm">{option.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>
                {language === "ar" ? "ألوان الوجه" : "Front Colors"}
              </Label>
              <Input
                type="number"
                value={formData.colorsFront}
                onChange={(e) =>
                  setFormData({ ...formData, colorsFront: parseInt(e.target.value) || 0 })
                }
                min={0}
                max={6}
              />
            </div>
            <div>
              <Label>
                {language === "ar" ? "ألوان الخلف" : "Back Colors"}
              </Label>
              <Input
                type="number"
                value={formData.colorsBack}
                onChange={(e) =>
                  setFormData({ ...formData, colorsBack: parseInt(e.target.value) || 0 })
                }
                min={0}
                max={6}
              />
            </div>
            <div>
              <Label>
                {language === "ar" ? "ألوان الجوانب" : "Side Colors"}
              </Label>
              <Input
                type="number"
                value={formData.colorsSides}
                onChange={(e) =>
                  setFormData({ ...formData, colorsSides: parseInt(e.target.value) || 0 })
                }
                min={0}
                max={6}
              />
            </div>
          </div>

          {/* Special Effects */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>
                {language === "ar" ? "خطوط القطع" : "Die-cut Lines"}
              </Label>
              <Input
                type="number"
                value={formData.dieCutLines}
                onChange={(e) =>
                  setFormData({ ...formData, dieCutLines: parseInt(e.target.value) || 0 })
                }
                min={0}
              />
            </div>
            <div>
              <Label>
                {language === "ar" ? "خطوط الطي" : "Fold Lines"}
              </Label>
              <Input
                type="number"
                value={formData.foldLines}
                onChange={(e) =>
                  setFormData({ ...formData, foldLines: parseInt(e.target.value) || 0 })
                }
                min={0}
              />
            </div>
            <div>
              <Label>
                {language === "ar" ? "Spot UV" : "Spot UV"}
              </Label>
              <Input
                type="number"
                value={formData.spotUV}
                onChange={(e) =>
                  setFormData({ ...formData, spotUV: parseInt(e.target.value) || 0 })
                }
                min={0}
              />
            </div>
            <div>
              <Label>
                {language === "ar" ? "النقش البارز" : "Embossing"}
              </Label>
              <Input
                type="number"
                value={formData.embossing}
                onChange={(e) =>
                  setFormData({ ...formData, embossing: parseInt(e.target.value) || 0 })
                }
                min={0}
              />
            </div>
            <div>
              <Label>
                {language === "ar" ? "النقش الغائر" : "Debossing"}
              </Label>
              <Input
                type="number"
                value={formData.debossing}
                onChange={(e) =>
                  setFormData({ ...formData, debossing: parseInt(e.target.value) || 0 })
                }
                min={0}
              />
            </div>
          </div>

          {/* Rush Order */}
          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.rushOrder}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, rushOrder: checked as boolean })
              }
            />
            <Label>
              {language === "ar" ? "طلب عاجل" : "Rush Order"} (+50%)
            </Label>
          </div>

          <Button onClick={handleCalculate} className="w-full" size="lg">
            <Calculator className="h-4 w-4 mr-2" />
            {language === "ar" ? "حساب السعر" : "Calculate Quote"}
          </Button>
        </CardContent>
      </Card>

      {/* Quote Result */}
      {quote && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {language === "ar" ? "عرض السعر" : "Quote"}
              </CardTitle>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                {language === "ar" ? "تحميل" : "Download"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">
                  {language === "ar" ? "السعر الأساسي" : "Base Price"}
                </span>
                <span>{quote.basePrice.toFixed(2)} {quote.currency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">
                  {language === "ar" ? "تكلفة المادة" : "Material Cost"}
                </span>
                <span>{quote.materialCost.toFixed(2)} {quote.currency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">
                  {language === "ar" ? "تكلفة الألوان" : "Color Cost"}
                </span>
                <span>{quote.colorCost.toFixed(2)} {quote.currency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">
                  {language === "ar" ? "تكلفة اللمسة النهائية" : "Finish Cost"}
                </span>
                <span>{quote.finishCost.toFixed(2)} {quote.currency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">
                  {language === "ar" ? "التأثيرات الخاصة" : "Special Effects"}
                </span>
                <span>{quote.specialEffectsCost.toFixed(2)} {quote.currency}</span>
              </div>
              {quote.rushCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">
                    {language === "ar" ? "تكلفة العاجل" : "Rush Cost"}
                  </span>
                  <span>{quote.rushCost.toFixed(2)} {quote.currency}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between text-sm">
                <span className="text-slate-600">
                  {language === "ar" ? "المجموع الفرعي" : "Subtotal"}
                </span>
                <span>{(quote.total - quote.tax).toFixed(2)} {quote.currency}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">
                  {language === "ar" ? "الضريبة" : "Tax"} (15%)
                </span>
                <span>{quote.tax.toFixed(2)} {quote.currency}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>{language === "ar" ? "الإجمالي" : "Total"}</span>
                <span>{quote.total.toFixed(2)} {quote.currency}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

