"use client"

import { useState, useCallback } from "react"
import { useDesignStore } from "@/lib/editor/state/store"
import { useLanguage } from "@/providers/language-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { QrCode, Barcode, Plus, Loader2 } from "lucide-react"

// QR Code generation using Canvas API
function generateQRCode(
  text: string,
  size: number = 200,
  fgColor: string = "#000000",
  bgColor: string = "#ffffff"
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Simple QR code pattern generator (for demo - in production use qrcode library)
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")
    
    if (!ctx) {
      reject(new Error("Could not get canvas context"))
      return
    }

    // Background
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, size, size)

    // Generate QR pattern (simplified version)
    // In production, use a proper QR code library like 'qrcode'
    const moduleCount = 21 // Version 1 QR code
    const moduleSize = Math.floor(size / (moduleCount + 8))
    const margin = Math.floor((size - moduleCount * moduleSize) / 2)

    ctx.fillStyle = fgColor

    // Create a deterministic pattern based on text
    const hash = text.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    
    // Finder patterns (three corners)
    const drawFinderPattern = (x: number, y: number) => {
      // Outer square
      ctx.fillRect(margin + x * moduleSize, margin + y * moduleSize, 7 * moduleSize, 7 * moduleSize)
      ctx.fillStyle = bgColor
      ctx.fillRect(margin + (x + 1) * moduleSize, margin + (y + 1) * moduleSize, 5 * moduleSize, 5 * moduleSize)
      ctx.fillStyle = fgColor
      ctx.fillRect(margin + (x + 2) * moduleSize, margin + (y + 2) * moduleSize, 3 * moduleSize, 3 * moduleSize)
    }

    drawFinderPattern(0, 0)
    ctx.fillStyle = fgColor
    drawFinderPattern(moduleCount - 7, 0)
    ctx.fillStyle = fgColor
    drawFinderPattern(0, moduleCount - 7)

    // Data modules (pseudo-random based on text hash)
    ctx.fillStyle = fgColor
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        // Skip finder pattern areas
        if ((row < 8 && col < 8) || (row < 8 && col > moduleCount - 9) || (row > moduleCount - 9 && col < 8)) {
          continue
        }
        // Timing patterns
        if (row === 6 || col === 6) {
          if ((row + col) % 2 === 0) {
            ctx.fillRect(margin + col * moduleSize, margin + row * moduleSize, moduleSize, moduleSize)
          }
          continue
        }
        // Data modules
        const seed = (hash + row * moduleCount + col) % 100
        if (seed > 50) {
          ctx.fillRect(margin + col * moduleSize, margin + row * moduleSize, moduleSize, moduleSize)
        }
      }
    }

    resolve(canvas.toDataURL("image/png"))
  })
}

// Barcode generation
function generateBarcode(
  text: string,
  type: "code128" | "ean13" | "upc" = "code128",
  width: number = 300,
  height: number = 100,
  fgColor: string = "#000000",
  bgColor: string = "#ffffff"
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    
    if (!ctx) {
      resolve("")
      return
    }

    // Background
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = fgColor
    const barHeight = height - 20
    const margin = 10

    // Simple Code128-like pattern
    const patterns: Record<string, string> = {
      "0": "212222", "1": "222122", "2": "222221", "3": "121223", "4": "121322",
      "5": "131222", "6": "122213", "7": "122312", "8": "132212", "9": "221213",
      "A": "211232", "B": "231212", "C": "221221", "D": "221123", "E": "221232",
      "F": "231122", "G": "211133", "H": "231131", "I": "213122", "J": "123132",
      "K": "122133", "L": "132123", "M": "132132", "N": "212132", "O": "231321",
      "P": "231312", "Q": "312132", "R": "311123", "S": "311232", "T": "321123",
      "U": "321132", "V": "321231", "W": "112232", "X": "122132", "Y": "122231",
      "Z": "132122", " ": "212222", "-": "112232", ".": "122132",
    }

    // Start code
    let barcode = "211412" // Start B

    // Encode text
    for (const char of text.toUpperCase()) {
      barcode += patterns[char] || patterns["0"]
    }

    // Stop code
    barcode += "2331112"

    // Calculate bar width
    const totalUnits = barcode.split("").reduce((sum, char) => sum + parseInt(char), 0)
    const unitWidth = (width - margin * 2) / totalUnits

    // Draw bars
    let x = margin
    let isBar = true
    for (const char of barcode) {
      const units = parseInt(char)
      const barWidth = units * unitWidth
      if (isBar) {
        ctx.fillRect(x, 5, barWidth, barHeight)
      }
      x += barWidth
      isBar = !isBar
    }

    // Draw text below
    ctx.fillStyle = fgColor
    ctx.font = "12px monospace"
    ctx.textAlign = "center"
    ctx.fillText(text, width / 2, height - 5)

    resolve(canvas.toDataURL("image/png"))
  })
}

