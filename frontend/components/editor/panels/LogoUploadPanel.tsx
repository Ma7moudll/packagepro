"use client"

import { useState, useRef } from "react"
import { useDesignStore } from "@/lib/editor/state/store"
import { useBrandStore } from "@/lib/editor/state/brand-store"
import { processFile } from "@/lib/editor/services/file-processing"
import { useLanguage } from "@/providers/language-provider"
import { Button } from "@/components/ui/button"
import { Upload, Image as ImageIcon, Check, Loader2, Zap } from "lucide-react"
import { nanoid } from "nanoid"

const SAFE_ZONE_RATIO = 0.8

function computeSmartScale(
  imageW: number,
  imageH: number,
  canvasW: number,
  canvasH: number
): number {
  const safeW = canvasW * SAFE_ZONE_RATIO
  const safeH = canvasH * SAFE_ZONE_RATIO
  const scaleX = safeW / imageW
  const scaleY = safeH / imageH
  return Math.min(scaleX, scaleY, 1)
}

export function LogoUploadPanel() {
  const { language } = useLanguage()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [processing, setProcessing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addLayer = useDesignStore((s) => s.addLayer)
  const canvas = useDesignStore((s) => s.canvas)
  const selectedFace = useDesignStore((s) => s.ui.selectedFace)
  const { addLogo } = useBrandStore()

  const handleFile = async (file: File) => {
    setProcessing(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await processFile(file, selectedFace)
      const layer = result.layers[0]
      if (!layer) throw new Error("No layer produced from file")

      const natW = layer.imageProperties?.naturalWidth ?? result.metadata?.width ?? 200
      const natH = layer.imageProperties?.naturalHeight ?? result.metadata?.height ?? 200
      const scale = computeSmartScale(natW, natH, canvas.width, canvas.height)

      const src = layer.imageProperties?.src ?? ""

      addLayer({
        type: "image",
        name: `Logo: ${file.name}`,
        imageProperties: {
          src,
          naturalWidth: natW,
          naturalHeight: natH,
        },
        position: { x: canvas.width / 2, y: canvas.height / 2 },
        scale: { x: scale, y: scale },
        faceId: selectedFace,
      })

      addLogo({ id: nanoid(), name: file.name, dataUrl: src })

      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } catch (err: any) {
      console.error("Logo upload error:", err)
      setError(err.message || "Failed to upload logo")
    } finally {
      setProcessing(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ""
  }

  return (
    <div className="space-y-3">
      <div
        className="rounded-lg border-2 border-dashed p-5 text-center cursor-pointer transition-all duration-200 border-slate-300 hover:border-emerald-500 hover:bg-emerald-25"
        onClick={() => fileInputRef.current?.click()}
      >
        {processing ? (
          <>
            <Loader2 className="h-8 w-8 mx-auto mb-2 text-blue-600 animate-spin" />
            <p className="text-sm text-blue-600 font-medium">
              {language === "ar" ? "جارٍ المعالجة..." : "Processing..."}
            </p>
          </>
        ) : success ? (
          <>
            <div className="h-10 w-10 mx-auto mb-2 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-emerald-600">
              {language === "ar" ? "تمت الإضافة بنجاح!" : "Logo added!"}
            </p>
          </>
        ) : (
          <>
            <div className="h-10 w-10 mx-auto mb-2 rounded-full bg-slate-100 flex items-center justify-center">
              <ImageIcon className="h-5 w-5 text-slate-500" />
            </div>
            <p className="text-sm font-medium">
              {language === "ar" ? "رفع شعار" : "Upload Logo"}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {language === "ar" ? "JPG, PNG, SVG, WEBP" : "JPG, PNG, SVG, WEBP"}
            </p>
            <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-emerald-600">
              <Zap className="h-3 w-3" />
              <span>
                {language === "ar"
                  ? "توسيط تلقائي وتحجيم ذكي"
                  : "Auto-center & smart scale"}
              </span>
            </div>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>

      {error && (
        <div className="p-2 rounded bg-red-50 border border-red-200">
          <p className="text-[11px] text-red-700">{error}</p>
        </div>
      )}

      <p className="text-[10px] text-slate-400 leading-relaxed">
        {language === "ar"
          ? "سيتم توسيط الشعار وتحجيمه تلقائياً ليلائم منطقة التصميم. سيتم حفظه أيضاً في العلامة التجارية للاستخدام المستقبلي."
          : "Your logo will be auto-centered and scaled to fit the safe zone. It will also be saved to your brand kit for reuse."}
      </p>

      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-3.5 w-3.5 mr-1.5" />
        {language === "ar" ? "اختيار ملف" : "Browse files"}
      </Button>
    </div>
  )
}
