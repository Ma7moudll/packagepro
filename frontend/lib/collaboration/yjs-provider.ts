"use client"

import * as Y from "yjs"
import { WebsocketProvider } from "y-websocket"
import { CollaborationUser, Permission } from "./types"

/**
 * Yjs provider for CRDT-based conflict resolution
 */
class YjsCollaborationProvider {
  private doc: Y.Doc | null = null
  private provider: WebsocketProvider | null = null
  private roomId: string | null = null
  private awareness: any = null

  /**
   * Initialize Yjs document and provider
   */
  initialize(roomId: string, userId: string, userName: string) {
    if (this.doc) {
      this.destroy()
    }

    this.roomId = roomId
    this.doc = new Y.Doc()

    // Connect to Yjs WebSocket server
    const wsUrl = process.env.NEXT_PUBLIC_YJS_WS_URL || "ws://localhost:1234"
    this.provider = new WebsocketProvider(wsUrl, roomId, this.doc)

    // Setup awareness (presence)
    this.awareness = this.provider.awareness
    this.awareness.setLocalStateField("user", {
      id: userId,
      name: userName,
    })

    // Setup Yjs maps for shared state
    this.setupSharedState()

    return this.doc
  }

  /**
   * Setup shared state maps
   */
  private setupSharedState() {
    if (!this.doc) return

    // Layers map
    const layersMap = this.doc.getMap("layers")

    // Canvas state map
    const canvasMap = this.doc.getMap("canvas")

    // Model state map
    const modelMap = this.doc.getMap("model")

    return {
      layers: layersMap,
      canvas: canvasMap,
      model: modelMap,
    }
  }

  /**
   * Get Yjs document
   */
  getDocument(): Y.Doc | null {
    return this.doc
  }

  /**
   * Get awareness (presence)
   */
  getAwareness() {
    return this.awareness
  }

  /**
   * Update local state in awareness
   */
  updateAwareness(state: any) {
    if (!this.awareness) return
    this.awareness.setLocalStateField("state", state)
  }

  /**
   * Observe changes
   */
  observe(callback: () => void) {
    if (!this.doc) return () => {}

    this.doc.on("update", callback)

    return () => {
      this.doc?.off("update", callback)
    }
  }

  /**
   * Observe awareness changes
   */
  observeAwareness(callback: (states: Map<number, any>) => void) {
    if (!this.awareness) return () => {}

    this.awareness.on("change", callback)

    return () => {
      this.awareness?.off("change", callback)
    }
  }

  /**
   * Destroy provider
   */
  destroy() {
    if (this.provider) {
      this.provider.destroy()
      this.provider = null
    }
    if (this.doc) {
      this.doc.destroy()
      this.doc = null
    }
    this.awareness = null
    this.roomId = null
  }
}

// Singleton instance
export const yjsProvider = new YjsCollaborationProvider()

