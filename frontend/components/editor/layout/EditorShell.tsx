"use client"

import { ReactNode, useState } from "react"
import { useDesignStore } from "@/lib/editor/state/store"
import { EditorHeader } from "./EditorHeader"
import { EditorLeftSidebar } from "./EditorLeftSidebar"
import { EditorRightSidebar } from "./EditorRightSidebar"
import { EditorBottomBar } from "./EditorBottomBar"
import { useKeyboardShortcuts } from "@/lib/editor/hooks/useKeyboardShortcuts"

interface EditorShellProps {
  headerExtra?: ReactNode
  onSessionSaved?: (sessionId:string)=>void
  center: ReactNode
}

export function EditorShell({ headerExtra, center, onSessionSaved }: EditorShellProps) {
  const leftSidebarOpen = useDesignStore((s) => s.ui.leftSidebarOpen)
  const rightSidebarOpen = useDesignStore((s) => s.ui.rightSidebarOpen)

  const [cartOpen, setCartOpen] = useState(false)
  useKeyboardShortcuts()

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <EditorHeader extra={headerExtra} onSessionSaved={onSessionSaved} cartOpen={cartOpen} onCartOpenChange={setCartOpen} />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: persistent icon rail (w-14); panel widens it when open */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out bg-white border-r border-slate-200 max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:z-40 max-lg:shadow-xl ${
            leftSidebarOpen ? "w-80 xl:w-80 lg:w-72" : "w-14"
          }`}
        >
          <div className="w-full h-full overflow-y-auto">
            <EditorLeftSidebar />
          </div>
        </div>

        {leftSidebarOpen && (
          <div
            className="hidden max-lg:block fixed inset-0 bg-black/30 z-30"
            onClick={() => useDesignStore.getState().setLeftSidebarOpen(false)}
          />
        )}

        <main className="flex-1 relative bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-50 to-slate-200 overflow-hidden">
          {center}
        </main>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out border-l border-slate-200 max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-40 max-lg:shadow-xl ${
            rightSidebarOpen ? "w-72 xl:w-72 lg:w-64" : "w-0"
          }`}
        >
          <div className="w-full h-full bg-white overflow-y-auto">
            <EditorRightSidebar onContinue={() => setCartOpen(true)} />
          </div>
        </div>

        {rightSidebarOpen && (
          <div
            className="hidden max-lg:block fixed inset-0 bg-black/30 z-30"
            onClick={() => useDesignStore.getState().setRightSidebarOpen(false)}
          />
        )}
      </div>

      <EditorBottomBar />
    </div>
  )
}
