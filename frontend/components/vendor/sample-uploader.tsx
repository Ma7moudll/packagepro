"use client"

import { useCallback, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/providers/language-provider"
import { ApiClientError } from "@/lib/api/client"
import { UploadCloud, Loader2, X, AlertTriangle } from "lucide-react"
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
  /** Reload the current server-side sample state (conflict resolution). */
  onReload?: () => Promise<void>
  closed?: boolean
  disabled?: boolean
}

/**
 * A 409 from the samples endpoint means the sample state changed while
 * the vendor was working (it was reviewed, another upload landed, or the
 * production/order moved on) — the backend answers "Sample changed
 * during upload; reload before retrying" / "Production is closed for
 * sample upload". That is a conflict to resolve explicitly, not a
 * generic upload failure.
 */
function isConflictError(err: unknown): boolean {
  if (err instanceof ApiClientError) return err.status === 409
  return (err as { status?: unknown } | null)?.status === 409
}

export function SampleUploader({ onUpload, onReload, disabled, closed }: SampleUploaderProps) {
  const { language } = useLanguage()
  const inputRef = useRef<HTMLInputElement>(null)
  const submitInFlight = useRef(false)
  const [photos, setPhotos] = useState<UploadablePhoto[]>([])
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [reloading, setReloading] = useState(false)

  const addFiles = useCallback((files: FileList | File[]) => {
    if (closed || disabled || uploading) return
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
  }, [language, closed, disabled, uploading])

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  const submit = async () => {
    if (photos.length === 0 || submitInFlight.current || closed || disabled || conflict || reloading) return
    submitInFlight.current = true
    setUploading(true)
    setError(null)
    try {
      await onUpload(photos)
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl))
      setPhotos([])
      setConflict(false)
    } catch (err) {
      if (isConflictError(err)) {
        // Nothing was committed and nothing is retried automatically:
        // the selected photos stay selected until the vendor explicitly
        // reloads the current sample or dismisses and keeps editing.
        setConflict(true)
      } else {
        setError(language === "ar" ? "تعذر رفع الصور. صورك المحددة ما زالت هنا. حاول مرة أخرى." : "Upload failed. Your selected photos are still here. Try again.")
      }
    } finally {
      submitInFlight.current = false
      setUploading(false)
    }
  }

  const handleReload = async () => {
    if (!onReload || reloading) return
    setReloading(true)
    setError(null)
    try {
      await onReload()
      setConflict(false)
    } catch (err) {
      setError(language === "ar" ? "تعذر تحديث الحالة. صورك المحددة ما زالت هنا. أعد تحميل العينة الحالية." : "Could not refresh the current state. Your selected photos are still here. Reload current sample again.")
    } finally {
      setReloading(false)
    }
  }

  if (closed && photos.length === 0) return null

  return (
    <div className="space-y-3">
      {closed && <p role="status" className="text-sm text-amber-800">{language === "ar" ? "الإرسال غير متاح في الحالة الحالية. صورك المحددة محفوظة هنا حتى تغادر الصفحة." : "Submission is unavailable in the current state. Your selected photos stay here until you leave this page."}</p>}
      {!closed && <>
      <div
        role="button"
        tabIndex={disabled || uploading ? -1 : 0}
        aria-disabled={disabled || uploading}
        aria-label={language === "ar" ? "رفع صور العينة" : "Upload sample photos"}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer",
          dragging ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-slate-300",
          (disabled || uploading) && "pointer-events-none opacity-50"
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
          disabled={disabled || uploading || closed}
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) addFiles(e.target.files)
            e.target.value = ""
          }}
        />
      </div>

      </>}
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

      {conflict && (
        <div
          role="alert"
          className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-2"
        >
          <p className="flex items-center gap-2 text-sm font-medium text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {language === "ar"
              ? "تغيّرت حالة العينة أثناء عملك"
              : "Sample changed while you were working"}
          </p>
          <p className="text-xs text-amber-700">
            {language === "ar"
              ? "تعذر اعتماد هذا الإرسال بسبب تعارض في الحالة الحالية، مثل إرسال آخر أو مراجعة العينة أو تغيّر حالة الإنتاج. صورك المحددة ما زالت هنا. أعد تحميل الحالة الحالية قبل أن تقرر الإرسال مجددا، أو تابع التحرير."
              : "This submission could not be accepted because the current state conflicts, for example another submission, a review, or a production change. Your selected photos are still here. Reload the current state before deciding whether to submit again, or keep editing."}
          </p>
          <div className="flex flex-wrap gap-2">
            {onReload && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleReload}
                disabled={reloading}
              >
                {reloading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                {language === "ar" ? "إعادة تحميل العينة الحالية" : "Reload current sample"}
              </Button>
            )}
            <Button type="button" size="sm" variant="ghost" disabled={reloading} onClick={() => setConflict(false)}>
              {language === "ar" ? "متابعة التحرير" : "Keep editing"}
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-rose-600">{error}</p>}

      <Button
        className="w-full"
        onClick={submit}
        disabled={photos.length === 0 || uploading || closed || disabled || conflict || reloading}
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
