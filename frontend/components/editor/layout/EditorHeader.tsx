"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useDesignStore } from "@/lib/editor/state/store"
import { Button } from "@/components/ui/button"
import {
  Undo,
  Redo,
  X,
  CheckCircle2,
  Loader2,
  Eye,
  Pencil,
  HelpCircle,
  Camera,
  Share2,
  Save,
} from "lucide-react"
import { scheduleAutoSave, cancelAutoSave } from "@/lib/editor/services/storage"
import { useLanguage } from "@/providers/language-provider"
import { MockupGallery } from "@/components/editor/preview/MockupGallery"
import { ShareDialog } from "@/components/editor/collaboration/ShareDialog"
import { TutorialOverlay } from "@/components/editor/TutorialOverlay"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface EditorHeaderProps {
  extra?: React.ReactNode
}

export function EditorHeader({ extra }: EditorHeaderProps) {
  const { language } = useLanguage()
  const { model, history } = useDesignStore()
  const undo = useDesignStore((s) => s.undo)
  const redo = useDesignStore((s) => s.redo)
  const setViewMode = useDesignStore((s) => s.setViewMode)
  const viewMode = useDesignStore((s) => s.ui.viewMode)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [showTutorial, setShowTutorial] = useState(false)

  const title = `${model.type.replace(/_/g, " ")} ${model.dimensions.length}×${model.dimensions.width}×${model.dimensions.height}mm`

  // Auto-save on state changes
  useEffect(() => {
    const designId = "current-design"
    const name = title
    const state = useDesignStore.getState()
    const coreState = state.history.present

    scheduleAutoSave(designId, name, coreState, false)
    setSaveStatus("saving")

    const timer = setTimeout(() => {
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
    }, 500)

    return () => {
      cancelAutoSave()
      clearTimeout(timer)
    }
  }, [history.present, title])

  const handleSave = async () => {
    setSaveStatus("saving")
    try {
      const designId = "current-design"
      const name = title
      const state = useDesignStore.getState()
      const coreState = state.history.present
      const { saveDesignToIndexedDB } = await import("@/lib/editor/services/storage")
      await saveDesignToIndexedDB(designId, name, coreState)
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
    } catch (error) {
      console.error("Save failed:", error)
      setSaveStatus("error")
      setTimeout(() => setSaveStatus("idle"), 3000)
    }
  }

  const canUndo = history.past.length > 0
  const canRedo = history.future.length > 0

  return (
    <TooltipProvider>
      <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between">
        {/* Left: Logo & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-sm">
              P
            </span>
          </Link>
          
          <div className="h-5 w-px bg-slate-200" />
          
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-slate-800 truncate capitalize">{title}</h1>
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              {saveStatus === "saving" && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>{language === "ar" ? "جارٍ الحفظ..." : "Saving..."}</span>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span className="text-emerald-600">{language === "ar" ? "تم الحفظ" : "Saved"}</span>
                </>
              )}
              {saveStatus === "idle" && (
                <span>{language === "ar" ? "محفوظ تلقائياً" : "Auto-saved"}</span>
              )}
            </div>
          </div>

          {extra}
        </div>

        {/* Center: View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("2d")}
            className={`h-8 px-4 rounded-md text-xs font-medium ${
              viewMode === "2d"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            {language === "ar" ? "تصميم" : "Design"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("3d")}
            className={`h-8 px-4 rounded-md text-xs font-medium ${
              viewMode === "3d"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            {language === "ar" ? "معاينة 3D" : "Preview 3D"}
          </Button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <div className="flex items-center gap-0.5 bg-slate-50 rounded-lg p-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-md"
                  onClick={undo}
                  disabled={!canUndo}
                >
                  <Undo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {language === "ar" ? "تراجع (Ctrl+Z)" : "Undo (Ctrl+Z)"}
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-md"
                  onClick={redo}
                  disabled={!canRedo}
                >
                  <Redo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {language === "ar" ? "إعادة (Ctrl+Y)" : "Redo (Ctrl+Y)"}
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="h-5 w-px bg-slate-200" />

          {/* Mockup & Share */}
          <MockupGallery />
          <ShareDialog />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md"
                onClick={() => setShowTutorial(true)}
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {language === "ar" ? "دليل الاستخدام" : "Tutorial"}
            </TooltipContent>
          </Tooltip>

          <div className="h-5 w-px bg-slate-200" />

          {/* Save Button */}
          <Button
            size="sm"
            className="bg-slate-900 hover:bg-slate-800 text-white font-medium h-8 px-4 rounded-lg"
            onClick={handleSave}
            disabled={saveStatus === "saving"}
          >
            {saveStatus === "saving" ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            {language === "ar" ? "حفظ" : "Save"}
          </Button>

          {/* Close */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {language === "ar" ? "إغلاق المحرر" : "Close Editor"}
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      {/* Tutorial Overlay */}
      <TutorialOverlay
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </TooltipProvider>
  )
}
