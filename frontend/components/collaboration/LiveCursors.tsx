"use client"

import { useEffect, useRef } from "react"
import { useCollaborationStore } from "@/lib/collaboration/collaboration-store"
import { CollaborationUser } from "@/lib/collaboration/types"

interface LiveCursorsProps {
  canvasRef: React.RefObject<HTMLCanvasElement | HTMLDivElement>
  faceId: string
}

export function LiveCursors({ canvasRef, faceId }: LiveCursorsProps) {
  const users = useCollaborationStore((s) => Array.from(s.users.values()))
  const currentUser = useCollaborationStore((s) => s.currentUser)

  // Filter users with cursors on current face
  const visibleUsers = users.filter(
    (user) => user.id !== currentUser?.id && user.cursor && user.cursor.faceId === faceId
  )

  if (visibleUsers.length === 0) return null

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {visibleUsers.map((user) => (
        <LiveCursor key={user.id} user={user} canvasRef={canvasRef} />
      ))}
    </div>
  )
}

function LiveCursor({
  user,
  canvasRef,
}: {
  user: CollaborationUser
  canvasRef: React.RefObject<HTMLCanvasElement | HTMLDivElement>
}) {
  const cursorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user.cursor || !cursorRef.current || !canvasRef.current) return

    const updatePosition = () => {
      if (!user.cursor || !cursorRef.current || !canvasRef.current) return

      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()

      const x = rect.left + user.cursor.x
      const y = rect.top + user.cursor.y

      cursorRef.current.style.left = `${x}px`
      cursorRef.current.style.top = `${y}px`
    }

    updatePosition()
    const interval = setInterval(updatePosition, 100)

    return () => clearInterval(interval)
  }, [user.cursor, canvasRef])

  if (!user.cursor) return null

  return (
    <div
      ref={cursorRef}
      className="absolute pointer-events-none"
      style={{
        transform: "translate(-8px, -8px)",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" className="drop-shadow-lg">
        <path
          d="M2 2 L2 12 L6 8 L9 11 L12 8 L14 10 L14 2 Z"
          fill={user.color}
          stroke="white"
          strokeWidth="1"
        />
      </svg>
      <div
        className="absolute top-5 left-0 px-2 py-1 rounded text-xs text-white whitespace-nowrap"
        style={{
          backgroundColor: user.color,
        }}
      >
        {user.name}
      </div>
    </div>
  )
}