export function CodeGenerators() {
  const { language } = useLanguage()
  const addLayer = useDesignStore((s) => s.addLayer)
  const selectedFace = useDesignStore((s) => s.ui.selectedFace)

  const [qrText, setQrText] = useState("")
  const [qrSize, setQrSize] = useState(150)
  const [qrFgColor, setQrFgColor] = useState("#000000")
  const [qrBgColor, setQrBgColor] = useState("#ffffff")

  const [barcodeText, setBarcodeText] = useState("")
  const [barcodeType, setBarcodeType] = useState<"code128" | "ean13" | "upc">("code128")
  const [barcodeWidth, setBarcodeWidth] = useState(200)
  const [barcodeHeight, setBarcodeHeight] = useState(80)

  const [generating, setGenerating] = useState(false)

  const handleGenerateQR = useCallback(async () => {
    if (!qrText.trim()) return
    
    setGenerating(true)
    try {
      const dataUrl = await generateQRCode(qrText, qrSize, qrFgColor, qrBgColor)
      addLayer({
        type: "image",
        name: `QR Code: ${qrText.slice(0, 20)}`,
        faceId: selectedFace,
        imageProperties: {
          src: dataUrl,
          naturalWidth: qrSize,
          naturalHeight: qrSize,
        },
      })
    } catch (error) {
      console.error("Error generating QR code:", error)
    } finally {
      setGenerating(false)
    }
  }, [qrText, qrSize, qrFgColor, qrBgColor, addLayer, selectedFace])

  const handleGenerateBarcode = useCallback(async () => {
    if (!barcodeText.trim()) return
    
    setGenerating(true)
    try {
      const dataUrl = await generateBarcode(barcodeText, barcodeType, barcodeWidth, barcodeHeight)
      addLayer({
        type: "image",
        name: `Barcode: ${barcodeText.slice(0, 20)}`,
        faceId: selectedFace,
        imageProperties: {
          src: dataUrl,
          naturalWidth: barcodeWidth,
          naturalHeight: barcodeHeight,
        },
      })
    } catch (error) {
      console.error("Error generating barcode:", error)
    } finally {
      setGenerating(false)
    }
  }, [barcodeText, barcodeType, barcodeWidth, barcodeHeight, addLayer, selectedFace])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <QrCode className="h-4 w-4 text-slate-600" />
        <h3 className="text-sm font-semibold">
          {language === "ar" ? "مولد الأكواد" : "Code Generators"}
        </h3>
      </div>

      <Tabs defaultValue="qr" className="w-full">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="qr" className="text-xs">
            <QrCode className="h-3 w-3 mr-1" />
            QR Code
          </TabsTrigger>
          <TabsTrigger value="barcode" className="text-xs">
            <Barcode className="h-3 w-3 mr-1" />
            Barcode
          </TabsTrigger>
        </TabsList>

        <TabsContent value="qr" className="space-y-3 mt-3">
          <div>
            <Label className="text-xs mb-1 block">
              {language === "ar" ? "النص أو الرابط" : "Text or URL"}
            </Label>
            <Input
              placeholder={language === "ar" ? "أدخل النص أو الرابط..." : "Enter text or URL..."}
              value={qrText}
              onChange={(e) => setQrText(e.target.value)}
              className="text-xs h-8"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs mb-1 block">
                {language === "ar" ? "الحجم" : "Size"}
              </Label>
              <Select
                value={qrSize.toString()}
                onValueChange={(v) => setQrSize(parseInt(v))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100px</SelectItem>
                  <SelectItem value="150">150px</SelectItem>
                  <SelectItem value="200">200px</SelectItem>
                  <SelectItem value="300">300px</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">
                {language === "ar" ? "اللون" : "Color"}
              </Label>
              <div className="flex gap-1">
                <input
                  type="color"
                  value={qrFgColor}
                  onChange={(e) => setQrFgColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer"
                  title={language === "ar" ? "لون المقدمة" : "Foreground"}
                />
                <input
                  type="color"
                  value={qrBgColor}
                  onChange={(e) => setQrBgColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer"
                  title={language === "ar" ? "لون الخلفية" : "Background"}
                />
              </div>
            </div>
          </div>

          <Button
            onClick={handleGenerateQR}
            disabled={!qrText.trim() || generating}
            className="w-full h-8 text-xs"
            size="sm"
          >
            {generating ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Plus className="h-3 w-3 mr-1" />
            )}
            {language === "ar" ? "إضافة QR Code" : "Add QR Code"}
          </Button>
        </TabsContent>

        <TabsContent value="barcode" className="space-y-3 mt-3">
          <div>
            <Label className="text-xs mb-1 block">
              {language === "ar" ? "النص" : "Text/Number"}
            </Label>
            <Input
              placeholder={language === "ar" ? "أدخل الكود..." : "Enter code..."}
              value={barcodeText}
              onChange={(e) => setBarcodeText(e.target.value)}
              className="text-xs h-8"
            />
          </div>

          <div>
            <Label className="text-xs mb-1 block">
              {language === "ar" ? "النوع" : "Type"}
            </Label>
            <Select
              value={barcodeType}
              onValueChange={(v: "code128" | "ean13" | "upc") => setBarcodeType(v)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="code128">Code 128</SelectItem>
                <SelectItem value="ean13">EAN-13</SelectItem>
                <SelectItem value="upc">UPC-A</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs mb-1 block">
                {language === "ar" ? "العرض" : "Width"}
              </Label>
              <Select
                value={barcodeWidth.toString()}
                onValueChange={(v) => setBarcodeWidth(parseInt(v))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="150">150px</SelectItem>
                  <SelectItem value="200">200px</SelectItem>
                  <SelectItem value="250">250px</SelectItem>
                  <SelectItem value="300">300px</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">
                {language === "ar" ? "الارتفاع" : "Height"}
              </Label>
              <Select
                value={barcodeHeight.toString()}
                onValueChange={(v) => setBarcodeHeight(parseInt(v))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60">60px</SelectItem>
                  <SelectItem value="80">80px</SelectItem>
                  <SelectItem value="100">100px</SelectItem>
                  <SelectItem value="120">120px</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleGenerateBarcode}
            disabled={!barcodeText.trim() || generating}
            className="w-full h-8 text-xs"
            size="sm"
          >
            {generating ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Plus className="h-3 w-3 mr-1" />
            )}
            {language === "ar" ? "إضافة Barcode" : "Add Barcode"}
          </Button>
        </TabsContent>
      </Tabs>

      <p className="text-[10px] text-slate-400 italic bg-slate-50 p-2 rounded">
        {language === "ar"
          ? "ملاحظة: يمكنك إضافة رابط موقعك أو معلومات المنتج في QR Code."
          : "Tip: Add your website URL or product info to the QR code."}
      </p>
    </div>
  )
}
