"use client"

import { useState, useRef, useEffect } from "react"
import { useDesignStore } from "@/lib/editor/state/store"
import { Button } from "@/components/ui/button"
import { Upload, FileText, Image as ImageIcon, Loader2, AlertCircle } from "lucide-react"
import { useLanguage } from "@/providers/language-provider"
import { processFile } from "@/lib/editor/services/file-processing"
import { BulkUpload } from "@/components/editor/panels/BulkUpload"
import { DragDropService, DragItem } from "@/lib/editor/services/drag-drop"

export function UploadPanel() {
  const { language } = useLanguage()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const uploadAreaRef = useRef<HTMLDivElement>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const addLayer = useDesignStore((s) => s.addLayer)
  const selectedFace = useDesignStore((s) => s.ui.selectedFace)

  // Initialize drag & drop on mount
  useEffect(() => {
    if (uploadAreaRef.current) {
      DragDropService.makeDropZone(uploadAreaRef.current, {
        accepts: ['image', 'file'],
        onDrop: handleFileDrop,
        onHover: () => setIsDragOver(true),
        onLeave: () => setIsDragOver(false),
      });
    }

    return () => {
      if (uploadAreaRef.current) {
        // Cleanup would go here
      }
    };
  }, []);

  const handleFileDrop = async (item: DragItem, position: { x: number; y: number }) => {
    setIsDragOver(false)

    if (item.type === 'image' && item.data) {
      // Handle dropped image
      try {
        const result = await processFile(item.data, selectedFace)

        // Add layers with dropped position
        result.layers.forEach((layer, index) => {
          addLayer({
            ...layer,
            position: {
              x: position.x + (index * 20), // Offset multiple items
              y: position.y + (index * 20),
            },
          })
        })
      } catch (error) {
        console.error('Error processing dropped file:', error)
      }
    }
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setProcessing(true)
    setError(null)

    try {
      const file = files[0]
      const result = await processFile(file, selectedFace)

      // Add all layers
      result.layers.forEach((layer) => {
        addLayer(layer)
      })

      // Show warnings if any
      if (result.metadata?.warnings && result.metadata.warnings.length > 0) {
        setError(result.metadata.warnings.join(" "))
      }

      // Show DPI warning
      if (result.metadata?.dpi && result.metadata.dpi < 300) {
        const dpiWarning =
          language === "ar"
            ? `تحذير: دقة الصورة ${result.metadata.dpi} DPI. يُنصح بـ 300+ DPI للطباعة.`
            : `Warning: Image DPI is ${result.metadata.dpi}. Recommended: 300+ DPI for print.`
        setError((prev) => (prev ? `${prev}\n${dpiWarning}` : dpiWarning))
      }
    } catch (err: any) {
      console.error("File processing error:", err)
      setError(
        language === "ar"
          ? `خطأ في معالجة الملف: ${err.message}`
          : `Error processing file: ${err.message}`
      )
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-3">
      <div
        ref={uploadAreaRef}
        className={`rounded-lg border-2 border-dashed p-4 text-center text-xs text-slate-500 cursor-pointer transition-all duration-200 ${
          isDragOver
            ? "border-blue-500 bg-blue-50 scale-105"
            : "border-slate-300 hover:border-emerald-500 hover:bg-emerald-25"
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        {processing ? (
          <>
            <Loader2 className="h-6 w-6 mx-auto mb-2 text-blue-600 animate-spin" />
            <p className="text-blue-600 font-medium">
              {language === "ar" ? "جارٍ المعالجة..." : "Processing..."}
            </p>
          </>
        ) : isDragOver ? (
          <>
            <Upload className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <p className="font-medium text-blue-600">
              {language === "ar" ? "أفلت الملف هنا" : "Drop file here"}
            </p>
            <p className="text-xs text-blue-500">
              {language === "ar" ? "سيتم إضافة الملف إلى التصميم" : "File will be added to design"}
            </p>
          </>
        ) : (
          <>
            <Upload className="h-5 w-5 mx-auto mb-2 text-slate-400" />
            <p className="font-medium">
              {language === "ar" ? "اسحب وأفلت الملفات هنا" : "Drag & drop files here"}
            </p>
            <p className="mt-1 text-[10px] text-slate-400">
              {language === "ar"
                ? "أو انقر للتصفح"
                : "or click to browse"}
            </p>
            <p className="mt-2 text-[10px] text-slate-400">
              {language === "ar"
                ? "الحد الأقصى 10MB • JPG, PNG, PDF, SVG, PSD, EPS, AI"
                : "Max 10MB • JPG, PNG, PDF, SVG, PSD, EPS, AI"}
            </p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf,image/svg+xml,image/vnd.adobe.photoshop,application/postscript,.ai"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          multiple={false}
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 p-2 rounded bg-yellow-50 border border-yellow-200 text-xs">
          <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
          <p className="text-yellow-800">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-slate-700">
          {language === "ar" ? "أنواع الملفات المدعومة:" : "Supported file types:"}
        </p>
        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600">
          <div className="flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            <span>JPG, PNG, WEBP</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>PDF</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>SVG</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>PSD</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>EPS, AI</span>
          </div>
        </div>
      </div>

      {/* Bulk Upload Section */}
      <div className="pt-4 border-t border-slate-200">
        <BulkUpload
          onUploadComplete={(files) => {
            files.forEach(async (file) => {
              if (file.url) {
                addLayer({
                  type: "image" as any,
                  name: file.name || "Image",
                  visible: true,
                  locked: false,
                  opacity: 1,
                  blendMode: "normal",
                  position: { x: 100, y: 100 },
                  scale: { x: 1, y: 1 },
                  rotation: 0,
                  faceId: "front",
                  imageProperties: {
                    src: file.url,
                  },
                } as any);
              }
            });
          }}
        />
      </div>
    </div>
  )
}

