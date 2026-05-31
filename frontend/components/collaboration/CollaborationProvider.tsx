"use client"

import { useEffect, ReactNode } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { useCollaborationStore } from "@/lib/collaboration/collaboration-store"
import { LiveCursors } from "./LiveCursors"
import { PresenceIndicator } from "./PresenceIndicator"
import { CollaborationChat } from "./CollaborationChat"
import { CommentsPanel } from "./CommentsPanel"
import { PermissionsPanel } from "./PermissionsPanel"

interface CollaborationProviderProps {
  children: ReactNode
  canvasRef?: React.RefObject<HTMLCanvasElement | HTMLDivElement>
  faceId?: string
}

export function CollaborationProvider({
  children,
  canvasRef,
  faceId = "front",
}: CollaborationProviderProps) {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const roomId = searchParams.get("roomId")
  const connect = useCollaborationStore((s) => s.connect)
  const disconnect = useCollaborationStore((s) => s.disconnect)
  const updatePresence = useCollaborationStore((s) => s.updatePresence)
  const isConnected = useCollaborationStore((s) => s.isConnected)

  useEffect(() => {
    if (!session?.user || !roomId) return

    connect(
      roomId,
      session.user.id || "",
      session.user.name || "User",
      session.user.email || ""
    )

    return () => {
      disconnect()
    }
  }, [session, roomId, connect, disconnect])

  // Track cursor movement
  useEffect(() => {
    if (!isConnected || !canvasRef?.current) return

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      updatePresence({
        userId: session?.user?.id || "",
        cursor: { x, y, faceId },
      })
    }

    const canvas = canvasRef.current
    canvas.addEventListener("mousemove", handleMouseMove)

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove)
    }
  }, [isConnected, canvasRef, faceId, session, updatePresence])

  if (!roomId) {
    return <>{children}</>
  }

  return (
    <>
      {children}
      {isConnected && (
        <>
          {canvasRef && <LiveCursors canvasRef={canvasRef} faceId={faceId} />}
          <PresenceIndicator />
          <CollaborationChat />
          <CommentsPanel />
          <PermissionsPanel />
        </>
      )}
    </>
  )
}

