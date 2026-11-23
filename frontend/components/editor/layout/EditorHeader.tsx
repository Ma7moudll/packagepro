"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import {cartDesignFingerprint} from "@/lib/editor/cart-design-fingerprint"
import {editorRequiresQuote} from "@/lib/editor/quote-policy"
import { useDesignStore } from "@/lib/editor/state/store"
import { Button } from "@/components/ui/button"
import {
  Undo,
  Redo,
  X,
  CheckCircle2,
  Loader2,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Save,
  MoreHorizontal,
  Camera,
  Share2,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { scheduleAutoSave, cancelAutoSave, ensureCloudSession } from "@/lib/editor/services/storage"
import { useLanguage } from "@/providers/language-provider"
import { useAuth } from "@/providers/auth-provider"
import { MockupGallery } from "@/components/editor/preview/MockupGallery"
import { ShareDialog } from "@/components/editor/collaboration/ShareDialog"
import { TutorialOverlay } from "@/components/editor/TutorialOverlay"
import { AddToCart } from "@/components/design-editor/checkout/AddToCart"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface EditorHeaderProps {
  onPropertiesToggle?: () => void
  extra?: React.ReactNode
  onSessionSaved?: (sessionId:string)=>void
  cartOpen?: boolean
  onCartOpenChange?: (open:boolean)=>void
}

function mapProductType(type: string): "box" | "bag" | "label" {
  const t = (type || "").toLowerCase()
  if (t.includes("bag") || t.includes("pouch")) return "bag"
  if (t.includes("label")) return "label"
  return "box"
}

export function EditorHeader({ onPropertiesToggle, extra, cartOpen, onCartOpenChange, onSessionSaved }: EditorHeaderProps) {
  const { language } = useLanguage()
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get("sessionId")
  const model = useDesignStore((s) => s.model)
  const customQuote = useDesignStore(editorRequiresQuote)
  const layersCount = useDesignStore((s) => s.layers.length)
  const pastLength = useDesignStore((s) => s.history.past.length)
  const futureLength = useDesignStore((s) => s.history.future.length)
  const undo = useDesignStore((s) => s.undo)
  const redo = useDesignStore((s) => s.redo)
  const leftSidebarOpen = useDesignStore((s) => s.ui.leftSidebarOpen)
  const rightSidebarOpen = useDesignStore((s) => s.ui.rightSidebarOpen)
  const setLeftSidebarOpen = useDesignStore((s) => s.setLeftSidebarOpen)
  const setRightSidebarOpen = useDesignStore((s) => s.setRightSidebarOpen)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const { user } = useAuth()
  // Manual Save must stay clickable while the autosave debounce is pending
  // (the pill reads "Saving..." for the whole 30s window); disable only while
  // an actual manual save request is in flight.
  const [manualSaving, setManualSaving] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [mockupOpen, setMockupOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  const title = `${model.type.replace(/_/g, " ")} ${model.dimensions.length}×${model.dimensions.width}×${model.dimensions.height}mm`

  // Auto-save on state changes. The status pill reflects the real write: the
  // debounced IndexedDB save fires 30s after the last change, and only then do
  // we show "Saved" — previously the pill flipped to saved after 500ms while
  // nothing had been written yet.
  useEffect(() => {
    const designId = "current-design"
    const name = title
    const state = useDesignStore.getState()
    const coreState = state.history.present

    setSaveStatus("saving")
    scheduleAutoSave(designId, name, coreState, false, () => {
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
    }, () => {
      setSaveStatus("error")
    })

    return () => {
      cancelAutoSave()
    }
  }, [model.dimensions, layersCount, title])

  const handleSave = async () => {
    setManualSaving(true)
    setSaveStatus("saving")
    try {
      const designId = "current-design"
      const name = title
      const state = useDesignStore.getState()
      const coreState = state.history.present
      const { saveDesignToIndexedDB } = await import("@/lib/editor/services/storage")
      await saveDesignToIndexedDB(designId, name, coreState)

      // Persist to the backend (durable, reload-safe)
      try {
        const sid = await ensureCloudSession(sessionId, name, coreState)
        if (sid) onSessionSaved?.(sid)
        if (sid && sid !== sessionId) {
          const params = new URLSearchParams(searchParams.toString())
          params.set("sessionId", sid)
          router.replace(`${window.location.pathname}?${params.toString()}`)
        }
      } catch (cloudError) {
        console.error("Cloud save failed:", cloudError)
        // IndexedDB already saved; surface error state still marks saved so the
        // user knows their work is not lost locally.
      }

      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
    } catch (error) {
      console.error("Save failed:", error)
      setSaveStatus("error")
      // Keep failure visible until the next save attempt.
    } finally {
      setManualSaving(false)
    }
  }

  const handleEnsureSession = async () => {
    const name = title
    const coreState = useDesignStore.getState().history.present
    const sid = await ensureCloudSession(sessionId, name, coreState)
    if (sid) onSessionSaved?.(sid)
    if (sid && sid !== sessionId) {
      const params = new URLSearchParams(searchParams.toString())
      params.set("sessionId", sid)
      router.replace(`${window.location.pathname}?${params.toString()}`)
    }
    return sid
  }

  const canUndo = pastLength > 0
  const canRedo = futureLength > 0

  return (
    <TooltipProvider>
      <header className="h-14 bg-white border-b border-slate-200 px-3 flex items-center justify-between gap-2">
        {/* Left: Logo, Sidebar Toggles & Title */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 shrink-0">
          <Link href="/" className="hidden sm:flex items-center gap-2 shrink-0">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-sm">
              P
            </span>
          </Link>

          {/* Sidebar Toggles */}
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-md text-slate-400 hover:text-slate-700"
                  onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
                >
                  {leftSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {leftSidebarOpen
                  ? (language === "ar" ? "إخفاء الشريط الجانبي" : "Hide Sidebar")
                  : (language === "ar" ? "إظهار الشريط الجانبي" : "Show Sidebar")}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-md text-slate-400 hover:text-slate-700"
                  data-toggle-properties
                  onClick={onPropertiesToggle ?? (() => setRightSidebarOpen(!rightSidebarOpen))}
                >
                  {rightSidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {rightSidebarOpen
                  ? (language === "ar" ? "إخفاء الخصائص" : "Hide Properties")
                  : (language === "ar" ? "إظهار الخصائص" : "Show Properties")}
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="hidden xl:block h-5 w-px bg-slate-200" />

          <div className="hidden xl:block min-w-0">
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
              {saveStatus === "error" && (
                <span role="status" className="text-red-600">{language === "ar" ? "تعذر الحفظ" : "Save failed"}</span>
              )}
              {saveStatus === "idle" && (
                <span>
                  {user
                    ? language === "ar" ? "محفوظ تلقائياً" : "Auto-saved"
                    : language === "ar" ? "محفوظ على هذا الجهاز" : "Saved on this device"}
                </span>
              )}
            </div>
          </div>

          {extra}
        </div>

        {/* Center: Title Info */}
        <div className="hidden xl:flex items-center gap-3 text-xs text-slate-400">
          <span>{model.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>
          <span className="text-slate-300">|</span>
          <span>{language === "ar" ? "طبقات" : "Layers"}: {layersCount}</span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
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

          <div className="hidden xl:block h-5 w-px bg-slate-200" />

          {/* Mockup & Share */}
          <div className="hidden xl:flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8" onClick={() => setMockupOpen(true)}><Camera className="h-4 w-4 mr-2" />{language === "ar" ? "معاينة Mockup" : "Mockup Preview"}</Button>
            <Button variant="outline" size="sm" className="h-8" onClick={() => setShareOpen(true)}><Share2 className="h-4 w-4 mr-2" />{language === "ar" ? "مشاركة" : "Share"}</Button>
          </div>

          {/* Below xl: Mockup, Share and Tutorial move into one menu */}
          <div className="xl:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-md"
                  aria-label={language === "ar" ? "المزيد" : "More"}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setMockupOpen(true)}>
                  <Camera className="h-4 w-4 mr-2" />
                  {language === "ar" ? "معاينة Mockup" : "Mockup Preview"}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setShareOpen(true)}>
                  <Share2 className="h-4 w-4 mr-2" />
                  {language === "ar" ? "مشاركة" : "Share"}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setShowTutorial(true)}>
                  <HelpCircle className="h-4 w-4 mr-2" />
                  {language === "ar" ? "دليل الاستخدام" : "Tutorial"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <MockupGallery open={mockupOpen} onOpenChange={setMockupOpen} hideTrigger />
          <ShareDialog open={shareOpen} onOpenChange={setShareOpen} hideTrigger />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hidden xl:inline-flex h-8 w-8 rounded-md"
                aria-label={language === "ar" ? "دليل الاستخدام" : "Tutorial"}
                onClick={() => setShowTutorial(true)}
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {language === "ar" ? "دليل الاستخدام" : "Tutorial"}
            </TooltipContent>
          </Tooltip>

          <div className="hidden xl:block h-5 w-px bg-slate-200" />

          {/* Add to Cart */}
          <AddToCart
            open={cartOpen}
            onOpenChange={onCartOpenChange}
            getDesignRevision={() => cartDesignFingerprint(useDesignStore.getState().history.present)}
            quoteRequired={customQuote}
            productType={mapProductType(model.type)}
            materialCode={model.material || "cardboard-kraft"}
            dimensions={model.dimensions}
            defaultQuantity={model.quantity || 30}
            onEnsureSession={handleEnsureSession}
          />

          <div className="hidden xl:block h-5 w-px bg-slate-200" />

          {/* Save Button */}
          <Button
            size="sm"
            className="bg-slate-900 hover:bg-slate-800 text-white font-medium h-8 px-3 sm:px-4 rounded-lg"
            aria-label={language === "ar" ? "حفظ" : "Save"}
            data-save-status={saveStatus}
            onClick={handleSave}
            disabled={manualSaving}
          >
            {saveStatus === "saving" ? (
              <Loader2 className="h-4 w-4 sm:mr-1.5 animate-spin" />
            ) : (
              <Save className="h-4 w-4 sm:mr-1.5" />
            )}
            <span className="hidden sm:inline">{language === "ar" ? "حفظ" : "Save"}</span>
          </Button>

          {/* Close */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-500"
                  aria-label={language === "ar" ? "إغلاق المحرر" : "Close Editor"}
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
