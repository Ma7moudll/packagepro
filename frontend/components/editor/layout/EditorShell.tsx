"use client"

import { useLanguage } from "@/providers/language-provider"
import { ReactNode, useState } from "react"
import { useDesignStore } from "@/lib/editor/state/store"
import { EditorHeader } from "./EditorHeader"
import { EditorLeftSidebar } from "./EditorLeftSidebar"
import { EditorRightSidebar } from "./EditorRightSidebar"
import { EditorBottomBar } from "./EditorBottomBar"
import { useKeyboardShortcuts } from "@/lib/editor/hooks/useKeyboardShortcuts"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { unsupportedArtworkOutputMessage, unsupportedSheetArtwork } from "@/lib/editor/print-coverage"

interface EditorShellProps {
  headerExtra?: ReactNode
  onSessionSaved?: (sessionId:string)=>void
  center: ReactNode
}

export function EditorShell({ headerExtra, center, onSessionSaved }: EditorShellProps) {
  const { language } = useLanguage()
  const contentDirection = language === "ar" ? "rtl" : "ltr"
  const leftSidebarOpen = useDesignStore((s) => s.ui.leftSidebarOpen)
  const rightSidebarOpen = useDesignStore((s) => s.ui.rightSidebarOpen)
  // Visible notice (never silent): a two-face card carrying artwork on
  // inside faces keeps that artwork in the design data, but the preview
  // cannot show it and proof/export stay blocked until it is resolved.
  const unsupportedArtworkNotice = useDesignStore((s) => {
    const unsupported = unsupportedSheetArtwork(s.model.faces, s.layers, s.model.type)
    // Same wording as the shared output boundary: it names exactly the
    // outputs that are really blocked, no more and no less.
    return unsupported ? unsupportedArtworkOutputMessage(unsupported) : ""
  })

  const pouchWarning = useDesignStore(s=>s.model.type==='stand_up_pouch')
  const [noticeExpanded, setNoticeExpanded] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  useKeyboardShortcuts()

  const [rightPanelTouched, setRightPanelTouched] = useState(false)

  return (
    <div className="h-screen w-full min-w-0 flex flex-col bg-slate-50">
      <EditorHeader onPropertiesToggle={() => {
        const mobile = window.matchMedia("(max-width: 1023px)").matches
        useDesignStore.getState().setRightSidebarOpen(mobile && !rightPanelTouched ? true : !rightSidebarOpen)
        setRightPanelTouched(true)
      }} extra={headerExtra} onSessionSaved={onSessionSaved} cartOpen={cartOpen} onCartOpenChange={setCartOpen} />

      <div dir="ltr" className="min-h-0 w-full min-w-0 flex-1 flex overflow-hidden relative">
        {/* Left: persistent icon rail (w-14); panel widens it when open */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out bg-white border-r border-slate-200 max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:z-40 max-lg:shadow-xl ${
            leftSidebarOpen ? "w-80 xl:w-80 lg:w-72" : "w-14"
          }`}
        >
          <div dir={contentDirection} className="w-full h-full overflow-y-auto">
            <EditorLeftSidebar />
          </div>
        </div>

        {leftSidebarOpen && (
          <div
            className="hidden max-lg:block fixed inset-0 bg-black/30 z-30"
            onClick={() => useDesignStore.getState().setLeftSidebarOpen(false)}
          />
        )}

        <main data-editor-workspace dir={contentDirection} className="max-lg:absolute max-lg:inset-y-0 max-lg:left-14 max-lg:right-0 min-w-0 flex-1 relative bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-50 to-slate-200 overflow-hidden">
          <div className="flex h-full w-full min-w-0 min-h-0 flex-col">
            {unsupportedArtworkNotice && (
              <div data-unsupported-artwork-warning role="alert" className="w-full min-w-0 shrink-0 border-b border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                <p>{pouchWarning ? "Unsupported pouch artwork is preserved. Outputs are blocked." : "Inside-face artwork is preserved. Outputs are blocked."}</p>
                <button type="button" className="underline" aria-haspopup="dialog" onClick={() => setNoticeExpanded(true)}>Details</button>
                <Dialog open={noticeExpanded} onOpenChange={setNoticeExpanded}>
                  <DialogContent className="max-h-[80dvh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="pr-8">Unsupported artwork</DialogTitle>
                      <DialogDescription className="break-words text-left leading-relaxed">{unsupportedArtworkNotice}</DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </div>
            )}
            <div className="relative w-full min-w-0 min-h-0 flex-1">{center}</div>
          </div>
        </main>

        <div
          data-editor-properties
          className={`overflow-hidden transition-all duration-300 ease-in-out border-l border-slate-200 max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-40 max-lg:shadow-xl ${
            rightSidebarOpen ? `${rightPanelTouched ? "" : "max-lg:!w-0"} w-72 xl:w-72 lg:w-64` : "w-0"
          }`}
        >
          <div dir={contentDirection} className="w-full h-full bg-white overflow-y-auto">
            <EditorRightSidebar onContinue={() => setCartOpen(true)} />
          </div>
        </div>

        {rightSidebarOpen && (
          <div
            className={`${rightPanelTouched ? "max-lg:block" : ""} hidden fixed inset-0 bg-black/30 z-30`}
            onClick={() => useDesignStore.getState().setRightSidebarOpen(false)}
          />
        )}
      </div>

      <EditorBottomBar />
    </div>
  )
}
