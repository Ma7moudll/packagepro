"use client"

import { io, Socket } from "socket.io-client"
import { CollaborationUser, PresenceData, CollaborationMessage, Comment, Permission } from "./types"

class CollaborationSocketClient {
  private socket: Socket | null = null
  private roomId: string | null = null
  private userId: string | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  /**
   * Connect to collaboration server
   */
  connect(roomId: string, userId: string, userName: string, userEmail: string) {
    if (this.socket?.connected) {
      this.disconnect()
    }

    this.roomId = roomId
    this.userId = userId

    const serverUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3002"

    this.socket = io(serverUrl, {
      auth: {
        roomId,
        userId,
        userName,
        userEmail,
      },
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    })

    this.setupEventHandlers()
  }

  /**
   * Setup socket event handlers
   */
  private setupEventHandlers() {
    if (!this.socket) return

    this.socket.on("connect", () => {
      console.log("Connected to collaboration server")
      this.reconnectAttempts = 0
    })

    this.socket.on("disconnect", () => {
      console.log("Disconnected from collaboration server")
    })

    this.socket.on("connect_error", (error) => {
      console.error("Connection error:", error)
      this.reconnectAttempts++
    })
  }

  /**
   * Join a room
   */
  joinRoom(roomId: string) {
    if (!this.socket) return
    this.socket.emit("join_room", roomId)
    this.roomId = roomId
  }

  /**
   * Leave current room
   */
  leaveRoom() {
    if (!this.socket || !this.roomId) return
    this.socket.emit("leave_room", this.roomId)
    this.roomId = null
  }

  /**
   * Update presence (cursor position, selection, etc.)
   */
  updatePresence(presence: PresenceData) {
    if (!this.socket || !this.roomId) return
    this.socket.emit("presence_update", {
      roomId: this.roomId,
      presence,
    })
  }

  /**
   * Send a chat message
   */
  sendMessage(content: string) {
    if (!this.socket || !this.roomId) return
    this.socket.emit("chat_message", {
      roomId: this.roomId,
      content,
    })
  }

  /**
   * Add a comment
   */
  addComment(comment: Omit<Comment, "id" | "userId" | "userName" | "userAvatar" | "timestamp">) {
    if (!this.socket || !this.roomId) return
    this.socket.emit("comment_add", {
      roomId: this.roomId,
      comment,
    })
  }

  /**
   * Resolve a comment
   */
  resolveComment(commentId: string) {
    if (!this.socket || !this.roomId) return
    this.socket.emit("comment_resolve", {
      roomId: this.roomId,
      commentId,
    })
  }

  /**
   * Update layer (for conflict resolution)
   */
  updateLayer(layerId: string, updates: any) {
    if (!this.socket || !this.roomId) return
    this.socket.emit("layer_update", {
      roomId: this.roomId,
      layerId,
      updates,
    })
  }

  /**
   * Request permission change
   */
  requestPermission(userId: string, permission: Permission) {
    if (!this.socket || !this.roomId) return
    this.socket.emit("permission_request", {
      roomId: this.roomId,
      userId,
      permission,
    })
  }

  /**
   * Listen to events
   */
  on(event: string, callback: (data: any) => void) {
    if (!this.socket) return
    this.socket.on(event, callback)
  }

  /**
   * Remove event listener
   */
  off(event: string, callback?: (data: any) => void) {
    if (!this.socket) return
    this.socket.off(event, callback)
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false
  }

  /**
   * Disconnect
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.roomId = null
    this.userId = null
  }
}

// Singleton instance
export const collaborationSocket = new CollaborationSocketClient()

