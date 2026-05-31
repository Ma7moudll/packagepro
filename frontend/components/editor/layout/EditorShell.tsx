"use client"

import { ReactNode } from "react"
import { useDesignStore } from "@/lib/editor/state/store"
import { EditorHeader } from "./EditorHeader"
import { EditorLeftSidebar } from "./EditorLeftSidebar"
import { EditorRightSidebar } from "./EditorRightSidebar"
import { EditorBottomBar } from "./EditorBottomBar"
import { useKeyboardShortcuts } from "@/lib/editor/hooks/useKeyboardShortcuts"

interface EditorShellProps {
  headerExtra?: ReactNode
  center: ReactNode
}

export function EditorShell({ headerExtra, center }: EditorShellProps) {
  const ui = useDesignStore((s) => s.ui)

  // Enable keyboard shortcuts
  useKeyboardShortcuts()

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <EditorHeader extra={headerExtra} />

      <div className="flex-1 flex overflow-hidden">
        {ui.leftSidebarOpen && <EditorLeftSidebar />}

        <main className="flex-1 relative bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-50 to-slate-200 overflow-hidden">
          {center}
        </main>

        {ui.rightSidebarOpen && <EditorRightSidebar />}
      </div>

      <EditorBottomBar />
    </div>
  )
}
