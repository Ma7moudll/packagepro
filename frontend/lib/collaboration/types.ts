"use client"

export interface CollaborationUser {
  id: string
  name: string
  email: string
  avatar?: string
  color: string
  cursor?: {
    x: number
    y: number
    faceId: string
  }
}

export interface PresenceData {
  userId: string
  cursor?: {
    x: number
    y: number
    faceId: string
  }
  selection?: string[]
  view?: "2d" | "3d"
}

export interface CollaborationMessage {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  content: string
  timestamp: number
  type: "message" | "system"
}

export interface Comment {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  content: string
  position: { x: number; y: number }
  faceId: string
  layerId?: string
  timestamp: number
  resolved: boolean
  replies?: Comment[]
}

export type Permission = "view" | "edit" | "owner"

export interface CollaborationState {
  users: Map<string, CollaborationUser>
  currentUser: CollaborationUser | null
  isConnected: boolean
  roomId: string | null
  permission: Permission
  messages: CollaborationMessage[]
  comments: Comment[]
}

export interface CollaborationEvent {
  type:
    | "user_joined"
    | "user_left"
    | "cursor_moved"
    | "selection_changed"
    | "layer_updated"
    | "message_sent"
    | "comment_added"
    | "comment_resolved"
    | "permission_changed"
  data: any
  userId: string
  timestamp: number
}

