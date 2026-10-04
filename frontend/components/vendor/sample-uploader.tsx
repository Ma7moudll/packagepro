"use client"

import { useCallback, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/providers/language-provider"
import { UploadCloud, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Drag-and-drop photo uploader for production samples (SPEC-029 Week 8).
 * Files are held locally as previews; onUpload receives the selected files
 * and performs the actual upload (vendorsApi.uploadSamples).
 */

export interface UploadablePhoto {
  file: File
  previewUrl: string
}

const MAX_PHOTOS = 5
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"]

interface SampleUploaderProps {
  onUpload: (photos: UploadablePhoto[]) => Promise<void>
  disabled?: boolean
}

export function SampleUploader({ onUpload, disabled }: SampleUploaderProps) {
  const { language } = useLanguage()
  const inputRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<UploadablePhoto[]>([])
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addFiles = useCallback((files: FileList | File[]) => {
    setError(null)
    setPhotos((prev) => {
      const remaining = MAX_PHOTOS - prev.length
      if (remaining <= 0) {
        setError(language === "ar" ? `الحد الأقصى ${MAX_PHOTOS} صور` : `Up to ${MAX_PHOTOS} photos`)
        return prev
      }
      const accepted: UploadablePhoto[] = []
      for (const file of Array.from(files).slice(0, remaining)) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          setError(language === "ar" ? "الصيغ المدعومة: JPG / PNG / WEBP" : "Supported: JPG / PNG / WEBP")
          continue
        }
        if (file.size > 10 * 1024 * 1024) {
          setError(language === "ar" ? "حجم الصورة يتجاوز 10MB" : "Image exceeds 10MB")
          continue
        }
        accepted.push({ file, previewUrl: URL.createObjectURL(file) })
      }
      return [...prev, ...accepted]
    })
  }, [language])

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  const submit = async () => {
    if (photos.length === 0) return
    setUploading(true)
    setError(null)
    try {
      await onUpload(photos)
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl))
      setPhotos([])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-label={language === "ar" ? "رفع صور العينة" : "Upload sample photos"}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer",
          dragging ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-slate-300",
          disabled && "pointer-events-none opacity-50"
        )}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
        }}
      >
        <UploadCloud className="h-8 w-8 text-slate-400" />
        <p className="text-sm text-slate-600">
          {language === "ar"
            ? "اسحب الصور هنا أو اضغط للاختيار"
            : "Drag photos here or click to browse"}
        </p>
        <p className="text-xs text-slate-400">
          JPG / PNG / WEBP — {language === "ar" ? "حتى 10MB" : "up to 10MB"}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) addFiles(e.target.files)
            e.target.value = ""
          }}
        />
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-5 gap-2">
          {photos.map((photo, i) => (
            <div key={photo.previewUrl} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.previewUrl}
                alt={`Sample ${i + 1}`}
                className="aspect-square w-full rounded-md object-cover border"
              />
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => removePhoto(i)}
                className="absolute -top-1.5 -end-1.5 rounded-full bg-rose-600 text-white p-0.5 opacity-90 hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-rose-600">{error}</p>}

      <Button
        className="w-full"
        onClick={submit}
        disabled={photos.length === 0 || uploading || disabled}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            {language === "ar" ? "جارٍ الرفع…" : "Uploading…"}
          </>
        ) : (
          <>
            <UploadCloud className="h-4 w-4 mr-2" />
            {language === "ar" ? "إرسال للمراجعة" : "Submit for QA review"}
          </>
        )}
      </Button>
    </div>
  )
}
