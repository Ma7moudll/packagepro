"use client"

import { useCollaborationStore } from "@/lib/collaboration/collaboration-store"
import { User } from "lucide-react"

export function PresenceIndicator() {
  const users = useCollaborationStore((s) => Array.from(s.users.values()))
  const currentUser = useCollaborationStore((s) => s.currentUser)
  const isConnected = useCollaborationStore((s) => s.isConnected)

  if (!isConnected || users.length === 0) return null

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="flex -space-x-2">
        {users.slice(0, 5).map((user) => (
          <div
            key={user.id}
            className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white"
            style={{ backgroundColor: user.color }}
            title={user.name}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
        ))}
        {users.length > 5 && (
          <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-400 flex items-center justify-center text-xs font-medium text-white">
            +{users.length - 5}
          </div>
        )}
      </div>
      <span className="text-xs text-slate-600">
        {users.length} {users.length === 1 ? "user" : "users"} online
      </span>
    </div>
  )
}

