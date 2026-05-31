"use client"

import { create } from "zustand"
import { nanoid } from "nanoid"
import {
  CollaborationState,
  CollaborationUser,
  CollaborationMessage,
  Comment,
  Permission,
  PresenceData,
} from "./types"
import { collaborationSocket } from "./socket-client"
import { yjsProvider } from "./yjs-provider"

interface CollaborationStore extends CollaborationState {
  // Actions
  connect: (roomId: string, userId: string, userName: string, userEmail: string) => void
  disconnect: () => void
  updatePresence: (presence: PresenceData) => void
  sendMessage: (content: string) => void
  addComment: (comment: Omit<Comment, "id" | "userId" | "userName" | "userAvatar" | "timestamp">) => void
  resolveComment: (commentId: string) => void
  setPermission: (permission: Permission) => void
  updateLayer: (layerId: string, updates: any) => void
}

const generateUserColor = (userId: string): string => {
  const colors = [
    "#ef4444", // red
    "#f59e0b", // amber
    "#10b981", // emerald
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#ec4899", // pink
  ]
  const index = parseInt(userId.slice(-1), 16) % colors.length
  return colors[index]
}

export const useCollaborationStore = create<CollaborationStore>((set, get) => {
  // Setup socket event listeners
  const setupSocketListeners = () => {
    collaborationSocket.on("user_joined", (data: { user: CollaborationUser }) => {
      set((state) => {
        const newUsers = new Map(state.users)
        newUsers.set(data.user.id, data.user)
        return { users: newUsers }
      })
    })

    collaborationSocket.on("user_left", (data: { userId: string }) => {
      set((state) => {
        const newUsers = new Map(state.users)
        newUsers.delete(data.userId)
        return { users: newUsers }
      })
    })

    collaborationSocket.on("presence_update", (data: { userId: string; presence: PresenceData }) => {
      set((state) => {
        const newUsers = new Map(state.users)
        const user = newUsers.get(data.userId)
        if (user) {
          newUsers.set(data.userId, {
            ...user,
            cursor: data.presence.cursor,
          })
        }
        return { users: newUsers }
      })
    })

    collaborationSocket.on("chat_message", (data: { message: CollaborationMessage }) => {
      set((state) => ({
        messages: [...state.messages, data.message],
      }))
    })

    collaborationSocket.on("comment_added", (data: { comment: Comment }) => {
      set((state) => ({
        comments: [...state.comments, data.comment],
      }))
    })

    collaborationSocket.on("comment_resolved", (data: { commentId: string }) => {
      set((state) => ({
        comments: state.comments.map((c) =>
          c.id === data.commentId ? { ...c, resolved: true } : c
        ),
      }))
    })

    collaborationSocket.on("permission_changed", (data: { permission: Permission }) => {
      set({ permission: data.permission })
    })
  }

  return {
    users: new Map(),
    currentUser: null,
    isConnected: false,
    roomId: null,
    permission: "view",
    messages: [],
    comments: [],

    connect: (roomId, userId, userName, userEmail) => {
      const color = generateUserColor(userId)
      const currentUser: CollaborationUser = {
        id: userId,
        name: userName,
        email: userEmail,
        color,
      }

      // Connect socket
      collaborationSocket.connect(roomId, userId, userName, userEmail)
      collaborationSocket.joinRoom(roomId)

      // Initialize Yjs
      yjsProvider.initialize(roomId, userId, userName)

      // Setup listeners
      setupSocketListeners()

      set({
        currentUser,
        isConnected: true,
        roomId,
        users: new Map([[userId, currentUser]]),
      })
    },

    disconnect: () => {
      collaborationSocket.disconnect()
      yjsProvider.destroy()

      set({
        isConnected: false,
        roomId: null,
        currentUser: null,
        users: new Map(),
        messages: [],
        comments: [],
      })
    },

    updatePresence: (presence) => {
      collaborationSocket.updatePresence(presence)
      yjsProvider.updateAwareness(presence)
    },

    sendMessage: (content) => {
      collaborationSocket.sendMessage(content)
    },

    addComment: (comment) => {
      collaborationSocket.addComment(comment)
    },

    resolveComment: (commentId) => {
      collaborationSocket.resolveComment(commentId)
    },

    setPermission: (permission) => {
      set({ permission })
    },

    updateLayer: (layerId, updates) => {
      collaborationSocket.updateLayer(layerId, updates)
    },
  }
})

